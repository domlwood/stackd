# Rightmove ingestion

When you paste a Rightmove link and pick a finance product, the app reads the listing and creates a deal that is already analysed. This doc covers what was built, what it doesn't read yet, and how to fix the parser.

## What was built

| Piece | File | What it does |
|---|---|---|
| Provider interface | `apps/web/src/lib/ingest/types.ts` | `ListingProvider` / `ListingResult`. Every field carries `{ value, confidence, source }`. |
| Safe fetch | `apps/web/src/lib/ingest/http.ts` | Fetches https only, from allowed hosts only (also checked after redirects). 10s timeout, 2 retries with backoff, 5 MB cap, plain-language errors. |
| Rightmove parser | `apps/web/src/lib/ingest/rightmove.ts` | Normalises the URL, then parses the page in layers: embedded page model (`window.__PAGE_MODEL`, `window.PAGE_MODEL` / JSON script tags) → Open Graph tags → description text. |
| Encoded model decoder | `apps/web/src/lib/ingest/rightmove-model.ts` | Decodes the reference-table wrapper (`encoding: "on"`, JSON-string `data`) observed in a real saved listing. Rejects malformed references and excessive nesting, without executing scripts. |
| JSON helpers | `apps/web/src/lib/ingest/json-extract.ts` | Pulls the JSON object out of the page, searches it for the property data, and reads meta tags. |
| Postcode lookup | `apps/web/src/lib/ingest/postcodes.ts` | Uses postcodes.io to find the nearest full postcode from the map pin when the listing only gives the outcode (the first half of the postcode). |
| Capture action | `apps/web/src/features/capture/actions.ts` | Link + product → fetch (or reuse a snapshot from the last 24h) → save snapshot → create deal → set the purchase product and LTV. Falls back to manual entry and keeps the link. |
| Snapshots | `listing_snapshot` table + private `listing-snapshots` bucket | Stores the raw HTML (gzipped) and the parsed fields for every fetch, including failed ones. |
| UI | `apps/web/src/features/capture/components/new-deal-flow.tsx`, `⌘K` palette | Option A: paste a link. Option B: enter details manually. |
| Kill switch | `INGEST_RIGHTMOVE_ENABLED=false` | Turns fetching off. New deals then use manual entry only. |

**Confidence levels:**
- **High:** read from the embedded page model.
- **Medium:** taken from the page title or meta tags, or the price has a qualifier ("Offers over…").
- **Low:** guessed from the description text (tenure, floor area).

**Legal note:** Rightmove's terms restrict automated access. The app only fetches one page each time you paste a link, caches the result, and never crawls.

## Known gap: not every field is picked up

The parser was originally written against synthetic fixtures. A user-supplied real page (`demo.html`, property 95063484) revealed that the listing model uses `window.__PAGE_MODEL` with an encoded reference table. The parser now supports that format. A listing-only extract is saved in `rightmove-real-encoded-model.html`, with assertions for postcode, price, beds, baths, tenure, agent, nine photos, features, description, coordinates and added date. Unrelated page/account metadata is omitted.

That example has no floor area (`sizings` is empty and the page says "Ask agent"), so the parser deliberately leaves it blank. Other listings may still have missing fields:

- **Postcode:** usually only the outcode is listed. The full postcode comes from the map pin (marked medium confidence) and can be the neighbouring postcode.
- **Floor area:** only read if the listing has sizings or mentions sq ft / m² in the text.
- **Tenure:** often missing from the model, then guessed from the text (low confidence).
- **Price history:** not read at all; Rightmove loads it separately.
- **Property type, listed date, agent, photos:** depend on key names (`propertySubType`, `listingHistory.listingUpdateReason`, `customer.branchDisplayName`, `images[].url`). These may differ on the live page.
- If the live page structure differs from what the parser expects, it drops to the Open Graph fallback, which gets fewer fields (address, price, beds, type, one photo).

Missing fields don't stop a deal being created. They show up blank on the Listing tab, where you can fill them in.

**Retesting:** pasting an existing listing opens the saved deal without reparsing it. Recent parsed snapshots are also cached for 24 hours. Parser changes apply to new extractions; refreshing/reparsing an existing deal is not implemented. Also, `status = 'ok'` means the four essential fields were found, not that every optional field was extracted.

## How to fix the parser

1. **Get a real page.**
   - Option 1: open a listing in a browser and use *Save Page As… → Web Page, HTML only*.
   - Option 2: download a snapshot the app has already stored, from Supabase → Storage → `listing-snapshots/<workspace>/<id>.html.gz`, and gunzip it.
2. **Add it as a fixture:** save it as `apps/web/src/lib/ingest/__fixtures__/rightmove-real-1.html`. The test *"parseRightmoveHtml (real saved page)"* in `rightmove.test.ts` runs automatically once the file exists.
3. **See what the parser gets:**
   ```bash
   cd apps/web && npx vitest run src/lib/ingest
   ```
   To list every field it extracted, temporarily add `console.log(r.fields)` in that test.
4. **Find the real key names:**
   - Open the fixture and search for `PAGE_MODEL` or `<script type="application/json"`.
   - Copy the JSON into a formatter and locate the property object: the one with `prices`, `address` and `bedrooms`.
5. **Update the mapping** in `fromPropertyModel()` in `rightmove.ts`. Each field is read in one or two lines, so change the key path there. For example, if tenure lives at `tenure.tenureType` vs `tenureType`, adjust `mapTenure(...)`.
   - If the property object itself isn't found, update the predicate in `parseRightmoveHtml` (`"prices" in o && "address" in o && ...`).
   - If the JSON sits behind a different marker, add it to the `models` list.
6. **Pin it with a test:** assert the real values in the real-page test (address, price, beds, postcode, floor area, tenure). If the structure changes again, the test will fail before users notice.
7. **Check for regressions:** run `npm run check` from the repo root. The synthetic fixtures must still pass, because they cover the fallback layers.

When Rightmove changes their page, you'll see deals arriving with blank fields, or snapshots with `status = 'partial'` / `'failed'` in `listing_snapshot`. Repeat steps 1–6 with a fresh page.
