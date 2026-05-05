import CryptoJS from "crypto-js";

// الدالة دي بتاخد الـ ID بتاعك وبتاع صاحبك، وترتبهم أبجدياً، وتطلع منهم "مفتاح سري" معقد جداً
// الترتيب الأبجدي بيضمن إنك لو بتكلمه أو هو بيكلمك، المفتاح يطلع هو هو بالظبط!
export const getSharedSecretKey = (id1, id2) => {
    if (!id1 || !id2) return "fallback-secret-key";
    const sortedIds = [id1, id2].sort().join("-");
    return CryptoJS.SHA256(sortedIds).toString();
};

// دالة التشفير (بتحول الكلام لطلاسم)
export const encryptText = (text, sharedKey) => {
    if (!text) return text;
    return CryptoJS.AES.encrypt(text, sharedKey).toString();
};

// دالة فك التشفير (بترجع الطلاسم لكلام مقروء)
export const decryptText = (ciphertext, sharedKey) => {
    if (!ciphertext) return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, sharedKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext; // لو فشل يفكها يعرضها زي ما هي
    } catch (error) {
        return ciphertext;
    }
};