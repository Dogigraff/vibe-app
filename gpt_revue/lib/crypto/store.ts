/**
 * E2E Encryption: IndexedDB Storage for Device Keys + Room Keys
 *
 * Stores:
 * - Device keypair (SPKI public + PKCS8 private, base64)
 * - Room keys per party (AES-GCM raw, base64)
 *
 * All keys stay client-side. Server never sees private key or room key plaintext.
 */

const DB_NAME = "vibe-e2e";
const DB_VERSION = 1;
const STORE_DEVICE = "device_keys";
const STORE_ROOM = "room_keys";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_DEVICE)) {
                db.createObjectStore(STORE_DEVICE);
            }
            if (!db.objectStoreNames.contains(STORE_ROOM)) {
                db.createObjectStore(STORE_ROOM);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
    return new Promise(async (resolve, reject) => {
        const db = await openDB();
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
    });
}

function idbPut<T>(store: string, key: string, value: T): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await openDB();
        const tx = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// --- Device Keys ---

export interface StoredDeviceKey {
    deviceId: string;
    publicKeySpki: string;  // base64
    privateKeyPkcs8: string; // base64
}

export async function getStoredDeviceKey(): Promise<StoredDeviceKey | undefined> {
    return idbGet<StoredDeviceKey>(STORE_DEVICE, "current");
}

export async function storeDeviceKey(key: StoredDeviceKey): Promise<void> {
    return idbPut(STORE_DEVICE, "current", key);
}

// --- Room Keys ---

export async function getStoredRoomKey(partyId: string): Promise<string | undefined> {
    return idbGet<string>(STORE_ROOM, partyId);
}

export async function storeRoomKey(partyId: string, roomKeyBase64: string): Promise<void> {
    return idbPut(STORE_ROOM, partyId, roomKeyBase64);
}
