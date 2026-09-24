"""
Pydantic v2 models shared across the race ingestion pipeline.
"""

from __future__ import annotations
from pydantic import BaseModel, field_validator


class AidStation(BaseModel):
    name: str
    mile: float
    mile_return: float | None = None
    cutoff_elapsed_minutes: int | None = None
    crew_access: bool = False
    drop_bag: bool = False
    parking_notes: str | None = None
    lat: float | None = None
    lng: float | None = None
    # Pipeline metadata — read-only, stripped before DynamoDB write
    match_confidence: str = 'none'
    match_score: float | None = None
    gpx_name: str | None = None

    @field_validator('description', mode='before', check_fields=False)
    @classmethod
    def _ignore_extra(cls, v):
        return v

    model_config = {'populate_by_name': True}


class RaceExtraction(BaseModel):
    name: str
    date: str | None = None           # ISO 8601 YYYY-MM-DD
    start_time: str | None = None     # HH:MM 24h
    timezone: str | None = None       # IANA
    location: str | None = None
    distance_miles: float | None = None
    description: str | None = None    # ≤160 chars
    aid_stations: list[AidStation] = []


class StagedRace(BaseModel):
    """Represents one row in the staged_races SQLite table."""
    slug: str
    race_name: str
    website_url: str | None = None
    status: str = 'staged'            # staged | approved | rejected
    completeness_score: int | None = None
    staged_at: str | None = None
    approved_at: str | None = None
    rejected_at: str | None = None
    rejection_reason: str | None = None
    gpx_source: str | None = None     # official | community | unknown
    gpx_hash: str | None = None
    pdf_hash: str | None = None
    race_json: str = '{}'             # JSON string: full extracted + merged race
    issues_json: str | None = None    # JSON string: list of issue dicts
    reviewed_json: str | None = None  # JSON string: reviewer edits (takes precedence on approve)
    pipeline_version: str | None = None


PIPELINE_VERSION = '1.0.0'
