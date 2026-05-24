import CryptoJS from "crypto-js";

/**
 * 1. الجزء الخاص بالشات الفردي (Symmetric AES)
 * بنستخدم الـ IDs لعمل مفتاح مشترك سريع
 */
export const getSharedSecretKey = (id1, id2) => {
    if (!id1 || !id2) return "fallback-secret-key";
    const sortedIds = [id1, id2].sort().join("-");
    return CryptoJS.SHA256(sortedIds).toString();
};

// تشفير (فردي أو جروب)
export const encryptText = (text, key) => {
    if (!text || !key) return text;
    return CryptoJS.AES.encrypt(text, key).toString();
};

// فك تشفير (فردي أو جروب)
export const decryptText = (ciphertext, key) => {
    if (!ciphertext || !key) return ciphertext;
    
    // 🚨 التعديل السحري: نصوص CryptoJS AES دايماً بتبدأ بـ "U2Fsd" (Salted__)
    // لو النص مبيبدأش بيها، يبقى ده Plain Text، نرجعه فوراً ونوفر قوة المعالج!
    if (typeof ciphertext === 'string' && !ciphertext.startsWith("U2Fsd")) {
        return ciphertext;
    }

    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext;
    } catch (error) {
        return ciphertext;
    }
};
/**
 * 2. الجزء الخاص بتأمين المفاتيح (Asymmetric RSA)
 * بنستخدم الـ Web Crypto API لتشفير مفاتيح الجروبات
 */

// مساعدات لتحويل المفاتيح
const str2ab = (str) => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) bufView[i] = str.charCodeAt(i);
    return buf;
};

// استيراد المفتاح العام للمستلم (من الداتا بيز)
export const importPublicKey = async (pemBase64) => {
    const binaryDerString = window.atob(pemBase64);
    const binaryDer = str2ab(binaryDerString);
    return await window.crypto.subtle.importKey(
        "spki", binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true, ["encrypt"]
    );
};

// استيراد المفتاح الخاص بتاعك (من الـ LocalStorage)
export const importPrivateKey = async (pemBase64) => {
    const binaryDerString = window.atob(pemBase64);
    const binaryDer = str2ab(binaryDerString);
    return await window.crypto.subtle.importKey(
        "pkcs8", binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true, ["decrypt"]
    );
};

/**
 * 3. تشفير مفتاح الجروب (The "Secret Sauce")
 * بنشفر مفتاح الجروب (AES Key) بمفتاح الشخص (RSA Public Key)
 */
export const encryptGroupKeyForMember = async (groupKey, memberPublicKeyStr) => {
    try {
        const publicKey = await importPublicKey(memberPublicKeyStr);
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            enc.encode(groupKey)
        );
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (err) {
        console.error("Failed to encrypt group key:", err);
        return null;
    }
};

// فك تشفير مفتاح الجروب اللي مبعوتلك
export const decryptGroupKeyForMe = async (encryptedGroupKey, myPrivateKeyStr) => {
    try {
        const privateKey = await importPrivateKey(myPrivateKeyStr);
        const encryptedBuffer = Uint8Array.from(atob(encryptedGroupKey), c => c.charCodeAt(0));
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedBuffer
        );
        return new TextDecoder().decode(decrypted);
    } catch (err) {
        console.error("Failed to decrypt group key:", err);
        return null;
    }
};