# Data preparation and verification

- `prepare_data.py` creates `data/explorer_data.json` from the original CSV, without altering any source dataset.
- `verify_data.py` checks original-file hashes and compares the website's actual JavaScript summaries against the original SQLite dataset over 60 selections.
- `verify_core.mjs` checks missing/zero values, distance-band boundaries, CSV quoting, and search behavior.

Python uses only the standard library. JavaScript verification uses Node.js. The public website itself needs no installation or build step.
