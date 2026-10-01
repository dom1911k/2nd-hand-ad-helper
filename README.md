# Ad Helper

A phone-first listing generator for selling on **eBay, Kleinanzeigen, Vinted and Willhaben**
from several accounts. You pick a product type, fill in a few fields, and it assembles the
German title and description from reusable text blocks, with the right private-sale warranty
exclusion for each platform: German wording for eBay, Kleinanzeigen and Vinted, Austrian wording for Willhaben.

It also tracks where each item is listed. When the last unit sells on one account,
every other live listing gets flagged **"Take down!"** until you tick it off.

No server and no account needed. Data stays in your browser.

## Using it

1. **New → product type** (3DS, iPod, Vita card, or your own). Or use **Same as before → Copy**
   for an item you've sold before; that's the fastest path for repeat items.
2. Fill in price, quantity and fields (SD card size, colour, defects …).
3. Under **Listings**, tap an account to get the title and description, copy them, and open the
   platform's "post ad" page. Add photos there and post, then tap **Mark live**
   (optionally paste the listing link).
4. When something sells, open the item and tap **Sold** on the account it sold through.
   With quantity > 1, listings stay live until stock runs out.
5. The **Items** tab shows a red **Take down** list with a badge. Delete those listings on the
   platform, then tap **Done ✓**.

## Text blocks

- `{key}` inserts a field value (`{sd_size}`, `{condition}` …) or a variable from Settings (`{city}`).
- If a value is empty, the **whole block is left out**. That's how the SD card or defects text disappears.
- `[[ … ]]` marks an optional part: only that part is dropped when its value is empty.
- Each block can be limited to certain platforms (e.g. the AT warranty text is Willhaben-only).
- Block order and default on/off are set per product type (Settings → Product types).
  Each item can switch blocks on or off.

The starter texts are suggestions. Check them, especially the warranty wording, and adapt
them in the Blocks tab. Default title limits (eBay 80, Kleinanzeigen 65) are editable under
Settings → Platforms.

## Backups & phone ↔ computer

Data is stored in the browser's localStorage on each device. Use **Settings → Export** regularly
(on a phone this opens the share sheet, e.g. to save to Files or Drive). **Import** replaces
the current data.

## Running / hosting

It's a static site with no build step:

```sh
npm start          # serves on http://localhost:8080
npm test           # unit tests for templates and the sold/take-down logic
```

### Live version (GitHub Pages)

**https://dom1911k.github.io/2nd-hand-ad-helper/**

Every push to the default branch runs the tests and redeploys (`.github/workflows/pages.yml`).
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

On your phone, open the link and add it to the home screen:
- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ → *Add to Home screen* / *Install app*

After the first load it works offline. The code is public, but your items and texts are
not: they're stored only in the browser on your device.

## Not in v1 (ideas)

- Browser extension that fills the platform forms automatically (in your own logged-in session)
- eBay API publishing (eBay is the only one of the four with an official listing API)
- Syncing between devices without manual export/import
- Reusable photo sets
