/**
 * E2E Encryption: Device Keypair Management
 *
 * Each device generates an ECDH P-256 keypair.
 * The public key (SPKI, base64) is published to user_devices in Supabase.
 * The private key (PKCS8, base64) is stored locally in IndexedDB.
 *
 * ECDH is used to derive a shared secret between two devices,
 * which is then used to wrap (AES-KW) the room key.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };

/** Generate a new ECDH P-256 keypair for this device. */
export async function generateDeviceKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

/** Export public key as base64 SPKI. */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("spki", key);
    return arrayBufferToBase64(raw);
}

/** Export private key as base64 PKCS8. */
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(raw);
}

/** Import public key from base64 SPKI. */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    const raw = base64ToArrayBuffer(spkiBase64);
    return crypto.subtle.importKey("spki", raw, ECDH_PARAMS, true, []);
}

/** Import private key from base64 PKCS8. */
export async function importPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
    const raw = base64ToArrayBuffer(pkcs8Base64);
    return crypto.subtle.importKey("pkcs8", raw, ECDH_PARAMS, true, [
        "deriveKey",
        "deriveBits",
    ]);
}

// --- Encoding helpers ---

export function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
