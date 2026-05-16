import { reducerCases } from "./constants";
import { db, getLocalMessages, saveMessagesToLocal } from "@/utils/LocalDatabase";

export const initialState = {
    userInfo: undefined,
    newUser: false,
    contactsPage: false,
    currentChatUser: undefined,
    messages: [],
    messagesCache: {}, // المخزن الجديد بتاعنا { "userId": [messages] }
    chatScrollPositions: {}, // مخزن جديد: { "userId": 1250 }
    socket: undefined,
    messagesSearch: false,
    userContacts: [],
    onlineUsers: [],
    filteredContacts: [],
    videoCall: undefined,
    voiceCall: undefined,
    incomingVoiceCall: undefined,
    incomingVideoCall: undefined,
    isTyping: false,
    chatId: undefined,
    imageViewer: null,
    messageToEdit: null,
    messageToReply: null,
    isSelectionMode: false,
    selectedMessages: [],
    contactFilter: "all", // "all", "unread", "groups"
    showUserInfo: false,
};

const reducer = (state, action) => {
    switch (action.type) {
        case reducerCases.SET_USER_INFO:
            return { ...state, userInfo: action.userInfo };
        case reducerCases.SET_NEW_USER:
            return { ...state, newUser: action.newUser };
        case reducerCases.SET_ALL_CONTACTS_PAGE:
            return { ...state, contactsPage: !state.contactsPage };
        case reducerCases.CHANGE_CURRENT_CHAT_USER:
            return { ...state, currentChatUser: action.user };
        case reducerCases.SET_MESSAGES: {
            const chatId = state.currentChatUser?.id;
            let finalMessages = action.messages;

            // لو ده تحديث جاي من الخلفية وإحنا معانا كاش
            if (action.isBackgroundUpdate && state.messagesCache[chatId]) {
                const cachedMsgs = [...state.messagesCache[chatId]];
                const freshMsgs = action.messages;

                // الدمج الذكي: بنأبديت حالات الرسايل اللي في الكاش باللي جايلنا فريش من السيرفر
                const freshMsgsMap = new Map(freshMsgs.map(msg => [msg.id, msg]));

                finalMessages = cachedMsgs.map(cachedMsg => {
                    if (freshMsgsMap.has(cachedMsg.id)) {
                        // لو الرسالة موجودة في الداتا الفريش، ناخد أحدث بياناتها (عشان العلامات الزرقاء)
                        return { ...cachedMsg, ...freshMsgsMap.get(cachedMsg.id) };
                    }
                    return cachedMsg;
                });

                // لو فيه رسايل جديدة خالص جاية من الـ API (أول مرة تنزل)
                const cachedIds = new Set(cachedMsgs.map(m => m.id));
                const completelyNewMsgs = freshMsgs.filter(m => !cachedIds.has(m.id));

                finalMessages = [...finalMessages, ...completelyNewMsgs];
            }

            return {
                ...state,
                messages: finalMessages,
                messagesCache: {
                    ...state.messagesCache,
                    [chatId]: finalMessages
                }
            };
        }
        case reducerCases.SET_SOCKET:
            return { ...state, socket: action.socket };
        case reducerCases.ADD_MESSAGE: {
            const updatedMessages = [...state.messages, action.newMessage];
            const chatId = state.currentChatUser?.id; // هنجيب الـ ID بتاع الشات الحالي
            
            db.messages.put(action.newMessage).catch(err => console.log("Dexie Add Error:", err));

            return { 
                ...state, 
                messages: updatedMessages,
                messagesCache: {
                    ...state.messagesCache,
                    [chatId]: updatedMessages // <--- تحديث الكاش عشان الرسالة متختفيش
                }
            };
        }
        case reducerCases.SET_MESSAGE_SEARCH:
            return { ...state, messagesSearch: !state.messagesSearch };
        case reducerCases.SET_USER_CONTACTS:
            return { ...state, userContacts: action.userContacts };
        case reducerCases.SET_ONLINE_USERS:
            return { ...state, onlineUsers: action.onlineUsers };
        case reducerCases.SET_CONTACT_FILTER:
            return { ...state, contactFilter: action.contactFilter };
        case reducerCases.SET_CONTACT_SEARCH:
            const filteredContacts = state.userContacts.filter((contact) =>
                contact.name.toLowerCase().includes(action.contactSearch.toLowerCase())
            );
            return { ...state, contactSearch: action.contactSearch, filteredContacts };
        case reducerCases.SET_SCROLL_POSITION:
            return {
                ...state,
                chatScrollPositions: {
                    ...state.chatScrollPositions,
                    [action.chatId]: action.scrollPosition
                }
            };
        case reducerCases.SET_VIDEO_CALL:
            return { ...state, videoCall: action.videoCall };
        case reducerCases.SET_VOICE_CALL:
            return { ...state, voiceCall: action.voiceCall };
        case reducerCases.SET_INCOMING_VOICE_CALL:
            return { ...state, incomingVoiceCall: action.incomingVoiceCall };
        case reducerCases.SET_INCOMING_VIDEO_CALL:
            return { ...state, incomingVideoCall: action.incomingVideoCall };
        case reducerCases.END_CALL:
            return { ...state, voiceCall: undefined, videoCall: undefined, incomingVideoCall: undefined, incomingVoiceCall: undefined };
        case reducerCases.SET_EXIT_CHAT:
            return { ...initialState };
        case reducerCases.SET_IS_TYPING:
            return { ...state, isTyping: { typingInfo: action.isTyping } };
        case reducerCases.SET_IMAGE_VIEWER:
            return { ...state, imageViewer: action.imageViewer };
        case reducerCases.UPDATE_UNREAD_MESSAGES: {
            const updateUsersStatus = state.userContacts.map((user) => {
                if (action.userId === user.id) {
                    let newStatus = user.messageStatus;
                    if (action.markAsReadByOther) {
                        if (user.senderId === state.userInfo?.id) newStatus = "read";
                    } else {
                        if (user.senderId !== state.userInfo?.id) newStatus = "read";
                    }
                    return { 
                        ...user, 
                        messageStatus: newStatus,
                        totalUnreadMessages: action.markAsReadByOther ? user.totalUnreadMessages : 0 
                    };
                }
                return user;
            });

            let updateUnreadMessages = state.messages;
            let updatedMessagesCache = { ...state.messagesCache }; // تجهيز الكاش للتحديث

            if (state.currentChatUser?.id === action.userId) {
                updateUnreadMessages = state.messages.map((message) => {
                    if (!action.markAsReadByOther && message.senderId === action.userId) {
                        return { ...message, messageStatus: "read" };
                    }
                    if (action.markAsReadByOther && message.senderId === state.userInfo?.id) {
                        return { ...message, messageStatus: "read" };
                    }
                    return message;
                });
                // تحديث الكاش للروم المفتوحة حالياً
                updatedMessagesCache[action.userId] = updateUnreadMessages;
            } else {
                // عبقرية إضافية: لو اليوزر التاني شاف رسالتي وأنا مش فاتح الشات بتاعه، نحدث الكاش بتاعه في الخلفية!
                if (updatedMessagesCache[action.userId]) {
                    updatedMessagesCache[action.userId] = updatedMessagesCache[action.userId].map((message) => {
                        if (action.markAsReadByOther && message.senderId === state.userInfo?.id) {
                            return { ...message, messageStatus: "read" };
                        }
                        return message;
                    });
                }
            }

            return { 
                ...state, 
                messages: updateUnreadMessages, 
                userContacts: updateUsersStatus,
                messagesCache: updatedMessagesCache 
            };
        }
        case reducerCases.SET_GROUP_MESSAGE_READ: {
            const newMessages = state.messages.map((msg) => {
                if (msg.id === action.messageId) {
                // بنزود الـ count أو بنحول الحالة لـ read
                return { 
                    ...msg, 
                    messageStatus: "read", // عشان الـ MessageStatus ترسم العلامة الزرقاء
                    _count: { seenBy: state.currentChatUser.userIds.length - 1 } 
                };
                }
                return msg;
            });
            return { ...state, messages: newMessages };
        }
        case reducerCases.ADD_OLDER_MESSAGES: {
            const updatedMessages = [...action.messages, ...state.messages];
            return {
                ...state,
                messages: updatedMessages,
                messagesCache: {
                    ...state.messagesCache,
                    [action.chatId]: updatedMessages // تحديث الكاش بالرسايل القديمة والجديدة سوا
                }
            };
        }
        case reducerCases.UPDATE_MESSAGES_TO_DELIVERED: {
            const updatedMessages = state.messages.map(msg => 
                msg.messageStatus === "sent" ? { ...msg, messageStatus: "delivered" } : msg
            );
            
            const updatedContacts = state.userContacts.map(contact => {
                if (contact.id === action.toUserId && contact.messageStatus === "sent") {
                    const updatedContact = { ...contact, messageStatus: "delivered" };
                    db.contacts.put(updatedContact).catch(err => console.log(err));
                    return updatedContact;
                }
                return contact;
            });

            return { 
                ...state, 
                messages: updatedMessages,
                userContacts: updatedContacts
            };
        }
        case reducerCases.SET_CHAT_ID:
            return { ...state, chatId: action.chatId };

        case reducerCases.UPDATE_CONTACT_MESSAGE_LOCALLY: {
            const { messageData, isUnread } = action;
            const targetUserId = messageData.senderId === state.userInfo?.id 
                ? messageData.receiverId 
                : messageData.senderId;

            let contactList = [...state.userContacts];
            const contactIndex = contactList.findIndex((c) => c.id === targetUserId);

            if (contactIndex !== -1) {
                let contact = { ...contactList[contactIndex] };
                
                contact.message = messageData.type === "text" 
                    ? messageData.message 
                    : (messageData.type === "image" ? "📷 Image" : "🎤 Audio");
                
                contact.messageStatus = messageData.messageStatus;

                // --- السطور دي هي اللي هتحل مشكلة العكس ---
                contact.senderId = messageData.senderId;
                contact.receiverId = messageData.receiverId;
                contact.createdAt = messageData.createdAt; // تحديث الوقت بالمرة عشان القائمة تترتب صح
                // -------------------------------------------
                contact.lastMessageTime = messageData.createdAt;

                if (isUnread) {
                    contact.totalUnreadMessages += 1;
                } else {
                    contact.totalUnreadMessages = 0;
                }

                contactList.splice(contactIndex, 1);
                contactList.unshift(contact); // عشان يرفع الشات ده لأول القائمة فوق
                
                
                import('@/utils/LocalDatabase').then(({ db }) => {
                    db.contacts.put(contact).catch(err => console.log("Dexie update contact error:", err));
                });            }

            return { ...state, userContacts: contactList };
        }
        
        case reducerCases.REPLACE_TEMP_MESSAGE: {
            const chatId = state.currentChatUser?.id;
            const updatedMessages = state.messages.map((msg) =>
                msg.id === action.tempId ? action.realMessage : msg
            );
            
            // عشان الهارد يبقى نضيف
            import('@/utils/LocalDatabase').then(({ db }) => {
                db.messages.delete(action.tempId); 
                db.messages.put(action.realMessage); 
            });

            return { 
                ...state, 
                messages: updatedMessages,
                messagesCache: {
                    ...state.messagesCache,
                    [chatId]: updatedMessages // <--- تحديث الكاش هنا كمان
                }
            };
        }
        case reducerCases.UPDATE_CONTACT_MESSAGE_LOCALLY: {
            const { messageData, isUnread } = action;
            const targetUserId = messageData.senderId === state.userInfo?.id 
                ? messageData.receiverId 
                : messageData.senderId;

            let contactList = [...state.userContacts];
            const contactIndex = contactList.findIndex((c) => c.id === targetUserId);
            if (contactIndex !== -1) {
                let contact = { ...contactList[contactIndex] };
                
                contact.message = messageData.type === "text" 
                    ? messageData.message 
                    : (messageData.type === "image" ? "📷 Image" : "🎤 Audio");
                
                contact.messageStatus = messageData.messageStatus;
                contact.senderId = messageData.senderId;
                contact.receiverId = messageData.receiverId;
                contact.createdAt = messageData.createdAt;
                contact.lastMessageTime = messageData.createdAt; // عشان الترتيب في Dexie

                if (isUnread) {
                    contact.totalUnreadMessages += 1;
                } else {
                    contact.totalUnreadMessages = 0;
                }
                contactList.splice(contactIndex, 1);
                contactList.unshift(contact);
                // حفظ في Dexie في الخلفية
                import('@/utils/LocalDatabase').then(({ db }) => {
                    db.contacts.put(contact).catch(err => console.log("Dexie update contact error:", err));
                });
            }

            return { ...state, userContacts: contactList };
        }
        case reducerCases.SET_USER_OFFLINE: {
            // 1. تحديث اليوزر لو هو اللي مفتوح معاه الشات حالياً (عشان الهيدر ينطق صح)
            let chatUser = state.currentChatUser;
            if (chatUser && chatUser.id === action.userId) {
                chatUser = { ...chatUser, lastSeen: action.lastSeen };
            }

            // 2. تحديث اليوزر جوه قائمة جهات الاتصال (عشان السايدبار يتحدث لايف)
            const newUserContacts = state.userContacts.map((contact) => {
                if (contact.id === action.userId) {
                    return { ...contact, lastSeen: action.lastSeen };
                }
                return contact;
            });

            // 3. تحديث قائمة الـ Online (لو حابب تشيله منها فوراً)
            const newOnlineUsers = state.onlineUsers.filter(id => id !== action.userId);

            return { 
                ...state, 
                currentChatUser: chatUser,
                userContacts: newUserContacts,
                onlineUsers: newOnlineUsers
            };
        }
        case reducerCases.SET_MESSAGE_TO_EDIT:
            return { ...state, messageToEdit: action.messageToEdit };
        case reducerCases.SET_MESSAGE_TO_REPLY:
            return { ...state, messageToReply: action.messageToReply };
        case reducerCases.EDIT_MESSAGE_LOCALLY: {
            // تحديث الرسالة محلياً في الشاشة بعد ما تتعدل
            const updatedMessages = state.messages.map((msg) =>
                msg.id === action.payload.id ? { ...msg, message: action.payload.message, isEdited: true } : msg
            );
            return { ...state, messages: updatedMessages };
        }
        case reducerCases.DELETE_MESSAGE_LOCALLY: {
            if (action.payload.type === "me") {
                // لو مسحها من عنده بس، نشيلها خالص من الـ Array بتاع الشاشة
                return { ...state, messages: state.messages.filter(msg => msg.id !== action.payload.id) };
            } else {
                // لو مسحها للكل، نغير شكلها للرسالة المحذوفة
                const updatedMessages = state.messages.map((msg) =>
                    msg.id === action.payload.id ? { ...msg, isDeleted: true, message: "This message was deleted" } : msg
                );
                return { ...state, messages: updatedMessages };
            }
        }
        // 🟢 حالات نظام التحديد (Selection)
        case reducerCases.SET_MESSAGE_SELECTION_MODE:
            return { ...state, isSelectionMode: action.isSelectionMode, selectedMessages: [] };
            
        case reducerCases.TOGGLE_MESSAGE_SELECTION:
            const isAlreadySelected = state.selectedMessages.includes(action.messageId);
            return {
                ...state,
                selectedMessages: isAlreadySelected
                    ? state.selectedMessages.filter(id => id !== action.messageId) // لو متحددة شيلها
                    : [...state.selectedMessages, action.messageId] // لو مش متحددة ضيفها
            };
            
        case reducerCases.CLEAR_MESSAGE_SELECTION:
            return { ...state, isSelectionMode: false, selectedMessages: [] };
        case reducerCases.ADD_NEW_GROUP_TO_CONTACTS:
            return {
                ...state,
                // بنجيب الكونتاكتس الحالية ونحط الجروب الجديد فوقهم
                userContacts: [action.newGroup, ...state.userContacts]
            };
        case reducerCases.UPDATE_GROUP_IN_CONTACTS: {
            const { group } = action;
            // بنحدث الجروب في قائمة الاتصالات الجانبية عشان لو اسمه اتغير أو اتقفل
            const updatedContacts = state.userContacts.map((contact) =>
                contact.id === group.id ? { ...contact, ...group } : contact
            );
            return {
                ...state,
                userContacts: updatedContacts,
            }}

        case reducerCases.DELETE_CHAT: {
            // 1. تنظيف الرسايل من الرام
            const newMessagesCache = { ...state.messagesCache };
            delete newMessagesCache[action.chatId];

            // 2. إزالة الشات من قائمة الـ Contacts الجانبية
            const newUserContacts = state.userContacts.filter(
                (contact) => contact.id !== action.chatId
            );

            return {
                ...state,
                messages: [], // فضي الشاشة الحالية
                messagesCache: newMessagesCache,
                userContacts: newUserContacts,
                currentChatUser: undefined, // ارجع لصفحة Empty
            };
        }
        case reducerCases.EXIT_GROUP: {
            // نفس منطق الـ Delete تقريباً بس للجروب
            const newUserContacts = state.userContacts.filter(
                (contact) => contact.id !== action.groupId
            );
            return {
                ...state,
                currentChatUser: undefined,
                userContacts: newUserContacts,
            };
        }
        case reducerCases.SET_SHOW_USER_INFO:
            return { ...state, showUserInfo: !state.showUserInfo };
            
        default:
            return state;
    }
};

export default reducer;