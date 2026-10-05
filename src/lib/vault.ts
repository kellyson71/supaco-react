// Cofre do "manter conectado": guarda a senha cifrada (AES-GCM) no IndexedDB do aparelho.
// A chave é criada como não exportável, então nem o próprio app consegue lê-la; só pedir ao navegador para usá-la.

const DB = 'supaco';
const STORE = 'vault';
const ENTRY = 'login';

type Sealed = { user: string; key: CryptoKey; iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };

const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function store<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const vault = {
  async save(user: string, password: string) {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(password));
    await store('readwrite', (s) => s.put({ user, key, iv, data } satisfies Sealed, ENTRY));
  },

  /** Senha guardada para `user`, ou `null` se não houver (ou se o cofre não puder ser lido). */
  async load(user: string): Promise<string | null> {
    try {
      const sealed = await store<Sealed | undefined>('readonly', (s) => s.get(ENTRY));
      if (!sealed || sealed.user !== user) return null;
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, sealed.key, sealed.data);
      return new TextDecoder().decode(plain);
    } catch {
      return null;
    }
  },

  async clear() {
    try { await store('readwrite', (s) => s.delete(ENTRY)); } catch { /* sem IndexedDB não há o que apagar */ }
  },
};
