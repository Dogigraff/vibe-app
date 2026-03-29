/**
 * E2E Encryption: Message Encrypt / Decrypt
 *
 * Uses AES-GCM with a 12-byte random IV.
 * Plaintext → UTF-8 → AES-GCM encrypt → base64 ciphertext + base64 nonce.
 * Server only sees ciphertext + nonce.
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from "./keys";

const IV_BYTES = 12;

export interface EncryptedPayload {
    ciphertext: string; // base64
    nonce: string;      // base64 (12-byte IV)
}

/**
 * Encrypt a plaintext message with the room AES-GCM key.
 * @param plaintext UTF-8 message
 * @param roomKey AES-GCM CryptoKey
 */
export async function encryptMessage(
    plaintext: string,
    roomKey: CryptoKey
): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const encoded = new TextEncoder().encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        roomKey,
        encoded
    );

    return {
        ciphertext: arrayBufferToBase64(encrypted),
        nonce: arrayBufferToBase64(iv.buffer),
    };
}

/**
 * Decrypt an E2E message.
 * @returns plaintext string, or null if decryption fails
 */
export async function decryptMessage(
    ciphertextBase64: string,
    nonceBase64: string,
    roomKey: CryptoKey
): Promise<string | null> {
    try {
        const iv = new Uint8Array(base64ToArrayBuffer(nonceBase64));
        const data = base64ToArrayBuffer(ciphertextBase64);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            roomKey,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        // Decryption failure: wrong key, tampered data, etc.
        return null;
    }
}
