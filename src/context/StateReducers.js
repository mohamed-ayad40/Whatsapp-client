import { reducerCases } from "./constants";

export const initialState = {
    userInfo: undefined,
    newUser: false,
    contactsPage: false,
    currentChatUser: undefined,
    messages: [],
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
        case reducerCases.SET_MESSAGES:
            return { ...state, messages: action.messages };
        case reducerCases.SET_SOCKET:
            return { ...state, socket: action.socket };
        case reducerCases.ADD_MESSAGE:
            return { ...state, messages: [...state.messages, action.newMessage] };
        case reducerCases.SET_MESSAGE_SEARCH:
            return { ...state, messagesSearch: !state.messagesSearch };
        case reducerCases.SET_USER_CONTACTS:
            return { ...state, userContacts: action.userContacts };
        case reducerCases.SET_ONLINE_USERS:
            return { ...state, onlineUsers: action.onlineUsers };
        case reducerCases.SET_CONTACT_SEARCH:
            const filteredContacts = state.userContacts.filter((contact) =>
                contact.name.toLowerCase().includes(action.contactSearch.toLowerCase())
            );
            return { ...state, contactSearch: action.contactSearch, filteredContacts };
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
            return { ...state, currentChatUser: undefined };
        case reducerCases.SET_IS_TYPING:
            return { ...state, isTyping: { typingInfo: action.isTyping } };
        case reducerCases.SET_IMAGE_VIEWER:
            return { ...state, imageViewer: action.imageViewer };
        case reducerCases.UPDATE_UNREAD_MESSAGES: {
            const updateUsersStatus = state.userContacts.map((user) => {
                if (action.userId === user.id) {
                    let newStatus = user.messageStatus;
                    
                    // الذكاء هنا: مين اللي شاف الرسالة؟
                    if (action.markAsReadByOther) {
                        // لو الطرف التاني هو اللي فتح الشات: خلي رسالتي (اللي هي آخر رسالة) في القائمة زرقا
                        if (user.senderId === state.userInfo?.id) {
                            newStatus = "read";
                        }
                    } else {
                        // لو أنا اللي فتحت الشات: خلي رسالته هو مقروءة، بس إياك تزرق رسايلي أنا!
                        if (user.senderId !== state.userInfo?.id) {
                            newStatus = "read";
                        }
                    }

                    return { 
                        ...user, 
                        messageStatus: newStatus,
                        totalUnreadMessages: action.markAsReadByOther ? user.totalUnreadMessages : 0 
                    };
                }
                return user;
            });
            // ... (سيب باقي الكود بتاع case دي زي ما هو من غير تعديل)
            
            let updateUnreadMessages = state.messages;
            if (state.currentChatUser?.id === action.userId) {
                updateUnreadMessages = state.messages.map((message) => {
                    // لو أنا اللي فتحت الشات: خلي رسايله هو بس اللي تتقري
                    if (!action.markAsReadByOther && message.senderId === action.userId) {
                        return { ...message, messageStatus: "read" };
                    }
                    // لو جالي إشعار من السوكيت إن هو اللي فتح الشات: خلي رسايلي أنا اللي تزرق
                    if (action.markAsReadByOther && message.senderId === state.userInfo?.id) {
                        return { ...message, messageStatus: "read" };
                    }
                    // غير كده، سيب الرسالة بحالتها الطبيعية
                    return message;
                });
            }

            return { ...state, messages: updateUnreadMessages, userContacts: updateUsersStatus };
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

                if (isUnread) {
                    contact.totalUnreadMessages += 1;
                } else {
                    contact.totalUnreadMessages = 0;
                }

                contactList.splice(contactIndex, 1);
                contactList.unshift(contact); // عشان يرفع الشات ده لأول القائمة فوق
            }

            return { ...state, userContacts: contactList };
        }
        
        case reducerCases.REPLACE_TEMP_MESSAGE: {
            const updatedMessages = state.messages.map((msg) =>
                // لو لقينا الرسالة الوهمية، بنبدلها بالرسالة الحقيقية اللي رجعت من السيرفر
                msg.id === action.tempId ? action.realMessage : msg
            );
            return { ...state, messages: updatedMessages };
        }
        
        case reducerCases.SET_USER_OFFLINE: {
            let chatUser = state.currentChatUser;
            if (chatUser && chatUser.id === action.userId) {
                chatUser = { ...chatUser, lastSeen: action.lastSeen };
            }
            return { ...state, currentChatUser: chatUser };
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
        default:
            return state;
    }
};

export default reducer;