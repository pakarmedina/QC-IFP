/**
 * Penyimpanan foto inspeksi di browser (IndexedDB).
 * Foto hanya ada di perangkat ini, tidak dikirim ke server.
 */
export type StoredPhoto = {
  key: string; // `${inspectionId}:${itemId}`
  inspectionId: string;
  itemId: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: number;
};

const DB_NAME = "qc-ifp-photos";
const STORE = "photos";
const INDEX = "byInspection";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser ini tidak mendukung penyimpanan foto. Jangan pakai tab incognito."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex(INDEX, "inspectionId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Gagal membuka penyimpanan foto."));
    req.onblocked = () => reject(new Error("Penyimpanan foto sedang dipakai tab lain."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Gagal mengakses penyimpanan foto."));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Penyimpanan foto penuh atau dibatalkan."));
    };
  });
}

const keyOf = (inspectionId: string, itemId: string) => `${inspectionId}:${itemId}`;

export async function putPhoto(input: { inspectionId: string; itemId: string; blob: Blob; width: number; height: number }) {
  const record: StoredPhoto = { ...input, key: keyOf(input.inspectionId, input.itemId), createdAt: Date.now() };
  await withStore("readwrite", (s) => s.put(record));
}

export async function listPhotos(inspectionId: string): Promise<StoredPhoto[]> {
  const rows = await withStore<StoredPhoto[]>("readonly", (s) => s.index(INDEX).getAll(inspectionId));
  return rows ?? [];
}

export async function deletePhoto(inspectionId: string, itemId: string) {
  await withStore("readwrite", (s) => s.delete(keyOf(inspectionId, itemId)));
}

export async function deleteAllPhotos(inspectionId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).index(INDEX).openCursor(IDBKeyRange.only(inspectionId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Gagal menghapus foto."));
    };
  });
}

/** Meminta browser agar tidak menghapus foto saat memori HP penuh. Tidak dijamin dikabulkan. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* diabaikan */
  }
  return false;
}
