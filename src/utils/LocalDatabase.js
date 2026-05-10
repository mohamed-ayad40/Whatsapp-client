import Dexie from 'dexie';

// 1. تعريف الداتا بيز
export const db = new Dexie('ChatAppDB');

// 2. تعريف الجداول (الـ Schema)
db.version(1).stores({
  // id هو المفتاح الأساسي، والباقي عبارة عن Indexes للبحث السريع
  messages: 'id, chatId, senderId, createdAt', 
  contacts: 'id, name, lastMessageTime'
});

// --- [عمليات الرسائل] ---

export const saveMessagesToLocal = async (messages) => {
    try {
        await db.messages.bulkPut(messages);
    } catch (error) {
        console.error("Dexie Save Messages Error:", error);
    }
};

export const getLocalMessages = async (chatId) => {
    return await db.messages
        .where('chatId')
        .equals(chatId)
        .sortBy('createdAt');
};

// --- [عمليات جهات الاتصال - الميزة الجديدة] ---

export const saveContactsToLocal = async (contacts) => {
    try {
        // بنخزن قائمة جهات الاتصال عشان تفتح فوراً المرة الجاية
        await db.contacts.bulkPut(contacts);
    } catch (error) {
        console.error("Dexie Save Contacts Error:", error);
    }
};

export const getLocalContacts = async () => {
    try {
        return await db.contacts.toArray();
    } catch (error) {
        console.error("Dexie Get Contacts Error:", error);
        return [];
    }
};
// دالة حذف شات كامل من الهارد
export const deleteLocalChat = async (chatId) => {
    try {
        await db.messages.where('chatId').equals(chatId).delete();
        // اختياري: ممكن تمسح الكونتاكت كمان من جدول الـ contacts لو حابب
        await db.contacts.where('id').equals(chatId).delete();
    } catch (error) {
        console.error("Dexie Delete Error:", error);
    }
};