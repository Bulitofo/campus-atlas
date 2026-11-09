"""Independently compare browser calculations with the original SQLite dataset."""
import hashlib
import json
import math
import sqlite3
import statistics
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_HASHES = {
    'csv': 'f267320139a84dc9e6dca656745250c0dcd40c13e813486e5945f556abe837e7',
    'duckdb': '7c149648890d7e57bc3537e03ad1d44afd5b3774ac258b98b32017385a400986',
    'parquet': 'cd2b0f9041ed9eff7db7294b65b3fc6052525d3645f0f06f05bd18e64d3feaac',
    'sqlite': '2e10e92bc429c66a5a2d8ece07dacfecc947de858a5fddbe885b1af0c7740d96',
    'xlsx': 'fa5202ed4d3daeceee24018d12e77800fbb5fb2f2e1a973953027a45f388b637',
}
for extension, expected in EXPECTED_HASHES.items():
    file = ROOT / f'data/college_town_home_sales.{extension}'
    assert hashlib.sha256(file.read_bytes()).hexdigest() == expected, f'Source changed: {extension}'

connection = sqlite3.connect(f'file:{ROOT}/data/college_town_home_sales.sqlite?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
source = [dict(row) for row in connection.execute('''
    SELECT *, julianday(contract_date)-julianday(list_date) AS dom
    FROM home_sales WHERE sale_price BETWEEN 10000 AND 5000000
''')]
payload = json.loads((ROOT / 'data/explorer_data.json').read_text())
derived = [dict(zip(payload['fields'], row)) for row in payload['rows']]
assert len(source) == len(derived) == 35371
assert {row['listing_id'] for row in source} == {row['listing_id'] for row in derived}
assert all(isinstance(row['zipcode'], str) for row in derived)
assert sum(not row['sale_date'] for row in derived) == 6
assert payload['meta']['source_rows'] == connection.execute('SELECT COUNT(*) FROM home_sales').fetchone()[0]
assert payload['meta']['below_minimum'] == 40 and payload['meta']['above_maximum'] == 31

cases = [{}]
cases += [{'city': f"{row['city']}, {row['state']}"} for row in connection.execute('SELECT DISTINCT city, state FROM home_sales')]
cases += [{'university': row[0]} for row in connection.execute('SELECT DISTINCT university FROM home_sales')]
cases += [{'year': year} for year in ['2023','2024','2025','2026','Unknown']]
cases += [{'distance': distance} for distance in ['1','3','5','10']]
cases += [{'university': 'University of Illinois Urbana-Champaign', 'year': year, 'distance': distance} for year in ['2023','2024','2025','2026','Unknown'] for distance in ['1','3','5','10']]
cases += [{'city':'Davis, CA', 'year':'Unknown', 'distance':'1'}]
js = """
import fs from 'node:fs';
import {filterSales,summarize,groupDistance} from './core.mjs';
const p=JSON.parse(fs.readFileSync('data/explorer_data.json'));
const rows=p.rows.map(v=>Object.fromEntries(p.fields.map((k,i)=>[k,v[i]])));
const cases=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify({summaries:cases.map(f=>summarize(filterSales(rows,f))), bands:groupDistance(rows)}));
"""
actual = json.loads(subprocess.check_output(['node','--input-type=module','-e',js], cwd=ROOT, input=json.dumps(cases), text=True))
def mid(values):
    return statistics.median(values) if values else None
for filters, result in zip(cases, actual['summaries']):
    rows = [row for row in source if
            (not filters.get('city') or f"{row['city']}, {row['state']}" == filters['city']) and
            (not filters.get('university') or row['university'] == filters['university']) and
            (not filters.get('year') or (str(row['sale_date'])[:4] if row['sale_date'] else 'Unknown') == filters['year']) and
            (not filters.get('distance') or row['miles_to_campus'] <= float(filters['distance']))]
    prices = [row['sale_price'] for row in rows]
    area = [row['sale_price']/row['living_area_sqft'] for row in rows if row['living_area_sqft'] and row['living_area_sqft'] > 0]
    days = [row['dom'] for row in rows if row['dom'] is not None and row['dom'] >= 0]
    expected = dict(count=len(rows), price=mid(prices), ppsf=mid(area), ppsfCount=len(area), dom=mid(days), domCount=len(days))
    for key, value in expected.items():
        assert result[key] == value or (value is not None and result[key] is not None and math.isclose(result[key], value, rel_tol=1e-12)), (filters, key, result[key], value)
assert sum(band['count'] for band in actual['bands']) == len(source)
assert [band['count'] for band in actual['bands']] == [1882,13201,10862,9210,216]
print(f'PASS: {len(cases)} selections × 6 metrics independently match SQLite; 5 original file hashes match.')
print(json.dumps({'overall':actual['summaries'][0], 'illinois_2025_within_3mi':actual['summaries'][-12]}, indent=2))
