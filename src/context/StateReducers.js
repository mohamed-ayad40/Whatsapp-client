import { reducerCases } from "./constants";
import { db } from "@/utils/LocalDatabase";

export const initialState = {
    userInfo: undefined,
    newUser: false,
    contactsPage: false,
    currentChatUser: undefined,
    messages: [],
    messagesCache: {}, 
    chatScrollPositions: {}, 
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
    contactFilter: "all", 
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
            return { 
                ...state, 
                currentChatUser: action.user,
                showUserInfo: false,
                messagesSearch: false
            };
        case reducerCases.SET_MESSAGES: {
            const chatId = state.currentChatUser?.id;
            let finalMessages = [...action.messages]; 

            if (action.isBackgroundUpdate && state.messagesCache[chatId]) {
                const cachedMsgs = [...state.messagesCache[chatId]];
                const freshMsgsMap = new Map(finalMessages.map(msg => [msg.id, msg]));

                finalMessages = cachedMsgs.map(cachedMsg => {
                    if (freshMsgsMap.has(cachedMsg.id)) {
                        return { ...cachedMsg, ...freshMsgsMap.get(cachedMsg.id) };
                    }
                    return cachedMsg;
                });

                const cachedIds = new Set(cachedMsgs.map(m => m.id));
                const completelyNewMsgs = [...action.messages].filter(m => !cachedIds.has(m.id));
                finalMessages = [...finalMessages, ...completelyNewMsgs];
            }

            return {
                ...state,
                messages: finalMessages,
                messagesCache: { ...state.messagesCache, [chatId]: finalMessages }
            };
        }
        case reducerCases.SET_SOCKET:
            return { ...state, socket: action.socket };
        case reducerCases.ADD_MESSAGE: {
            const updatedMessages = [...state.messages, action.newMessage];
            const chatId = state.currentChatUser?.id; 
            db.messages.put(action.newMessage).catch(err => console.log("Dexie Add Error:", err));

            return { 
                ...state, 
                messages: updatedMessages,
                messagesCache: { ...state.messagesCache, [chatId]: updatedMessages }
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
                chatScrollPositions: { ...state.chatScrollPositions, [action.chatId]: action.scrollPosition }
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
            return { ...state, voiceCall: undefined, videoCall: undefined, incomingVoiceCall: undefined, incomingVoiceCall: undefined };
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
                    
                    const updatedUser = { 
                        ...user, 
                        messageStatus: newStatus,
                        totalUnreadMessages: action.markAsReadByOther ? user.totalUnreadMessages : 0 
                    };
                    // 🚨 حفظ تحديث الشات الفردي للكونتاكت في Dexie
                    import('@/utils/LocalDatabase').then(({ db }) => db.contacts.put(updatedUser).catch(e => console.log(e)));
                    
                    return updatedUser;
                }
                return user;
            });

            let updateUnreadMessages = state.messages;
            let updatedMessagesCache = { ...state.messagesCache }; 

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
                updatedMessagesCache[action.userId] = updateUnreadMessages;
            } else {
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
        
        // 🚨 تحديث عداد الجروبات لايف بره وجوه
        case "UPDATE_GROUP_MESSAGE_SEEN_COUNT": {
            const newMessages = state.messages.map((msg) => {
                if (msg.id === action.payload.messageId) {
                    const updatedMsg = { ...msg, _count: { ...msg._count, seenBy: action.payload.seenCount } };
                    import('@/utils/LocalDatabase').then(({ db }) => db.messages.put(updatedMsg).catch(e => console.log(e)));
                    return updatedMsg;
                }
                return msg;
            });
            const newUserContacts = state.userContacts.map(contact => {
                if (contact.id === action.payload.groupId) {
                    const updatedContact = { ...contact, seenCount: action.payload.seenCount };
                    // 🚨 حفظ تحديث عداد المشاهدات للكونتاكت في Dexie
                    import('@/utils/LocalDatabase').then(({ db }) => db.contacts.put(updatedContact).catch(e => console.log(e)));
                    return updatedContact;
                }
                return contact;
            });
            return { 
                ...state, 
                messages: newMessages,
                userContacts: newUserContacts,
                messagesCache: { ...state.messagesCache, [state.currentChatUser?.id]: newMessages }
            };
        }

        case reducerCases.SET_GROUP_MESSAGE_READ: {
            const newMessages = state.messages.map((msg) => {
                if (msg.id === action.messageId) {
                    const membersCount = state.currentChatUser?.userIds?.length || state.currentChatUser?.users?.length || 2;
                    const updatedMsg = { ...msg, messageStatus: "read", _count: { seenBy: membersCount - 1 } };
                    import('@/utils/LocalDatabase').then(({ db }) => db.messages.put(updatedMsg).catch(e => console.log(e)));
                    return updatedMsg;
                }
                return msg;
            });
            const newUserContacts = state.userContacts.map(contact => {
                if (contact.id === action.groupId || contact.id === state.currentChatUser?.id) {
                    const updatedContact = { ...contact, messageStatus: "read", seenCount: (contact.userIds?.length || contact.users?.length || 2) - 1 };
                    // 🚨 حفظ العلامة الزرقاء للكونتاكت في Dexie
                    import('@/utils/LocalDatabase').then(({ db }) => db.contacts.put(updatedContact).catch(e => console.log(e)));
                    return updatedContact;
                }
                return contact;
            });
            return { 
                ...state, 
                messages: newMessages, 
                userContacts: newUserContacts,
                messagesCache: { ...state.messagesCache, [state.currentChatUser?.id]: newMessages } 
            };
        }

        // 🚨 دبل صح رمادي للجروبات
        case "UPDATE_GROUP_MESSAGE_DELIVERED": {
            const newMessages = state.messages.map(msg => {
                if (msg.id === action.payload.messageId) {
                    const updatedMsg = { ...msg, messageStatus: "delivered" };
                    import('@/utils/LocalDatabase').then(({ db }) => db.messages.put(updatedMsg).catch(e => console.log(e)));
                    return updatedMsg;
                }
                return msg;
            });
            const newUserContacts = state.userContacts.map(contact => {
                if (contact.id === action.payload.groupId && contact.messageStatus === "sent") {
                    const updatedContact = { ...contact, messageStatus: "delivered" };
                    // 🚨 حفظ الدبل صح رمادي للكونتاكت في Dexie
                    import('@/utils/LocalDatabase').then(({ db }) => db.contacts.put(updatedContact).catch(e => console.log(e)));
                    return updatedContact;
                }
                return contact;
            });
            return {
                ...state,
                messages: newMessages,
                userContacts: newUserContacts,
                messagesCache: { ...state.messagesCache, [state.currentChatUser?.id]: newMessages }
            };
        }

        case reducerCases.ADD_OLDER_MESSAGES: {
            const updatedMessages = [...action.messages, ...state.messages];
            return {
                ...state,
                messages: updatedMessages,
                messagesCache: { ...state.messagesCache, [action.chatId]: updatedMessages }
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
            const targetUserId = messageData.groupId || 
                (messageData.senderId === state.userInfo?.id ? messageData.receiverId : messageData.senderId);

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
                contact.lastMessageTime = messageData.createdAt;

                // 🚨 السطر ده بيمنع توريث العلامة الزرقاء للرسالة الجديدة
                contact.seenCount = 0; 

                if (isUnread && messageData.senderId !== state.userInfo?.id) {
                    contact.totalUnreadMessages = (contact.totalUnreadMessages || 0) + 1;
                } else if (!isUnread) {
                    contact.totalUnreadMessages = 0;
                }

                contactList.splice(contactIndex, 1);
                contactList.unshift(contact); 
                
                import('@/utils/LocalDatabase').then(({ db }) => {
                    db.contacts.put(contact).catch(err => console.log("Dexie update error:", err));
                });            
            }
            return { ...state, userContacts: contactList };
        }
        
        case reducerCases.REPLACE_TEMP_MESSAGE: {
            const chatId = state.currentChatUser?.id;
            const updatedMessages = state.messages.map((msg) =>
                msg.id === action.tempId ? action.realMessage : msg
            );
            
            import('@/utils/LocalDatabase').then(({ db }) => {
                db.messages.delete(action.tempId); 
                db.messages.put(action.realMessage); 
            });

            return { 
                ...state, 
                messages: updatedMessages,
                messagesCache: { ...state.messagesCache, [chatId]: updatedMessages }
            };
        }
        case reducerCases.SET_USER_OFFLINE: {
            let chatUser = state.currentChatUser;
            if (chatUser && chatUser.id === action.userId) {
                chatUser = { ...chatUser, lastSeen: action.lastSeen };
            }

            const newUserContacts = state.userContacts.map((contact) => {
                if (contact.id === action.userId) {
                    return { ...contact, lastSeen: action.lastSeen };
                }
                return contact;
            });

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
            const updatedMessages = state.messages.map((msg) =>
                msg.id === action.payload.id ? { ...msg, message: action.payload.message, isEdited: true } : msg
            );
            return { ...state, messages: updatedMessages };
        }
        case reducerCases.DELETE_MESSAGE_LOCALLY: {
            if (action.payload.type === "me") {
                return { ...state, messages: state.messages.filter(msg => msg.id !== action.payload.id) };
            } else {
                const updatedMessages = state.messages.map((msg) =>
                    msg.id === action.payload.id ? { ...msg, isDeleted: true, message: "This message was deleted" } : msg
                );
                return { ...state, messages: updatedMessages };
            }
        }
        case reducerCases.SET_MESSAGE_SELECTION_MODE:
            return { ...state, isSelectionMode: action.isSelectionMode, selectedMessages: [] };
            
        case reducerCases.TOGGLE_MESSAGE_SELECTION:
            const isAlreadySelected = state.selectedMessages.includes(action.messageId);
            return {
                ...state,
                selectedMessages: isAlreadySelected
                    ? state.selectedMessages.filter(id => id !== action.messageId)
                    : [...state.selectedMessages, action.messageId]
            };
            
        case reducerCases.CLEAR_MESSAGE_SELECTION:
            return { ...state, isSelectionMode: false, selectedMessages: [] };
        case reducerCases.ADD_NEW_GROUP_TO_CONTACTS:
            return {
                ...state,
                userContacts: [action.newGroup, ...state.userContacts]
            };
        case reducerCases.UPDATE_GROUP_IN_CONTACTS: {
            const { group } = action;
            const updatedContacts = state.userContacts.map((contact) =>
                contact.id === group.id ? { ...contact, ...group } : contact
            );
            return { ...state, userContacts: updatedContacts };
        }

        case reducerCases.DELETE_CHAT: {
            const newMessagesCache = { ...state.messagesCache };
            delete newMessagesCache[action.chatId];

            const newUserContacts = state.userContacts.filter((contact) => contact.id !== action.chatId);

            return {
                ...state,
                messages: [], 
                messagesCache: newMessagesCache,
                userContacts: newUserContacts,
                currentChatUser: undefined, 
            };
        }
        case reducerCases.EXIT_GROUP: {
            const newUserContacts = state.userContacts.filter((contact) => contact.id !== action.groupId);
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