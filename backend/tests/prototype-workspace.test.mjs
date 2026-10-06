import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoCollection,
  DemoWorkspaceStorageError,
  runDemoWrite,
  resetDemoWorkspace,
} from "../../src/lib/prototype/demoWorkspace.mjs";

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
    setUnrelated: (key, value) => items.set(key, value),
    has: (key) => items.has(key),
    get length() { return items.size; },
    key: (index) => [...items.keys()][index] ?? null,
  };
}

test("demo collections persist local submissions, update state, and reset without touching live storage", () => {
  const storage = memoryStorage();
  storage.setUnrelated("firebase-auth-session", "leave-alone");
  const collection = createDemoCollection("demo-incidents", [{ id: "fixture-1", status: "REPORTED" }], storage);
  collection.add({ id: "user-1", status: "REPORTED", classification: "USER_PROVIDED_UNVERIFIED" });
  assert.equal(collection.getAll().length, 2);
  assert.equal(collection.update("user-1", (item) => ({ ...item, status: "MONITORING" })), true);
  assert.equal(collection.getAll()[1].status, "MONITORING");
  assert.equal(collection.remove("fixture-1"), true);
  assert.deepEqual(collection.getAll().map((item) => item.id), ["user-1"]);
  collection.reset();
  assert.deepEqual(collection.getAll(), [{ id: "fixture-1", status: "REPORTED" }]);
  assert.equal(storage.has("firebase-auth-session"), true);
});

test("demo collection reports malformed persisted data explicitly", () => {
  const storage = memoryStorage();
  storage.setItem("demo", "{broken");
  const collection = createDemoCollection("demo", [{ id: "sample", classification: "SIMULATED" }], storage);
  assert.throws(() => collection.getAll(), DemoWorkspaceStorageError);
});

test("demo fixtures are copied and cannot be mutated through returned values", () => {
  const collection = createDemoCollection("demo", [{ id: "sample", nested: { label: "fixture" } }], null);
  const returned = collection.getAll();
  returned[0].nested.label = "changed";
  assert.equal(collection.getAll()[0].nested.label, "fixture");
});

test("local and cross-tab storage events refresh subscribers, including workspace reset", () => {
  const previousWindow = globalThis.window;
  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  try {
    const storage = memoryStorage();
    const incidents = createDemoCollection("isie-prototype-demo-incidents", [{ id: "fixture" }], storage);
    const alerts = createDemoCollection("isie-prototype-demo-alerts", [{ id: "alert-fixture" }], storage);
    const incidentUpdates = [];
    const alertUpdates = [];
    incidents.subscribe((items) => incidentUpdates.push(items.map((item) => item.id)));
    alerts.subscribe((items) => alertUpdates.push(items.map((item) => item.id)));

    incidents.add({ id: "local-entry" });
    assert.deepEqual(incidentUpdates.at(-1), ["fixture", "local-entry"]);

    storage.setItem("isie-prototype-demo-incidents", JSON.stringify([{ id: "cross-tab-entry" }]));
    const crossTab = new Event("storage");
    Object.defineProperty(crossTab, "key", { value: "isie-prototype-demo-incidents" });
    fakeWindow.dispatchEvent(crossTab);
    assert.deepEqual(incidentUpdates.at(-1), ["cross-tab-entry"]);

    resetDemoWorkspace(storage);
    assert.deepEqual(incidentUpdates.at(-1), ["fixture"]);
    assert.deepEqual(alertUpdates.at(-1), ["alert-fixture"]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("demo workspace reports browser storage failures rather than presenting fallback fixtures after failed writes", () => {
  const brokenStorage = {
    getItem() { return null; },
    setItem() { throw new Error("quota exceeded"); },
    removeItem() { throw new Error("access denied"); },
  };
  const collection = createDemoCollection("demo", [{ id: "fixture" }], brokenStorage);
  assert.throws(() => collection.add({ id: "new" }), /quota and permissions/);
  assert.throws(() => collection.reset(), /reset local demo changes/);
});

test("demo subscriptions deliver storage read errors to the UI error handler", () => {
  const previousWindow = globalThis.window;
  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  try {
    const storage = memoryStorage();
    const collection = createDemoCollection("demo-subscription", [{ id: "fixture" }], storage);
    const updates = [];
    const errors = [];
    collection.subscribe(
      (items) => updates.push(items),
      (error) => errors.push(error)
    );
    storage.setItem("demo-subscription", "{broken");
    fakeWindow.dispatchEvent(new CustomEvent("isie-prototype-demo-change", {
      detail: { key: "demo-subscription" },
    }));
    assert.equal(updates.length, 0);
    assert.equal(errors.length, 1);
    assert.ok(errors[0] instanceof DemoWorkspaceStorageError);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("demo workspace reports unavailable browser storage rather than silently loading demo values", () => {
  const previousWindow = globalThis.window;
  globalThis.window = new EventTarget();
  try {
    const collection = createDemoCollection("demo", [{ id: "fixture" }], null);
    assert.throws(() => collection.getAll(), /storage is unavailable/);
    assert.throws(() => resetDemoWorkspace(null), /storage is unavailable/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("alert, resource, notification, and evidence demo mutations are CRUD-capable but denied outside demo mode", () => {
  const serviceFixtures = {
    alerts: [{ id: "alert-fixture", status: "ACKNOWLEDGED" }],
    resources: [{ id: "resource-fixture", allocated: 0 }],
    notifications: [{ id: "notification-fixture", read: false }],
    evidence: [{ id: "evidence-fixture", verification: "UNVERIFIED" }],
  };

  for (const [service, fixtures] of Object.entries(serviceFixtures)) {
    const storage = memoryStorage();
    const collection = createDemoCollection(`isie-prototype-demo-${service}`, fixtures, storage);
    const localRecord = { id: `${service}-user-note`, state: "USER_PROVIDED_UNVERIFIED" };
    let writeCalls = 0;

    const denied = runDemoWrite(false, () => {
      writeCalls += 1;
      return collection.add(localRecord);
    }, null);
    assert.equal(denied, null, `${service} returns its non-demo denial result`);
    assert.equal(writeCalls, 0, `${service} does not invoke a write outside demo mode`);
    assert.deepEqual(collection.getAll(), fixtures, `${service} remains unchanged outside demo mode`);

    runDemoWrite(true, () => collection.add(localRecord));
    assert.equal(collection.update(localRecord.id, (item) => ({ ...item, state: "UPDATED_LOCALLY" })), true);
    assert.equal(collection.getAll().at(-1).state, "UPDATED_LOCALLY");
    assert.equal(collection.remove(localRecord.id), true);
    assert.deepEqual(collection.getAll(), fixtures);
  }
});
