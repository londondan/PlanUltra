"""
DynamoDB writer for approving staged races into the PlanUltra library.

Writes Race + AidStation records to prod DynamoDB using the same schema
as the TypeScript data layer in src/lib/db/.

Key schema facts (confirmed from src/lib/db/ and src/types/):
  - Library user ID:     __LIBRARY__
  - Race PK/SK:          USER#__LIBRARY__ / RACE#{race_id}
  - Aid station PK/SK:   RACE#{race_id} / AID#{order:04d}
  - distanceFromStart:   kilometres (miles × 1.60934)
  - gpxData:             gzip + base64 encoded
  - crewParkingCoords:   DynamoDB Map {lat: N, lng: N}
"""

from __future__ import annotations
import base64
import gzip
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib  # type: ignore
    except ImportError:
        tomllib = None  # type: ignore

CONFIG_PATH = Path.home() / '.config' / 'planultra' / 'config.toml'
LIBRARY_USER_ID = '__LIBRARY__'
MILES_TO_KM = 1.60934


def _load_config() -> dict:
    if not CONFIG_PATH.exists():
        return {}
    if tomllib is None:
        # Minimal TOML parser: handles [section] headers and key = "value" / key = 123
        import re
        config: dict = {}
        section: dict = config
        with open(CONFIG_PATH) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                m = re.match(r'^\[(\w+)\]$', line)
                if m:
                    config.setdefault(m.group(1), {})
                    section = config[m.group(1)]
                    continue
                m = re.match(r'^(\w+)\s*=\s*"(.+)"$', line)
                if m:
                    section[m.group(1)] = m.group(2)
                    continue
                m = re.match(r'^(\w+)\s*=\s*(\d+)$', line)
                if m:
                    section[m.group(1)] = int(m.group(2))
        return config
    with open(CONFIG_PATH, 'rb') as f:
        return tomllib.load(f)


def _get_table_name() -> str:
    import os
    config = _load_config()
    return (
        config.get('dynamo', {}).get('table_name')
        or os.environ.get('DYNAMODB_TABLE_NAME')
        or 'PlanUltra'
    )


def _get_dynamo():
    try:
        import boto3
    except ImportError:
        raise ImportError("boto3 not installed. Run: pip install boto3")
    import os
    config = _load_config()
    profile = config.get('dynamo', {}).get('aws_profile') or os.environ.get('AWS_PROFILE')
    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    region = config.get('dynamo', {}).get('region') or 'eu-west-2'
    return session.client('dynamodb', region_name=region)


def _compress_gpx(gpx_text: str) -> str:
    """Gzip-compress and base64-encode GPX string, matching the TypeScript compressGPX function."""
    compressed = gzip.compress(gpx_text.encode('utf-8'))
    return base64.b64encode(compressed).decode('utf-8')


def _s(val: str | None) -> dict:
    return {'S': val or ''}


def _n(val: float | int | None) -> dict | None:
    if val is None:
        return None
    return {'N': str(val)}


def _b(val: bool) -> dict:
    return {'BOOL': bool(val)}


def _put_or_none(key: str, value) -> tuple[str, dict] | None:
    """Return (key, dynamo_value) or None to skip the attribute."""
    if value is None:
        return None
    return (key, value)


def _build_race_item(race_id: str, race: dict, gpx_text: str | None) -> dict:
    item = {
        'PK':               _s(f'USER#{LIBRARY_USER_ID}'),
        'SK':               _s(f'RACE#{race_id}'),
        'raceId':           _s(race_id),
        'userId':           _s(LIBRARY_USER_ID),
        'name':             _s(race.get('name', '')),
        'isLibraryRace':    _b(True),
        'createdAt':        _s(datetime.now(timezone.utc).isoformat()),
    }

    optional_strings = [
        ('date',           'date'),
        ('startTime',      'start_time'),
        ('timezone',       'timezone'),
        ('location',       'location'),
        ('libraryDescription', 'description'),
        ('raceWebsiteUrl', 'website_url'),
    ]
    for dynamo_key, race_key in optional_strings:
        val = race.get(race_key)
        if val:
            item[dynamo_key] = _s(val)

    if gpx_text:
        item['gpxData'] = _s(_compress_gpx(gpx_text))

    return item


def _build_aid_station_item(
    race_id: str,
    order: int,
    station: dict,
    is_start: bool = False,
    is_finish: bool = False,
) -> dict:
    item = {
        'PK':       _s(f'RACE#{race_id}'),
        'SK':       _s(f'AID#{order:04d}'),
        'raceId':   _s(race_id),
        'order':    {'N': str(order)},
        'name':     _s(station.get('name', '')),
        'distanceFromStart': {'N': str(round((station.get('mile') or 0) * MILES_TO_KM, 4))},
        'distanceFromPrev':  {'N': '0'},  # not calculated in extraction pipeline
        'elevationGain':     {'N': '0'},  # deprecated field; always 0
        'grossClimbM':       {'N': '0'},
        'grossDescentM':     {'N': '0'},
        'hasCrewAccess': _b(station.get('crew_access', False)),
        'hasDropBag':    _b(station.get('drop_bag', False)),
        'visitNumber':   {'N': '1'},
    }

    if is_start:
        item['isStart'] = _b(True)
    if is_finish:
        item['isFinish'] = _b(True)

    lat = station.get('lat')
    lng = station.get('lng')
    if lat is not None and lng is not None:
        item['crewParkingCoords'] = {
            'M': {
                'lat': {'N': str(lat)},
                'lng': {'N': str(lng)},
            }
        }
        # Only set source=gpx if the match came from GPX data
        if station.get('match_confidence') in ('high', 'low'):
            item['crewParkingCoordsSource'] = _s('gpx')

    parking_notes = station.get('parking_notes')
    if parking_notes:
        item['crewLocationNotes'] = _s(parking_notes[:500])

    cutoff = station.get('cutoff_elapsed_minutes')
    if cutoff is not None:
        item['cutoffElapsedMinutes'] = {'N': str(int(cutoff))}

    mile_return = station.get('mile_return')
    if mile_return is not None:
        item['distanceFromStartReturn'] = {'N': str(round(mile_return * MILES_TO_KM, 4))}

    return item


def _chunk(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def write_race(race_data: dict, gpx_path: str | None = None, dry_run: bool = False) -> str:
    """
    Write a Race + AidStation records to DynamoDB.
    Returns the new race_id.
    Raises on failure; rolls back the Race record if any AidStation write fails.
    """
    dynamo = _get_dynamo()
    table = _get_table_name()
    race_id = str(uuid.uuid4())

    race_meta = race_data.get('race', race_data)
    stations  = race_data.get('aid_stations', [])

    # Read GPX file if provided
    gpx_text = None
    if gpx_path and Path(gpx_path).exists():
        gpx_text = Path(gpx_path).read_text(encoding='utf-8')

    race_item = _build_race_item(race_id, race_meta, gpx_text)

    if dry_run:
        print(f"[DRY RUN] Would write Race record: {race_id}")
        print(f"[DRY RUN] Race item keys: {sorted(race_item.keys())}")
        for i, station in enumerate(stations):
            item = _build_aid_station_item(
                race_id, i, station,
                is_start=(i == 0),
                is_finish=(i == len(stations) - 1),
            )
            print(f"[DRY RUN] AidStation {i:04d}: {station.get('name')} ({item.get('distanceFromStart', {}).get('N')} km)")
        return race_id

    # Write Race record first
    dynamo.put_item(TableName=table, Item=race_item)
    print(f"  ✓ Race record written: {race_id}")

    # Write AidStation records in batches of 25
    station_items = [
        _build_aid_station_item(
            race_id, i, station,
            is_start=(i == 0),
            is_finish=(i == len(stations) - 1),
        )
        for i, station in enumerate(stations)
    ]

    written = 0
    try:
        for batch in _chunk(station_items, 25):
            request_items = {
                table: [{'PutRequest': {'Item': item}} for item in batch]
            }
            response = dynamo.batch_write_item(RequestItems=request_items)
            unprocessed = response.get('UnprocessedItems', {}).get(table, [])
            if unprocessed:
                # Simple retry once for unprocessed items
                dynamo.batch_write_item(RequestItems={table: unprocessed})
            written += len(batch)

        print(f"  ✓ {written} aid station records written")

    except Exception as exc:
        # Roll back Race record
        print(f"  ✗ Error writing aid stations: {exc}")
        print(f"  Rolling back Race record {race_id}...")
        try:
            dynamo.delete_item(
                TableName=table,
                Key={
                    'PK': _s(f'USER#{LIBRARY_USER_ID}'),
                    'SK': _s(f'RACE#{race_id}'),
                },
            )
            print(f"  ✓ Race record rolled back")
        except Exception as rollback_exc:
            print(f"  ✗ Rollback also failed: {rollback_exc}")
        raise

    return race_id


if __name__ == '__main__':
    # Dry-run smoke test
    sample = {
        'race': {
            'name': 'Test Race 100',
            'date': '2026-05-16',
            'start_time': '06:00',
            'timezone': 'America/New_York',
            'location': 'Test City, GA',
            'description': 'A 100-mile test race.',
        },
        'aid_stations': [
            {'name': 'Start', 'mile': 0.0, 'crew_access': False, 'drop_bag': False},
            {'name': 'Deep Gap', 'mile': 25.0, 'crew_access': True, 'drop_bag': True,
             'lat': 34.9, 'lng': -84.1, 'match_confidence': 'high',
             'parking_notes': 'Parking area at trailhead', 'cutoff_elapsed_minutes': 480},
            {'name': 'Finish', 'mile': 100.0, 'crew_access': True, 'drop_bag': False},
        ],
    }
    race_id = write_race(sample, dry_run=True)
    print(f"Dry run complete. race_id would be: {race_id}")
