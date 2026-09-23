# Arreglo USCIS Autofill

This folder is the canonical Chrome extension source. Do not create new
`arreglo-fixed-*` copies for each change.

## Verify changes

Run:

```sh
npm run check
```

The automated checks cover helper conversion, USCIS page detection, ordinary
React input filling, radio selection, and failure reporting.

## Load in Chrome

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
and select this `chrome-extension` folder once. Future code changes only need
the extension's reload button; no new download or folder is needed.

## I-94 import

Load the client in Arreglo first, then open the CBP result page:
`https://i94.cbp.dhs.gov/search/recent-search/results` or
`https://i94.cbp.dhs.gov/search/history-search/results`. The extension reads
the visible I-94 or travel history result, searches for matching clients by
passport, name, DOB, and nationality, then asks you to confirm before saving the
immigration fields back to the client's English info sheet. Database search
requires the worker endpoint in `cloudflare-worker-create-client.js` to be
deployed; until then, enter the case number in the confirmation card.

Chinese names loaded from the client data are converted with `pinyin-pro` before
display and before USCIS autofill, so the sidebar and filled USCIS fields should
show pinyin instead of Chinese characters.
