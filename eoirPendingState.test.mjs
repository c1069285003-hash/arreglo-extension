import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const moduleUrl = new URL("./eoirPendingState.js", import.meta.url);
const modulePath = fileURLToPath(moduleUrl);

function loadFactory() {
  assert.equal(existsSync(modulePath), true, "pending state runtime module must exist");
  return require(modulePath).createEoirPendingState;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function makeStorage({ setImpl } = {}) {
  const calls = { set: [], remove: [] };
  return {
    calls,
    async set(value) {
      calls.set.push(value);
      if (setImpl) return setImpl(value);
    },
    async remove(keys) {
      calls.remove.push(keys);
    },
  };
}

const draft = {
  captureId: "capture-fixed-id",
  fields: {
    subjectName: "QIN, HAIXIA",
    alienNumber: "236333728",
  },
};

test("blocks an immediate Capture Again while pending persistence is delayed", async () => {
  const createEoirPendingState = loadFactory();
  const gate = deferred();
  const storage = makeStorage({ setImpl: () => gate.promise });
  const state = createEoirPendingState({ storage, pendingKey: "pending" });

  const confirmation = state.beginConfirmation(draft);

  assert.equal(state.tryBeginCapture(), false);
  assert.equal(state.isCaptureBlocked(), true);
  assert.equal(state.getPending().captureId, "capture-fixed-id");
  assert.equal(storage.calls.set.length, 1);

  gate.resolve();
  await confirmation;

  assert.equal(state.tryBeginCapture(), false);
  assert.equal(state.getPending().captureId, "capture-fixed-id");
});

test("storage failure keeps the confirmed pending payload and retries the same ID", async () => {
  const createEoirPendingState = loadFactory();
  let shouldFail = true;
  const storage = makeStorage({
    setImpl: async () => {
      if (shouldFail) throw new Error("storage unavailable");
    },
  });
  const state = createEoirPendingState({ storage, pendingKey: "pending" });

  await assert.rejects(state.beginConfirmation(draft), /storage unavailable/);

  assert.equal(state.tryBeginCapture(), false);
  assert.equal(state.getPending().captureId, "capture-fixed-id");
  assert.equal(state.isPersisted(), false);

  shouldFail = false;
  const retried = await state.ensurePersisted();

  assert.equal(retried.captureId, "capture-fixed-id");
  assert.equal(state.isPersisted(), true);
  assert.equal(storage.calls.set.length, 2);
  assert.deepEqual(storage.calls.set[0], storage.calls.set[1]);
});

test("cleans up only after a positive linked or unlinked response", async () => {
  const createEoirPendingState = loadFactory();

  for (const linkState of ["linked", "unlinked"]) {
    const storage = makeStorage();
    const state = createEoirPendingState({ storage, pendingKey: "pending" });
    await state.beginConfirmation(draft);

    for (const response of [
      { httpOk: false, resultOk: true, linkState },
      { httpOk: true, resultOk: false, linkState },
      { httpOk: true, resultOk: true, linkState: "conflict" },
      { httpOk: true, resultOk: true, linkState: "" },
    ]) {
      assert.equal(await state.finishSave(response), false);
      assert.equal(state.getPending().captureId, "capture-fixed-id");
      assert.equal(storage.calls.remove.length, 0);
    }

    assert.equal(await state.finishSave({
      httpOk: true,
      resultOk: true,
      linkState,
    }), true);
    assert.equal(state.getPending(), null);
    assert.deepEqual(storage.calls.remove, [["pending"]]);
  }
});
