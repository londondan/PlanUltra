"""
Backfill slug field on library races that don't have one.

Library races use PK=USER#__LIBRARY__. Slugs are derived from the race name:
  lowercase, spaces → hyphens, strip non-alphanumeric except hyphens.

Safe to re-run: uses attribute_not_exists(slug) condition so existing slugs
are never overwritten. Collisions are printed at the end for manual resolution.

Usage:
  python docs/utils/backfill_slugs.py [--dry-run]

Requires: boto3, AWS credentials with DynamoDB access.
"""

import os
import re
import sys
import argparse
import boto3
from botocore.exceptions import ClientError

TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "PlanUltra")
LIBRARY_PK = "USER#__LIBRARY__"


def name_to_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)  # strip punctuation except hyphen/underscore
    slug = re.sub(r"[\s_]+", "-", slug)   # spaces/underscores → hyphens
    slug = re.sub(r"-+", "-", slug)       # collapse multiple hyphens
    slug = slug.strip("-")
    return slug


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print changes without writing")
    args = parser.parse_args()

    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(TABLE_NAME)

    # Fetch all library races
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues={":pk": LIBRARY_PK, ":prefix": "RACE#"},
    )
    items = response.get("Items", [])
    while "LastEvaluatedKey" in response:
        response = table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={":pk": LIBRARY_PK, ":prefix": "RACE#"},
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        items.extend(response.get("Items", []))

    print(f"Found {len(items)} library races")

    slugs_seen: dict[str, str] = {}  # slug → raceId
    collisions: list[tuple[str, str, str]] = []  # (raceId, name, slug)
    skipped = 0
    written = 0

    for item in items:
        race_id = item.get("raceId", "")
        name = item.get("name", "")
        existing_slug = item.get("slug")

        if existing_slug:
            print(f"  SKIP  {name!r:50s}  already has slug: {existing_slug}")
            skipped += 1
            continue

        slug = name_to_slug(name)
        if not slug:
            print(f"  WARN  {name!r:50s}  could not generate slug — set manually")
            continue

        if slug in slugs_seen:
            collisions.append((race_id, name, slug))
            print(f"  COLL  {name!r:50s}  slug={slug!r} (collision with {slugs_seen[slug]})")
            continue

        slugs_seen[slug] = race_id
        print(f"  {'DRY ' if args.dry_run else 'WRITE'} {name!r:50s}  → {slug}")

        if not args.dry_run:
            try:
                table.update_item(
                    Key={"PK": LIBRARY_PK, "SK": f"RACE#{race_id}"},
                    UpdateExpression="SET #slug = :slug",
                    ConditionExpression="attribute_not_exists(#slug)",
                    ExpressionAttributeNames={"#slug": "slug"},
                    ExpressionAttributeValues={":slug": slug},
                )
                written += 1
            except ClientError as e:
                if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                    print(f"         race {race_id} already got a slug (race condition) — skipping")
                else:
                    raise

    print(f"\nDone. written={written}, skipped={skipped}, collisions={len(collisions)}")
    if collisions:
        print("\nCollisions — set slugs manually:")
        for race_id, name, slug in collisions:
            print(f"  raceId={race_id}  name={name!r}  desired_slug={slug!r}")
        sys.exit(1)


if __name__ == "__main__":
    main()
