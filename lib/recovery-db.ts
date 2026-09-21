/**
 * Local auto-recovery store (IndexedDB only).
 *
 * Persists a small session record so a user who refreshes, navigates away
 * or restarts the browser can be offered an explicit restore of their
 * previous work. Records stay on-device: IndexedDB is a browser-local
 * database and nothing here ever touches the network.
 *
 * Every API is defensive: if IndexedDB is unavailable, quota is exceeded,
 * or the stored state is corrupted, callers get null/false and the app
 * continues normally — recovery must never crash the application.
 */

const DB_NAME = 'pdfminifly-recovery';
const STORE = 'sessions';
const DB_VERSION = 1;

/** Recovery records older than this are purged. */
export const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Never persist working copies of very large documents. */
export const RECOVERY_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export interface RecoverySession<P = unknown> {
  toolSlug: string;
  savedAt: number;
  /** The input document (File/Blob) the session was working on. */
  file: Blob | File | null;
  /** Tool-specific working state (page order, annotations, ...). */
  payload: P;
  /** Bytes persisted, for cleanup decisions. */
  byteSize: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'toolSlug' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

/** Save (or overwrite) the recovery session for a tool. */
export async function saveRecoverySession<P>(
  toolSlug: string,
  file: Blob | File | null,
  payload: P
): Promise<boolean> {
  try {
    const byteSize = file ? file.size : 0;
    if (byteSize > RECOVERY_MAX_BYTES) return false; // don't hoard huge PDFs
    const record: RecoverySession<P> = {
      toolSlug,
      savedAt: Date.now(),
      file,
      payload,
      byteSize,
    };
    const result = await withStore('readwrite', (store) =>
      store.put(record) as unknown as IDBRequest<IDBValidKey>
    );
    return result !== null;
  } catch {
    return false;
  }
}

/** Fetch the recovery session for a tool, if a fresh one exists. */
export async function getRecoverySession<P>(
  toolSlug: string
): Promise<RecoverySession<P> | null> {
  try {
    const record = (await withStore('readonly', (store) =>
      store.get(toolSlug) as unknown as IDBRequest<RecoverySession<P>>
    )) as RecoverySession<P> | null;
    if (!record || typeof record.savedAt !== 'number') return null;
    if (Date.now() - record.savedAt > RECOVERY_TTL_MS) {
      void deleteRecoverySession(toolSlug);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

/** Remove the recovery session for a tool (discarded or completed). */
export async function deleteRecoverySession(toolSlug: string): Promise<void> {
  try {
    await withStore('readwrite', (store) =>
      store.delete(toolSlug) as unknown as IDBRequest<undefined>
    );
  } catch {
    // ignore — nothing to clean
  }
}

/** Remove every recovery session (used by privacy cleanup controls). */
export async function clearAllRecoverySessions(): Promise<void> {
  try {
    await withStore('readwrite', (store) =>
      store.clear() as unknown as IDBRequest<undefined>
    );
  } catch {
    // ignore
  }
}

/** Purge sessions older than the TTL. Call once on app start. */
export async function purgeExpiredRecoverySessions(
  ttlMs: number = RECOVERY_TTL_MS
): Promise<void> {
  try {
    const all = (await withStore('readonly', (store) =>
      store.getAll() as unknown as IDBRequest<RecoverySession[]>
    )) as RecoverySession[] | null;
    if (!all) return;
    const cutoff = Date.now() - ttlMs;
    await Promise.all(
      all
        .filter((s) => typeof s.savedAt === 'number' && s.savedAt < cutoff)
        .map((s) => deleteRecoverySession(s.toolSlug))
    );
  } catch {
    // ignore
  }
}

/**
 * Human-readable recovery data footprint, for privacy disclosures.
 * Returns null when IndexedDB is unavailable.
 */
export async function getRecoveryFootprint(): Promise<{
  sessions: number;
  bytes: number;
} | null> {
  try {
    const all = (await withStore('readonly', (store) =>
      store.getAll() as unknown as IDBRequest<RecoverySession[]>
    )) as RecoverySession[] | null;
    if (!all) return null;
    return {
      sessions: all.length,
      bytes: all.reduce((sum, s) => sum + (s.byteSize || 0), 0),
    };
  } catch {
    return null;
  }
}
