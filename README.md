# IEEE IS2 2026 Dynamic Program — V6

This version reads the program **directly from the published Google Sheets CSV**.

## Important

`draft-data.js` is no longer loaded. The previous versions preferred embedded local
data whenever `window.IS2_DRAFT_CSV` existed, which meant that editing Google Sheets
had no effect even when `config.js` contained the correct URL.

The configured source is:

https://docs.google.com/spreadsheets/d/e/2PACX-1vQjOyXF9Md1ift7T_AUlQtlnC0UFms5_3cbJT3N8oXku9SxMOq3eeH7vQcLvNhCag/pub?gid=815576609&single=true&output=csv

The frontend also appends a timestamp to each request to reduce browser caching.

Run locally with e.g.:

    python3 -m http.server 8000

then open:

    http://localhost:8000/index.html

If Google Sheets itself caches a published update, it may still take a short time
before the publication endpoint changes.
# is2_2026_program
