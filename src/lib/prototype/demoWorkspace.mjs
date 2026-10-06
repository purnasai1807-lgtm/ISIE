const EVENT_NAME = "isie-prototype-demo-change";
let fallbackIdCounter = 0;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class DemoWorkspaceStorageError extends Error {
  constructor(message) {
    super(message);
    this.name = "DemoWorkspaceStorageError";
  }
}

export function createDemoCollection(key, fixtures, storage = getBrowserStorage()) {
  const initial = clone(fixtures);
  const notify = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }));
    }
  };

  function read() {
    if (!storage) {
      if (typeof window !== "undefined") {
        throw new DemoWorkspaceStorageError("Browser storage is unavailable; demo workspace data was not loaded.");
      }
      return clone(initial);
    }
    let value;
    try {
      value = storage.getItem(key);
    } catch (error) {
      throw new DemoWorkspaceStorageError(`Unable to read the local demo workspace: ${String(error)}`);
    }
    if (value === null) return clone(initial);
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new DemoWorkspaceStorageError(`Saved demo workspace is invalid JSON; reset demo edits to recover: ${String(error)}`);
    }
    if (!Array.isArray(parsed)) {
      throw new DemoWorkspaceStorageError("Saved demo workspace has an invalid format; reset demo edits to recover.");
    }
    return parsed;
  }

  function write(items) {
    if (storage) {
      try {
        storage.setItem(key, JSON.stringify(items));
      } catch (error) {
        throw new DemoWorkspaceStorageError(`Unable to save local demo changes; check browser storage quota and permissions: ${String(error)}`);
      }
    } else if (typeof window !== "undefined") {
      throw new DemoWorkspaceStorageError("Browser storage is unavailable; local demo changes were not saved.");
    }
    notify();
    return clone(items);
  }

  return {
    getAll: read,
    replace: write,
    add(item) {
      return write([...read(), clone(item)]);
    },
    update(id, updater) {
      let updated = false;
      const next = read().map((item) => {
        if (item.id !== id) return item;
        updated = true;
        return updater(clone(item));
      });
      if (!updated) return false;
      write(next);
      return true;
    },
    remove(id) {
      const current = read();
      const next = current.filter((item) => item.id !== id);
      if (next.length === current.length) return false;
      write(next);
      return true;
    },
    reset() {
      if (storage) {
        try {
          storage.removeItem(key);
        } catch (error) {
          throw new DemoWorkspaceStorageError(`Unable to reset local demo changes: ${String(error)}`);
        }
      } else if (typeof window !== "undefined") {
        throw new DemoWorkspaceStorageError("Browser storage is unavailable; local demo changes were not reset.");
      }
      notify();
      return clone(initial);
    },
    subscribe(callback, onError) {
      if (typeof window === "undefined") return () => {};
      const listener = (event) => {
        if (event.detail?.key === key || event.detail?.key === "*" || event.key === key) {
          let items;
          try {
            items = read();
          } catch (error) {
            if (onError) {
              onError(error);
              return;
            }
            throw error;
          }
          callback(items);
        }
      };
      window.addEventListener(EVENT_NAME, listener);
      window.addEventListener("storage", listener);
      return () => {
        window.removeEventListener(EVENT_NAME, listener);
        window.removeEventListener("storage", listener);
      };
    },
  };
}

export function resetDemoWorkspace(storage = getBrowserStorage()) {
  if (!storage) {
    if (typeof window !== "undefined") {
      throw new DemoWorkspaceStorageError("Browser storage is unavailable; local demo changes were not reset.");
    }
    return;
  }
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith("isie-prototype-demo-")) keys.push(key);
  }
  try {
    keys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    throw new DemoWorkspaceStorageError(`Unable to reset local demo changes: ${String(error)}`);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key: "*" } }));
  }
}

export function createDemoId(prefix) {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") return `${prefix}-${randomUUID()}`;
  fallbackIdCounter += 1;
  return `${prefix}-${Date.now()}-${fallbackIdCounter}`;
}

export function runDemoWrite(isDemoMode, write, deniedResult = false) {
  if (!isDemoMode) return deniedResult;
  return write();
}

function getBrowserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch (error) {
    if (typeof window !== "undefined") {
      throw new DemoWorkspaceStorageError(`Browser storage is unavailable: ${String(error)}`);
    }
    return null;
  }
}
