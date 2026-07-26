(function exposeEoirPendingState(globalScope) {
  function createEoirPendingState({ storage, pendingKey }) {
    let pending = null;
    let persisted = false;
    let transitionInProgress = false;
    let persistencePromise = null;

    function getPending() {
      return pending;
    }

    function isPersisted() {
      return persisted;
    }

    function isCaptureBlocked() {
      return transitionInProgress || Boolean(pending);
    }

    function tryBeginCapture() {
      return !isCaptureBlocked();
    }

    function restore(value) {
      pending = value;
      persisted = Boolean(value);
      return pending;
    }

    function persistPending() {
      if (!pending) return Promise.reject(new Error('No confirmed EOIR capture is pending.'));
      if (persisted) return Promise.resolve(pending);
      if (persistencePromise) return persistencePromise;

      const target = pending;
      transitionInProgress = true;
      persistencePromise = (async () => {
        try {
          await storage.set({ [pendingKey]: target });
          if (pending === target) persisted = true;
          return target;
        } finally {
          transitionInProgress = false;
          persistencePromise = null;
        }
      })();
      return persistencePromise;
    }

    function beginConfirmation(draft) {
      if (pending) return persistPending();
      if (!draft || typeof draft.captureId !== 'string' || !draft.fields) {
        return Promise.reject(new Error('EOIR capture draft is incomplete.'));
      }
      pending = {
        captureId: draft.captureId,
        fields: draft.fields,
        staffConfirmed: true,
      };
      persisted = false;
      return persistPending();
    }

    function ensurePersisted() {
      return persistPending();
    }

    async function finishSave({ httpOk, resultOk, linkState }) {
      const confirmed = httpOk === true
        && resultOk === true
        && (linkState === 'linked' || linkState === 'unlinked');
      if (!confirmed || !pending) return false;

      const target = pending;
      transitionInProgress = true;
      try {
        await storage.remove([pendingKey]);
        if (pending === target) {
          pending = null;
          persisted = false;
        }
        return true;
      } finally {
        transitionInProgress = false;
      }
    }

    return {
      beginConfirmation,
      ensurePersisted,
      finishSave,
      getPending,
      isCaptureBlocked,
      isPersisted,
      restore,
      tryBeginCapture,
    };
  }

  globalScope.createEoirPendingState = createEoirPendingState;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createEoirPendingState };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
