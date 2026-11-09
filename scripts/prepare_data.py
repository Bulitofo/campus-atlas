"""Build compact website data without modifying the five source datasets."""
import csv
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/college_town_home_sales.csv"
FIELDS = ["listing_id", "address_street", "city", "state", "zipcode", "university",
          "miles_to_campus", "sale_date", "sale_price", "beds", "baths",
          "living_area_sqft", "year_built", "days_on_market"]


def build():
    # DictReader leaves ZIP, FIPS, and parcel identifiers as text.
    with SOURCE.open(newline="", encoding="utf-8-sig") as handle:
        source_rows = list(csv.DictReader(handle))
    ids = [row["listing_id"] for row in source_rows]
    assert len(set(ids)) == len(ids), "Listing IDs must be unique; do not deduplicate addresses."
    rows = []
    for row in source_rows:
        price = int(row["sale_price"])
        if not 10_000 <= price <= 5_000_000:
            continue
        dom = None
        if row["contract_date"] and row["list_date"]:
            days = (date.fromisoformat(row["contract_date"]) - date.fromisoformat(row["list_date"])).days
            dom = days if days >= 0 else None
        values = {**row, "days_on_market": dom}
        for key in ("sale_price", "beds", "living_area_sqft", "year_built"):
            values[key] = int(row[key]) if row[key] else None
        for key in ("miles_to_campus", "baths"):
            values[key] = float(row[key]) if row[key] else None
        values["sale_date"] = row["sale_date"] or None
        rows.append([values[key] for key in FIELDS])
    dates = [row["sale_date"] for row in source_rows if row["sale_date"]]
    metadata = {
        "source_rows": len(source_rows), "included_rows": len(rows),
        "below_minimum": sum(int(row["sale_price"]) < 10_000 for row in source_rows),
        "above_maximum": sum(int(row["sale_price"]) > 5_000_000 for row in source_rows),
        "price_min": 10_000, "price_max": 5_000_000,
        "campuses": len({row["university"] for row in source_rows}),
        "cities": len({(row["city"], row["state"]) for row in source_rows}),
        "states": len({row["state"] for row in source_rows}),
        "date_min": min(dates), "date_max": max(dates),
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    }
    target = ROOT / "data/explorer_data.json"
    target.write_text(json.dumps({"meta": metadata, "fields": FIELDS, "rows": rows}, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Built {target.name}: {len(rows):,} included sales; {len(source_rows)-len(rows):,} excluded.")


if __name__ == "__main__":
    build()
