import Dexie from "dexie";

export const db = new Dexie("ChatAppDB");

db.version(1).stores({
  messages: "id, chatId, senderId, createdAt",
  contacts: "id, name, lastMessageTime",
});

export const saveMessagesToLocal = async (messages, chatId) => {
  try {
    const messagesWithChatId = messages.map((msg) => ({
      ...msg,
      chatId: chatId,
    }));
    await db.messages.bulkPut(messagesWithChatId);
  } catch (error) {
    console.error("Dexie Save Messages Error:", error);
  }
};

export const getLocalMessages = async (chatId) => {
  return await db.messages.where("chatId").equals(chatId).sortBy("createdAt");
};

export const saveContactsToLocal = async (contacts) => {
  try {
    const contactsWithTime = contacts.map((c) => ({
      ...c,
      lastMessageTime: c.createdAt || new Date().toISOString(),
    }));
    await db.contacts.bulkPut(contactsWithTime);
  } catch (error) {
    console.error("Dexie Save Contacts Error:", error);
  }
};

export const getLocalContacts = async () => {
  try {
    return await db.contacts.orderBy("lastMessageTime").reverse().toArray();
  } catch (error) {
    console.error("Dexie Get Contacts Error:", error);
    return [];
  }
};
export const deleteLocalChat = async (chatId) => {
  try {
    await db.messages.where("chatId").equals(chatId).delete();
    await db.contacts.where("id").equals(chatId).delete();
  } catch (error) {
    console.error("Dexie Delete Error:", error);
  }
};
