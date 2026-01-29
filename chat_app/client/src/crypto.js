// ===== KEY PAIR =====
export async function generateKeyPair() {
    return crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// ===== PASSWORD → AES KEY =====
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// ===== ENCRYPT PRIVATE KEY =====
export async function encryptPrivateKey(privateKey, password) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const aesKey = await deriveKey(password, salt);
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        pkcs8
    );

    return {
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt))
    };
}

// ===== DECRYPT PRIVATE KEY =====
export async function decryptPrivateKey(data, password) {
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
    const salt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0));
    const encryptedKey = Uint8Array.from(
        atob(data.encryptedKey),
        c => c.charCodeAt(0)
    );

    const aesKey = await deriveKey(password, salt);

    const pkcs8 = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encryptedKey
    );

    return crypto.subtle.importKey(
        "pkcs8",
        pkcs8,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
    );
}

// ===== PUBLIC KEY UTILS =====
export async function exportPublicKey(publicKey) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(spki)));
}

export async function importPublicKey(keyString) {
    const binary = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
        "spki",
        binary,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

// ===== MESSAGE ENCRYPTION =====
export async function encryptMessage(message, publicKey) {
    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        encoded
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export async function decryptMessage(cipherText, privateKey) {
    const binary = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        binary
    );
    return new TextDecoder().decode(decrypted);
}