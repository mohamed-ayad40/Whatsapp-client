import CryptoJS from "crypto-js";
import { db } from "./LocalDatabase"; // 🚨 تأكد من مسار ملف الـ Dexie بتاعك

/**
 * ====================================================
 * 1. الجزء الخاص بتشفير النصوص (Symmetric AES)
 * ====================================================
 */

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
 * ====================================================
 * 2. الشات الفردي: خوارزمية (ECDH) لإنتاج السر المشترك
 * ====================================================
 */

// دالة مساعدة لتحويل الـ Base64 لـ ArrayBuffer
const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// استيراد مفتاح ECDH العام (للطرف التاني)
const importEcdhPublicKey = async (base64Key) => {
    return await window.crypto.subtle.importKey(
        "spki",
        base64ToArrayBuffer(base64Key),
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
};

// استيراد مفتاح ECDH الخاص (بتاعك)
const importEcdhPrivateKey = async (base64Key) => {
    return await window.crypto.subtle.importKey(
        "pkcs8",
        base64ToArrayBuffer(base64Key),
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
    );
};

// 🔥 الدالة الجديدة لإنتاج مفتاح الشات الفردي المشترك
export const getSharedSecretKey = async (myId, otherUserId) => {
    if (!myId || !otherUserId) return "fallback-secret-key";

    try {
        const myEcdhPrivateKeyStr = localStorage.getItem("ecdhPrivateKey");
        
        const contact = await db.contacts.get(otherUserId);
        const otherEcdhPublicKeyStr = contact?.ecdhPublicKey;

        // Fallback: لو مفيش مفاتيح ECDH لسه، بنرجع للطريقة القديمة مؤقتاً
        if (!myEcdhPrivateKeyStr || !otherEcdhPublicKeyStr) {
            const sortedIds = [myId, otherUserId].sort().join("-");
            return CryptoJS.SHA256(sortedIds).toString();
        }

        const myPrivateKey = await importEcdhPrivateKey(myEcdhPrivateKeyStr);
        const otherPublicKey = await importEcdhPublicKey(otherEcdhPublicKeyStr);

        // إنتاج السر المشترك
        const sharedBits = await window.crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: otherPublicKey
            },
            myPrivateKey,
            256
        );

        // تحويله لـ Hexadecimal عشان CryptoJS
        const sharedSecretBytes = new Uint8Array(sharedBits);
        return Array.from(sharedSecretBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    } catch (error) {
        console.error("ECDH Key Derivation Failed:", error);
        const sortedIds = [myId, otherUserId].sort().join("-");
        return CryptoJS.SHA256(sortedIds).toString();
    }
};

/**
 * ====================================================
 * 3. الجزء الخاص بتأمين مفاتيح الجروبات (Asymmetric RSA)
 * ====================================================
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
 * تشفير مفتاح الجروب (AES Key) بمفتاح الشخص (RSA Public Key)
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

export const generateGroupSecretKey = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};