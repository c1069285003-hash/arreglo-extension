// Arreglo page bridge — runs in the PAGE's main world (injected by content.js).
// Content scripts live in an isolated world and CANNOT see `el.inputmask`
// (the Inputmask instance USCIS attaches to masked fields), so masked values
// like zip codes silently failed to commit. This bridge runs where Inputmask
// and React's internals are visible and reports back via CustomEvent.
(function () {
  if (window.__arregloBridge) return;
  window.__arregloBridge = true;

  window.addEventListener('ARREGLO_SET_VALUE', function (e) {
    const d = (e && e.detail) || {};
    const name = d.name, value = d.value == null ? '' : String(d.value), reqId = d.reqId;
    let ok = false, method = 'none', finalValue = null;
    try {
      const el = document.querySelector('[name="' + name + '"]');
      if (el) {
        el.focus();
        if (el.inputmask && typeof el.inputmask.setValue === 'function') {
          el.inputmask.setValue(value);
          method = 'inputmask';
        } else {
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value');
          if (setter && setter.set) setter.set.call(el, value); else el.value = value;
          method = 'native';
        }
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        // React 17+ listens for focusout (not blur) to mark Formik "touched" —
        // without it the value shows but is dropped on save ("must click box").
        el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        el.dispatchEvent(new FocusEvent('blur',     { bubbles: true }));
        el.blur();
        finalValue = el.value;
        ok = true;
      }
    } catch (err) { ok = false; }
    window.dispatchEvent(new CustomEvent('ARREGLO_SET_VALUE_RESULT', {
      detail: { reqId: reqId, ok: ok, method: method, value: finalValue },
    }));
  });
})();
