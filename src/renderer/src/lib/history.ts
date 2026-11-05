import type { RepositoryStats } from "@shared/types";
export interface Snapshot {
  id: string;
  createdAt: number;
  stats: RepositoryStats;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("countmycode", 2);
    request.onupgradeneeded = () => {
      const store = request.result.objectStoreNames.contains("scans")
        ? request.transaction!.objectStore("scans")
        : request.result.createObjectStore("scans", { keyPath: "id" });
      if (!store.indexNames.contains("createdAt"))
        store.createIndex("createdAt", "createdAt");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Browser history storage is unavailable"));
  });
}
export async function loadHistory(): Promise<Snapshot[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("scans", "readonly");
    const req = tx.objectStore("scans").getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as Snapshot[]).sort((a, b) => b.createdAt - a.createdAt),
      );
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveSnapshot(stats: RepositoryStats): Promise<Snapshot> {
  const snapshot = { id: crypto.randomUUID(), createdAt: Date.now(), stats };
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("scans", "readwrite");
    tx.objectStore("scans").put(snapshot);
    const store = tx.objectStore("scans");
    let count = 0;
    const cursor = store.index("createdAt").openKeyCursor(null, "prev");
    cursor.onsuccess = () => {
      const item = cursor.result;
      if (!item) return;
      if (++count > 20) store.delete(item.primaryKey);
      item.continue();
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () =>
      reject(new Error("Could not save history. Browser storage may be full."));
  });
  return snapshot;
}
export async function deleteSnapshot(id: string) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("scans", "readwrite");
    tx.objectStore("scans").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
