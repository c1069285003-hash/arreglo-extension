// 点击Extension图标 → 打开Side Panel
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 在my.uscis.gov上自动启用side panel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes('my.uscis.gov')) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'popup.html',
      enabled: true,
    });
  }
});

// ── MAIN-world per-character typer (grouped First/Middle/Last Name fields) ────
// The USCIS Name component only writes to Formik's SAVED `values` on a real
// per-character key → beforeinput → input sequence. Setting the value (even via
// execCommand) updates the display but Save persists "" (verified at the network
// layer: firstName sent as "" with the text committer, real value with this typer).
// Must run in the MAIN world so el._valueTracker and React's real handlers apply.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'SET_USCIS_TYPED_VALUE' || !sender.tab?.id) return false;

  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    world: 'MAIN',
    func: async (name, rawValue) => {
      const el = document.getElementsByName(name)[0];
      if (!el) return { ok: false, reason: 'field-not-found' };
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return { ok: false, reason: 'not-text-field' };
      const value = String(rawValue ?? '');
      const proto = tag === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      el.focus();
      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      // Clear first so we replace rather than append.
      if (setter) setter.call(el, ''); else el.value = '';
      if (el._valueTracker) el._valueTracker.setValue(' ');
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));

      for (const ch of value) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
        el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch }));
        const prev = el.value;
        if (setter) setter.call(el, prev + ch); else el.value = prev + ch;
        if (el._valueTracker) el._valueTracker.setValue(prev); // force React to see a change each keystroke
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
        await sleep(10);
      }

      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); // real focusout → Formik handleBlur (touched + commit)
      el.blur();
      return { ok: el.value === value, domValue: el.value };
    },
    args: [message.name, message.value],
  }).then(([result]) => {
    sendResponse(result?.result || { ok: false, reason: 'no-result' });
  }).catch((error) => {
    sendResponse({ ok: false, reason: error.message });
  });

  return true;
});

// ── Universal MAIN-world text committer ──────────────────────────────────────
// Root cause of "value displays but USCIS does not save it":
// content.js (isolated world) set el.value via the native setter and dispatched
// a synthetic 'input' event. React's value tracker lives in the MAIN world and
// dedupes that event, so Formik state never received the value. The DOM showed
// it, but clicking Next saved Formik state — which was empty.
// Fix: commit in the MAIN world using execCommand('insertText'), which goes
// through the browser's real editing pipeline (identical to typing), with a
// native-setter + _valueTracker reset fallback.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'SET_USCIS_TEXT_VALUE' || !sender.tab?.id) return false;

  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    world: 'MAIN',
    func: (name, rawValue) => {
      const el = document.getElementsByName(name)[0];
      if (!el) return { ok: false, reason: 'field-not-found' };
      const value = String(rawValue ?? '');
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return { ok: false, reason: 'not-text-field' };

      el.focus();
      el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

      // Path 1: execCommand('insertText') — real editing pipeline, React
      // processes it exactly like user typing. Select-all first so it replaces.
      let committed = false;
      try {
        el.select?.();
        if (el.setSelectionRange) el.setSelectionRange(0, el.value.length);
        committed = document.execCommand('insertText', false, value);
      } catch (e) { committed = false; }

      // Path 2 fallback: native setter + tracker reset + InputEvent
      if (!committed || el.value !== value) {
        const proto = tag === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        // Reset React's value tracker so the input event is NOT deduped.
        if (el._valueTracker) el._valueTracker.setValue('');
        el.dispatchEvent(new InputEvent('input', {
          bubbles: true, cancelable: false, inputType: 'insertText', data: value,
        }));
      }

      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      el.blur();

      return { ok: el.value === value, domValue: el.value };
    },
    args: [message.name, message.value],
  }).then(([result]) => {
    sendResponse(result?.result || { ok: false, reason: 'no-result' });
  }).catch(error => {
    sendResponse({ ok: false, reason: error.message });
  });

  return true;
});

// USCIS text fields use Inputmask. Its internal instance is attached in the
// page's MAIN world and is not reliably visible to an isolated content script.
// Update Inputmask through its own API, then notify React/Formik.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'SET_USCIS_MASKED_VALUE' || !sender.tab?.id) return false;

  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    world: 'MAIN',
    func: (name, rawValue) => {
      const el = document.getElementsByName(name)[0];
      if (!el) return { ok: false, reason: 'field-not-found' };

      const value = String(rawValue ?? '');
      el.focus();

      if (el.inputmask?.setValue) {
        el.inputmask.setValue(value);
      } else {
        // Inputmask's bundled event handler reads event.detail[0].
        el.dispatchEvent(new CustomEvent('setvalue', {
          detail: [value],
          bubbles: false,
        }));
      }

      // Inputmask sets the value through the native setter, which React's value
      // tracker observes — the synthetic input event below would then be deduped
      // and Formik state would stay empty (value shown but not saved on Next).
      // Reset the tracker so React accepts the input event.
      if (el._valueTracker) el._valueTracker.setValue('');

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();

      const internalValue = el.inputmask?.unmaskedvalue
        ? el.inputmask.unmaskedvalue()
        : el.value;

      return {
        ok: String(internalValue ?? '') === value || el.value === value,
        domValue: el.value,
        internalValue: String(internalValue ?? ''),
        hasInputmask: Boolean(el.inputmask),
      };
    },
    args: [message.name, message.value],
  }).then(([result]) => {
    sendResponse(result?.result || { ok: false, reason: 'no-result' });
  }).catch(error => {
    sendResponse({ ok: false, reason: error.message });
  });

  return true;
});
