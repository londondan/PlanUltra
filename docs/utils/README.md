# PlanUltra Race Extractor

A two-stage pipeline for extracting structured race data from a GPX file +
race packet (text or PDF), ready to import into the PlanUltra race library.

## Setup

```bash
pip install anthropic       # required for LLM extraction
pip install pdfplumber      # required only if using --pdf
pip install rapidfuzz       # optional but improves name matching accuracy

export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Full pipeline — GPX + PDF race packet

```bash
python3 extract_race.py \
  --gpx cruel_jewel.gpx \
  --pdf cruel_jewel_2025_packet.pdf \
  --output output/cruel_jewel_100.json
```

### GPX + pasted text (copy the aid station table from the race website)

```bash
python3 extract_race.py \
  --gpx cruel_jewel.gpx \
  --text cruel_jewel_text.txt \
  --output output/cruel_jewel_100.json
```

### GPX only (no cut-off / crew data — good for a first pass)

```bash
python3 extract_race.py \
  --gpx cruel_jewel.gpx \
  --name "Cruel Jewel 100" \
  --date 2025-05-16 \
  --start-time "12:00" \
  --timezone "America/New_York" \
  --location "Blairsville, GA" \
  --output output/cruel_jewel_100.json
```

### Text/PDF only (no GPX — aid stations get metadata but no GPS coords)

```bash
python3 extract_race.py \
  --pdf cruel_jewel_2025_packet.pdf \
  --output output/cruel_jewel_100.json
```

## Output format

```json
{
  "race": {
    "name": "Cruel Jewel 100",
    "date": "2025-05-16",
    "start_time": "12:00",
    "timezone": "America/New_York",
    "location": "Blairsville, GA",
    "distance_miles": 104.3,
    "description": "104-mile loop through the Chattahoochee National Forest.",
    "gpx_total_miles": 104.3
  },
  "aid_stations": [
    {
      "name": "Camp Morganton Start/Finish",
      "mile": 0.0,
      "mile_return": null,
      "lat": 34.8734,
      "lng": -84.0123,
      "cutoff_elapsed_minutes": null,
      "crew_access": true,
      "drop_bag": true,
      "parking_notes": "Main lot at the campground.",
      "crew_parking_coords": null,
      "crew_parking_type": null,
      "crew_location_notes": "Main lot at the campground.",
      "_match_confidence": "high",
      "_match_score": 0.91,
      "_gpx_name": "Camp Morganton"
    }
  ],
  "_meta": {
    "total_gpx_waypoints": 20,
    "total_extracted_stations": 20,
    "total_output_stations": 20,
    "unmatched_gpx_waypoints": 0
  }
}
```

## Output fields

### Race

| Field | Description |
|---|---|
| `name` | Race name |
| `date` | ISO 8601 date |
| `start_time` | 24h HH:MM |
| `timezone` | IANA timezone |
| `location` | City/state or region |
| `distance_miles` | Total race distance |
| `description` | Short description (≤160 chars) for the race library picker |

### Aid stations

| Field | Description |
|---|---|
| `name` | Station name |
| `mile` | Distance from start |
| `mile_return` | Distance on return leg (out-and-back only), else null |
| `lat` / `lng` | GPS coordinates from GPX (null if no GPX match) |
| `cutoff_elapsed_minutes` | Minutes from race start to cutoff (null if unknown) |
| `crew_access` | Whether crew can access this station |
| `drop_bag` | Whether drop bags are allowed |
| `parking_notes` | Raw parking/directions text from the race packet |
| `crew_parking_coords` | Set manually or via Mapbox after import (null here) |
| `crew_parking_type` | Set manually after import (null here) |
| `crew_location_notes` | Pre-populated from parking_notes; edit after import |
| `_match_confidence` | `high` / `low` / `none` / `gpx_only` — review anything not `high` |
| `_match_score` | 0-1 fuzzy match score |
| `_gpx_name` | The waypoint name from the GPX that was matched |

## Review workflow

1. Run the script — it prints a summary table and flags anything that needs review.
2. Look at anything marked `low`, `none`, or `gpx_only` confidence.
3. Edit the JSON directly to fix names, miles, crew flags, or cut-offs as needed.
4. Remove the `_match_confidence`, `_match_score`, `_gpx_name` keys before importing
   (or leave them — the importer ignores underscore-prefixed keys).
5. Import into PlanUltra via the admin race library UI.

## Preparing the source text

The LLM extraction works best when given the aid station table directly.
The cleanest approach for most races:

1. Open the race website or runner's guide PDF.
2. Find the aid station table.
3. Select all and copy — paste into a `.txt` file.
4. Run with `--text your_file.txt`.

Alternatively, if you have the PDF, pass it directly with `--pdf`.
The script extracts all text from the PDF automatically.

The LLM prompt asks specifically for:
- Station names and mile markers
- Cut-off times (converts clock times to elapsed minutes automatically)
- Crew access and drop bag flags
- Any parking or location notes

## Troubleshooting

**"LLM returned invalid JSON"** — The model occasionally adds extra commentary.
Re-run; it usually works on the second attempt. If it keeps failing, try
simplifying the source text (remove images/headers, keep just the aid station table).

**Low match confidence** — The GPX waypoint name and the race packet name
don't share enough tokens. Edit the output JSON to correct the mile marker
or GPS coordinates manually.

**No waypoints in GPX** — Some GPX files store the route as a track only,
with no named `<wpt>` elements. In this case, extract station names and miles
from the race packet only (`--text` or `--pdf`) and GPS coords will be null.
You can add them manually from Google Maps later via the admin UI.
