#!/usr/bin/env python3
"""
PlanUltra Race Extractor
========================
Extracts structured race data from a GPX file + race packet text (or PDF),
and outputs a JSON file ready to import into the PlanUltra race library.

Usage
-----
    # With a GPX file only (no aid station metadata):
    python3 extract_race.py --gpx route.gpx --output cruel_jewel.json

    # With GPX + pasted race packet text:
    python3 extract_race.py --gpx route.gpx --text packet.txt --output cruel_jewel.json

    # With GPX + PDF race packet:
    python3 extract_race.py --gpx route.gpx --pdf packet.pdf --output cruel_jewel.json

    # Provide race metadata directly (skips LLM extraction):
    python3 extract_race.py --gpx route.gpx --name "Cruel Jewel 100" \
        --date 2025-05-16 --start-time "12:00" --timezone "America/New_York" \
        --location "Blairsville, GA" --output cruel_jewel.json

Requirements
------------
    pip install anthropic          # for LLM extraction (--text / --pdf modes)
    pip install pdfplumber         # for PDF text extraction (--pdf mode)

    The ANTHROPIC_API_KEY environment variable must be set when using LLM extraction.
"""

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


# ---------------------------------------------------------------------------
# Stage 1 — GPX Parsing
# ---------------------------------------------------------------------------

GPX_NS = {
    'gpx':  'http://www.topografix.com/GPX/1/1',
    'gpx10': 'http://www.topografix.com/GPX/1/0',
}


def _haversine(lat1, lon1, lat2, lon2):
    """Return distance in miles between two lat/lng points."""
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _detect_ns(root):
    """Detect which GPX namespace version the file uses."""
    tag = root.tag
    if 'GPX/1/1' in tag:
        return GPX_NS['gpx']
    return GPX_NS['gpx10']


def parse_gpx(gpx_path: str) -> dict:
    """
    Parse a GPX file and return:
      - track_points: list of {lat, lng, ele} along the route
      - waypoints: list of {name, lat, lng, mile} for named points
      - total_miles: total route distance
    """
    tree = ET.parse(gpx_path)
    root = tree.getroot()
    ns = _detect_ns(root)

    # --- Build track from all trkpt elements ---
    track_points = []
    for trkpt in root.iter(f'{{{ns}}}trkpt'):
        lat = float(trkpt.attrib['lat'])
        lon = float(trkpt.attrib['lon'])
        ele_el = trkpt.find(f'{{{ns}}}ele')
        ele = float(ele_el.text) if ele_el is not None else None
        track_points.append({'lat': lat, 'lng': lon, 'ele': ele})

    if not track_points:
        print("  ⚠  No track points found in GPX. Only waypoints will be used.")

    # Compute cumulative distances along the track
    cumulative = [0.0]
    for i in range(1, len(track_points)):
        p0, p1 = track_points[i - 1], track_points[i]
        cumulative.append(cumulative[-1] + _haversine(p0['lat'], p0['lng'], p1['lat'], p1['lng']))

    total_miles = round(cumulative[-1], 2) if cumulative else 0.0

    # --- Extract named waypoints and snap to nearest track point ---
    waypoints = []
    for wpt in root.iter(f'{{{ns}}}wpt'):
        lat = float(wpt.attrib['lat'])
        lon = float(wpt.attrib['lon'])
        name_el = wpt.find(f'{{{ns}}}name')
        name = name_el.text.strip() if name_el is not None else 'Unnamed'
        desc_el = wpt.find(f'{{{ns}}}desc')
        desc = desc_el.text.strip() if desc_el is not None else None

        # Snap to nearest track point to get accurate mile marker
        mile = _snap_to_track(lat, lon, track_points, cumulative)

        waypoints.append({
            'name': name,
            'lat': lat,
            'lng': lon,
            'mile': round(mile, 2),
            'description': desc,
        })

    # Sort waypoints by mile
    waypoints.sort(key=lambda w: w['mile'])

    return {
        'track_points': track_points,
        'cumulative_miles': cumulative,
        'waypoints': waypoints,
        'total_miles': total_miles,
    }


def _snap_to_track(lat, lon, track_points, cumulative):
    """Return the cumulative mile at the track point nearest to (lat, lon)."""
    if not track_points:
        return 0.0
    best_idx = min(
        range(len(track_points)),
        key=lambda i: _haversine(lat, lon, track_points[i]['lat'], track_points[i]['lng'])
    )
    return cumulative[best_idx]


# ---------------------------------------------------------------------------
# Stage 2 — Text / PDF ingestion
# ---------------------------------------------------------------------------

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from a PDF using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        print("ERROR: pdfplumber is required for PDF extraction.")
        print("       Run: pip install pdfplumber")
        sys.exit(1)

    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                text_parts.append(f"--- Page {i+1} ---\n{text}")
    return '\n\n'.join(text_parts)


def load_source_text(args) -> str | None:
    """Load race packet text from --text or --pdf argument."""
    if args.text:
        return Path(args.text).read_text(encoding='utf-8')
    if args.pdf:
        print(f"  Extracting text from PDF: {args.pdf}")
        return extract_text_from_pdf(args.pdf)
    return None


# ---------------------------------------------------------------------------
# Stage 2 — LLM extraction via Anthropic
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT = """You are extracting structured race data from an ultramarathon race packet or website text.

Extract the following and return ONLY valid JSON — no commentary, no markdown fences.

Top-level race fields:
- name: string (race name)
- date: string (ISO 8601, e.g. "2025-05-16")
- start_time: string (24h format, e.g. "12:00")
- timezone: string (IANA timezone, e.g. "America/New_York")
- location: string (city/state or region)
- distance_miles: number
- description: string (1-2 sentence summary, max 160 chars)

Aid stations — an array named "aid_stations", each with:
- name: string
- mile: number (distance from start)
- mile_return: number or null (for out-and-back courses where the station appears twice — the return mileage)
- cutoff_elapsed_minutes: number or null (minutes from race start, not clock time)
- crew_access: boolean
- drop_bag: boolean
- parking_notes: string or null (any parking or directions info mentioned)

Rules:
- If a cutoff is given as a clock time, convert it to elapsed minutes from the race start time.
- If crew_access or drop_bag is not mentioned for a station, default to false.
- If a field is genuinely unknown, use null.
- Do not invent data. If you are uncertain, use null.
- For out-and-back courses, if a station appears on both the outbound and return legs, set mile for the outbound appearance and mile_return for the return. If it only appears once, set mile_return to null.

Race packet text:
---
{source_text}
---

Return only the JSON object."""


def llm_extract(source_text: str, race_name_hint: str = None) -> dict:
    """Call Anthropic API to extract structured race data from text."""
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic package is required for LLM extraction.")
        print("       Run: pip install anthropic")
        print("       Then set ANTHROPIC_API_KEY in your environment.")
        sys.exit(1)

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable is not set.")
        sys.exit(1)

    # Truncate very long texts to avoid token limits (keep first ~12k chars which
    # typically covers the aid station table in most race packets)
    if len(source_text) > 15000:
        print(f"  ⚠  Source text is long ({len(source_text)} chars) — truncating to 15,000 for extraction.")
        source_text = source_text[:15000]

    prompt = EXTRACTION_PROMPT.format(source_text=source_text)
    if race_name_hint:
        prompt = f"Race name hint: {race_name_hint}\n\n" + prompt

    print("  Calling Anthropic API for structured extraction...")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if the model added them despite instructions
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"ERROR: LLM returned invalid JSON: {e}")
        print("Raw response:")
        print(raw[:2000])
        sys.exit(1)


# ---------------------------------------------------------------------------
# Stage 3 — Merge GPX + extracted metadata
# ---------------------------------------------------------------------------

def _normalise(name: str) -> str:
    """Lowercase, strip punctuation and extra whitespace for fuzzy matching."""
    name = name.lower()
    name = re.sub(r'[^a-z0-9\s]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def _fuzzy_score(a: str, b: str) -> float:
    """
    Simple fuzzy match score 0-1 between two normalised strings.
    Uses token overlap (Jaccard) as a fallback when rapidfuzz is unavailable.
    """
    try:
        from rapidfuzz import fuzz
        return fuzz.token_sort_ratio(a, b) / 100.0
    except ImportError:
        # Fallback: Jaccard similarity on word tokens
        set_a = set(a.split())
        set_b = set(b.split())
        if not set_a or not set_b:
            return 0.0
        return len(set_a & set_b) / len(set_a | set_b)


def merge(gpx_data: dict, extracted: dict, args) -> dict:
    """
    Merge GPX waypoints with LLM-extracted aid station metadata.

    Matching strategy:
    1. Try fuzzy name match between GPX waypoints and extracted aid stations.
    2. If no GPX waypoints exist, use extracted mile markers directly.
    3. Command-line --name / --date / etc. override extracted top-level fields.
    """
    waypoints = gpx_data.get('waypoints', [])
    extracted_stations = extracted.get('aid_stations', [])

    # --- Override top-level fields from CLI args if provided ---
    race_meta = {
        'name':           args.name or extracted.get('name', 'Unknown Race'),
        'date':           args.date or extracted.get('date'),
        'start_time':     args.start_time or extracted.get('start_time'),
        'timezone':       args.timezone or extracted.get('timezone'),
        'location':       args.location or extracted.get('location'),
        'distance_miles': gpx_data['total_miles'] or extracted.get('distance_miles'),
        'description':    extracted.get('description'),
        'gpx_total_miles': gpx_data['total_miles'],
    }

    # --- Match extracted stations to GPX waypoints ---
    matched_stations = []
    used_waypoint_indices = set()

    for station in extracted_stations:
        station_name_norm = _normalise(station['name'])
        best_idx = None
        best_score = 0.0

        for i, wp in enumerate(waypoints):
            if i in used_waypoint_indices:
                continue
            score = _fuzzy_score(station_name_norm, _normalise(wp['name']))
            # Boost score if mile markers are close (within 1 mile)
            mile_diff = abs((station.get('mile') or 0) - wp['mile'])
            if mile_diff < 1.0:
                score = min(1.0, score + 0.15)
            if score > best_score:
                best_score = score
                best_idx = i

        # Accept match if score >= 0.4 (generous — most aid station names have
        # at least a couple of distinctive tokens in common)
        if best_idx is not None and best_score >= 0.4:
            wp = waypoints[best_idx]
            used_waypoint_indices.add(best_idx)
            match_confidence = 'high' if best_score >= 0.75 else 'low'
        else:
            # No GPX match — use extracted mile marker, no GPS coords
            wp = None
            match_confidence = 'none'

        matched_stations.append({
            'name':                    station['name'],
            'mile':                    wp['mile'] if wp else station.get('mile'),
            'mile_return':             station.get('mile_return'),
            'lat':                     wp['lat'] if wp else None,
            'lng':                     wp['lng'] if wp else None,
            'cutoff_elapsed_minutes':  station.get('cutoff_elapsed_minutes'),
            'crew_access':             station.get('crew_access', False),
            'drop_bag':                station.get('drop_bag', False),
            'parking_notes':           station.get('parking_notes'),
            # PRD-022 fields — pre-populated from parking_notes if available
            'crew_parking_coords':     None,  # to be set manually or via Mapbox
            'crew_parking_type':       None,
            'crew_location_notes':     station.get('parking_notes'),
            '_match_confidence':       match_confidence,
            '_match_score':            round(best_score, 2) if best_idx is not None else None,
            '_gpx_name':               wp['name'] if wp else None,
        })

    # Add any unmatched GPX waypoints (present in GPX but not in extracted data)
    for i, wp in enumerate(waypoints):
        if i not in used_waypoint_indices:
            matched_stations.append({
                'name':                   wp['name'],
                'mile':                   wp['mile'],
                'mile_return':            None,
                'lat':                    wp['lat'],
                'lng':                    wp['lng'],
                'cutoff_elapsed_minutes': None,
                'crew_access':            False,
                'drop_bag':               False,
                'parking_notes':          wp.get('description'),
                'crew_parking_coords':    None,
                'crew_parking_type':      None,
                'crew_location_notes':    wp.get('description'),
                '_match_confidence':      'gpx_only',
                '_match_score':           None,
                '_gpx_name':              wp['name'],
            })

    matched_stations.sort(key=lambda s: s['mile'] or 0)

    return {
        'race': race_meta,
        'aid_stations': matched_stations,
        '_meta': {
            'total_gpx_waypoints': len(waypoints),
            'total_extracted_stations': len(extracted_stations),
            'total_output_stations': len(matched_stations),
            'unmatched_gpx_waypoints': len(waypoints) - len(used_waypoint_indices),
        }
    }


# ---------------------------------------------------------------------------
# Review report — print a human-readable summary
# ---------------------------------------------------------------------------

def print_review(output: dict):
    race = output['race']
    meta = output['_meta']

    print()
    print("=" * 60)
    print(f"  {race['name']}")
    print(f"  {race['date']}  {race['start_time']}  {race['timezone']}")
    print(f"  {race['location']}  ·  {race['distance_miles']} mi")
    print("=" * 60)
    print(f"  GPX waypoints:        {meta['total_gpx_waypoints']}")
    print(f"  Extracted stations:   {meta['total_extracted_stations']}")
    print(f"  Output stations:      {meta['total_output_stations']}")
    print(f"  Unmatched GPX pts:    {meta['unmatched_gpx_waypoints']}")
    print()

    # Flag anything that needs review
    flags = []
    for s in output['aid_stations']:
        issues = []
        if s['_match_confidence'] == 'low':
            issues.append(f"low-confidence name match (score {s['_match_score']}, GPX: '{s['_gpx_name']}')")
        if s['_match_confidence'] == 'none':
            issues.append("no GPX match — using extracted mile marker, no GPS coords")
        if s['_match_confidence'] == 'gpx_only':
            issues.append("in GPX but not in extracted data — crew/drop bag unknown")
        if s['lat'] is None:
            issues.append("no GPS coordinates")
        if s['cutoff_elapsed_minutes'] is None:
            issues.append("no cut-off time")
        if issues:
            flags.append((s['name'], s['mile'], issues))

    if flags:
        print("  ⚠  Items requiring review:")
        for name, mile, issues in flags:
            print(f"     MI {mile:>6.1f}  {name}")
            for issue in issues:
                print(f"              → {issue}")
    else:
        print("  ✓  All stations matched cleanly.")
    print()

    print("  Aid stations:")
    print(f"  {'Mile':>6}  {'Crew':>4}  {'Drop':>4}  {'Cutoff':>8}  Name")
    print(f"  {'----':>6}  {'----':>4}  {'----':>4}  {'------':>8}  ----")
    for s in output['aid_stations']:
        mile_str  = f"{s['mile']:.1f}" if s['mile'] is not None else "?"
        crew_str  = "✓" if s['crew_access'] else "—"
        drop_str  = "✓" if s['drop_bag'] else "—"
        if s['cutoff_elapsed_minutes'] is not None:
            h, m = divmod(int(s['cutoff_elapsed_minutes']), 60)
            cutoff_str = f"{h}h{m:02d}m"
        else:
            cutoff_str = "—"
        print(f"  {mile_str:>6}  {crew_str:>4}  {drop_str:>4}  {cutoff_str:>8}  {s['name']}")
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser():
    p = argparse.ArgumentParser(
        description='Extract structured race data from GPX + race packet text/PDF.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument('--gpx',         help='Path to GPX file')
    p.add_argument('--text',        help='Path to plain-text race packet file')
    p.add_argument('--pdf',         help='Path to PDF race packet file')
    p.add_argument('--output', '-o', required=True, help='Output JSON file path')

    # Manual override flags
    p.add_argument('--name',        help='Race name (overrides LLM extraction)')
    p.add_argument('--date',        help='Race date as YYYY-MM-DD (overrides LLM extraction)')
    p.add_argument('--start-time',  dest='start_time', help='Start time as HH:MM 24h (overrides LLM extraction)')
    p.add_argument('--timezone',    help='IANA timezone e.g. America/New_York (overrides LLM extraction)')
    p.add_argument('--location',    help='Race location/region (overrides LLM extraction)')

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.gpx and not args.text and not args.pdf and not args.name:
        parser.error("Provide at least --gpx and/or --text / --pdf.")

    # Stage 1 — GPX
    if args.gpx:
        print(f"Parsing GPX: {args.gpx}")
        gpx_data = parse_gpx(args.gpx)
        print(f"  {len(gpx_data['waypoints'])} waypoints · {gpx_data['total_miles']} miles total")
    else:
        gpx_data = {'waypoints': [], 'track_points': [], 'cumulative_miles': [], 'total_miles': None}

    # Stage 2 — Text/PDF extraction via LLM
    source_text = load_source_text(args)
    if source_text:
        print(f"Extracting structured data from source text ({len(source_text)} chars)...")
        extracted = llm_extract(source_text, race_name_hint=args.name)
    else:
        # No source text — build a skeleton from CLI args and GPX waypoints only
        extracted = {
            'name':           args.name,
            'date':           args.date,
            'start_time':     args.start_time,
            'timezone':       args.timezone,
            'location':       args.location,
            'distance_miles': gpx_data['total_miles'],
            'description':    None,
            'aid_stations':   [],
        }
        print("  No source text provided — using GPX waypoints only (no cut-offs / crew flags).")

    # Stage 3 — Merge
    print("Merging GPX + extracted data...")
    output = merge(gpx_data, extracted, args)

    # Print review report
    print_review(output)

    # Write output
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  ✓  Written to: {out_path}")


if __name__ == '__main__':
    main()
