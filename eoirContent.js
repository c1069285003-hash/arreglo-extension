// EOIR ACIS content bridge. Keep DOJ pages isolated from the USCIS/I-94
// autofill script; this file only reads the visible result after staff clicks
// Capture EOIR.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'ARREGLO_CAPTURE_EOIR_RESULT') return false;

  import(chrome.runtime.getURL('eoirAcisCapture.js'))
    .then(({ parseEoirAcisResult }) => {
      const result = parseEoirAcisResult(document);
      sendResponse({
        ok: result.ok,
        fields: result.fields,
        error: result.error,
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        fields: undefined,
        error: error?.message || 'Unable to load the EOIR ACIS parser.',
      });
    });

  return true;
});
