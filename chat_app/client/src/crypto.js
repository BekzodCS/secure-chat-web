// Generate RSA key pair
export async function generateKeyPair() {
    return crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// Export public key (to share)
export async function exportPublicKey(publicKey) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(spki)));
}

// Import public key
export async function importPublicKey(keyString) {
    const binary = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
        "spki",
        binary,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}

// Encrypt message
export async function encryptMessage(message, publicKey) {
    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        encoded
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// Decrypt message
export async function decryptMessage(cipherText, privateKey) {
    const binary = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        binary
    );
    return new TextDecoder().decode(decrypted);
}