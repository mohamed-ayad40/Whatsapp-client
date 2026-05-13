import React, { useEffect, useRef, useState } from "react";
import ChatList from "./Chatlist/ChatList";
import Empty from "./Empty";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/utils/FirebaseConfig";
import axios from "axios";
import { CHECK_USER_ROUTE, GET_INITIAL_CONTACTS_ROUTE, GET_MESSAGES_ROUTE, HOST } from "@/utils/ApiRoutes";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import Chat from "./Chat/Chat";
import { io } from "socket.io-client";
import SearchMessages from "./Chat/SearchMessages";
import VideoCall from "./Call/VideoCall";
import VoiceCall from "./Call/VoiceCall";
import IncomingVideoCall from "./common/IncomingVideoCall";
import IncomingCall from "./common/IncomingCall";
import ImageViewer from "./common/ImageViewer";
import { decryptGroupKeyForMe, decryptText, getSharedSecretKey } from "@/utils/Crypto";
import GroupInfo from "@/components/Chat/GroupInfo";
import Settings from "./Settings/Settings";
import { db, getLocalMessages, saveMessagesToLocal, getLocalContacts, saveContactsToLocal } from "@/utils/LocalDatabase";
import UserInfo from "./Chat/UserInfo";

function Main() {
  const router = useRouter();
  const [{userInfo, currentChatUser, messagesSearch, messages, videoCall, voiceCall, incomingVoiceCall, incomingVideoCall, userContacts, messagesCache, showUserInfo}, dispatch] = useStateProvider();
  const [redirectLogin, setRedirectLogin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); 
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const socket = useRef();
  const currentChatUserRef = useRef();

  // طلب صلاحية الإشعارات من المتصفح أول ما الأبلكيشن يفتح
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    currentChatUserRef.current = currentChatUser;
  }, [currentChatUser]);

  useEffect(() => {
    if(redirectLogin) router.push("/login");
  }, [redirectLogin]);

  // 1. الـ Interceptor: بيشتغل مع كل Axios request أوتوماتيك
// 2. Axios Interceptor (لتحسين الأداء: شيلنا الـ await لو التوكن موجود)
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config) => {
        const currentUser = firebaseAuth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken(); 
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if(!currentUser) {
        setRedirectLogin(true);
        setInitialLoading(false);
        return;
      }
      if(!userInfo && currentUser?.email) {
        try {
          // الـ Interceptor اللي فوق هو اللي هيهندل الـ Authorization Header هنا لوحده
          const {data} = await axios.post(CHECK_USER_ROUTE, {email: currentUser.email});
          
          if(!data.status) {
            router.push("/login");
            setInitialLoading(false);
            return;
          }

          if(data?.data) {
            const {id, name, email, profilePicture: profileImage, about} = data.data;
            
            // --- [تأمين] فك تشفير الـ About الشخصي (كودك الأصلي) ---
            let decryptedAbout = about;
            try {
              if (about && about.includes(":")) { 
                decryptedAbout = decryptText(about, id);
              }
            } catch (e) {
              console.log("About was not encrypted or error in decryption");
              decryptedAbout = about;
            }
            // -----------------------------------------------------

            dispatch({ 
              type: reducerCases.SET_USER_INFO, 
              userInfo: { id, name, email, profileImage, status: decryptedAbout } 
            });
          }
        } catch (err) {
          console.log("Auth error:", err);
          setInitialLoading(false);
        }
      } 
    });
  }, [userInfo]); // ضفنا userInfo هنا كـ dependency عشان الـ loop يظبط

  useEffect(() => {
    const getInitialData = async () => {
      try {
        if (userInfo?.id) {
          // 1. أولاً: اسحب من Dexie (الهارد) فوراً عشان السرعة اللحظية
          const localContacts = await getLocalContacts();
          if (localContacts.length > 0) {
            dispatch({ type: reducerCases.SET_USER_CONTACTS, userContacts: localContacts });
            setInitialLoading(false); 
          }

          // 2. ثانياً: ريكويست السيرفر عشان تجيب الداتا الفريش في الخلفية
          const { data: { users, onlineUsers } } = await axios.get(`${GET_INITIAL_CONTACTS_ROUTE}/${userInfo.id}`);
          
          const myPrivateKey = localStorage.getItem("privateKey");

          // استخدام Promise.all لفك التشفير
          const decryptedUsers = await Promise.all(users.map(async (user) => {
            let sharedKey = null;

            if (user.isGroup) {
              sharedKey = localStorage.getItem(`group-key-${user.id}`);
              if (!sharedKey && user.encryptedKey && myPrivateKey) {
                sharedKey = await decryptGroupKeyForMe(user.encryptedKey, myPrivateKey);
                if (sharedKey) {
                  localStorage.setItem(`group-key-${user.id}`, sharedKey);
                }
              }
            } else {
              sharedKey = getSharedSecretKey(userInfo.id, user.id);
            }

            // فك تشفير آخر رسالة للعرض في السايدبار
            if (user.type === "text" && sharedKey && user.message) {
              try {
                user.message = decryptText(user.message, sharedKey);
              } catch(e) {
                console.log("Error decrypting sidebar message");
              }
            }
            return user;
          }));

          // 3. ثالثاً: حفظ النسخة المفكوكة والجديدة في Dexie للمرة الجاية
          await saveContactsToLocal(decryptedUsers);

          dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers });
          dispatch({ type: reducerCases.SET_USER_CONTACTS, userContacts: decryptedUsers });
          setInitialLoading(false); 
        }
      } catch (e) {
        console.log("Error fetching contacts:", e);
        setInitialLoading(false);
      }
    };

    if (userInfo) getInitialData();
  }, [userInfo]);

  useEffect(() => {
    // نتأكد إن السوكيت شغال، وإن عندنا جهات اتصال (ممكن يكون فيها جروبات)
    if (socket.current && userContacts && userContacts.length > 0) {
      userContacts.forEach((contact) => {
        // لو الـ contact ده جروب، اليوزر هيـ join الروم بتاعته
        if (contact.isGroup) {
          socket.current.emit("join-chat", { userId: userInfo.id, chatId: contact.id });
        }
      });
    }
  }, [userContacts]); // هيشتغل كل ما قائمة الـ Contacts تتحدث

  useEffect(() => {
    if(userInfo && !socket.current) {
      socket.current = io(HOST, {
        addTrailingSlash: false,
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 5,
      });

      socket.current.on("connect", () => {
        socket.current.emit("add-user", userInfo.id);
      });

      dispatch({ type: reducerCases.SET_SOCKET, socket });

      socket.current.on("msg-receive", (data) => {
        // --- [تعديل التشفير اللحظي] ---
        const isGroup = !!data.message.groupId;
        const chatKey = isGroup 
            ? localStorage.getItem(`group-key-${data.message.groupId}`)
            : getSharedSecretKey(userInfo.id, data.from);

        const decryptedMessage = { ...data.message };
        if (decryptedMessage.type === "text") {
            decryptedMessage.message = decryptText(decryptedMessage.message, chatKey);
            if (decryptedMessage.replyTo && decryptedMessage.replyTo.type === "text") {
                decryptedMessage.replyTo.message = decryptText(decryptedMessage.replyTo.message, chatKey);
            }
        }
        // ------------------------------

        if (currentChatUserRef.current?.id === (isGroup ? data.message.groupId : data.from)) {
          dispatch({ type: reducerCases.ADD_MESSAGE, newMessage: decryptedMessage });
          socket.current.emit("msg-seen", { to: data.from, from: userInfo.id });
          dispatch({ type: reducerCases.UPDATE_UNREAD_MESSAGES, userId: data.from });
        }
      });
      
      socket.current.on("refresh-seen", (data) => {
        const reader = data?.readerId || currentChatUserRef.current?.id;
        if (reader) {
            dispatch({ 
              type: reducerCases.UPDATE_UNREAD_MESSAGES, 
              userId: reader,
              markAsReadByOther: true 
            });
        }
      });

      // استقبال تعديل الرسالة
      socket.current.on("message-edited", (updatedMessage) => {
        const isGroup = !!updatedMessage.groupId;
        const chatKey = isGroup 
            ? localStorage.getItem(`group-key-${updatedMessage.groupId}`)
            : getSharedSecretKey(userInfo.id, updatedMessage.senderId);

        const finalMessage = updatedMessage.type === "text" 
            ? decryptText(updatedMessage.message, chatKey) 
            : updatedMessage.message;
        
        dispatch({ 
            type: reducerCases.EDIT_MESSAGE_LOCALLY, 
            payload: { id: updatedMessage.id, message: finalMessage } 
        });
      });

      // استقبال حذف الرسالة
      socket.current.on("message-deleted", (deletedMessage) => {
          dispatch({ 
              type: reducerCases.DELETE_MESSAGE_LOCALLY, 
              payload: { id: deletedMessage.id, type: "everyone" } 
          });
      });

      socket.current.on("user-offline", ({userId, lastSeen}) => {
        dispatch({ type: reducerCases.SET_USER_OFFLINE, userId, lastSeen });
      });

      socket.current.on("group-created", (newGroup) => {
        const groupAsContact = {
            ...newGroup,
            profilePicture: newGroup.profilePicture || "/default_avatar.png", 
            isGroup: true, 
            totalUnreadMessages: 0,
            message: "You were added to a new group",
            type: "text",
            createdAt: new Date().toISOString(),
        };

        dispatch({
            type: reducerCases.ADD_NEW_GROUP_TO_CONTACTS,
            newGroup: groupAsContact 
        });
      });

      socket.current.on("group-metadata-updated", (updatedGroup) => {
      if (currentChatUserRef.current?.id === updatedGroup.id) {
        dispatch({
          type: reducerCases.CHANGE_CURRENT_CHAT_USER,
          user: { ...currentChatUserRef.current, ...updatedGroup },
        });
      }
      dispatch({
        type: reducerCases.UPDATE_GROUP_IN_CONTACTS,
        group: updatedGroup,
      });
    });

    socket.current.on("removed-from-group", ({ groupId, userId }) => {
      if (userInfo.id === userId) {
        if (currentChatUserRef.current?.id === groupId) {
          dispatch({ type: reducerCases.SET_EXIT_CHAT });
        }
      }
    });

      socket.current.on("msg-send-refresh", (data) => {
        if (data?.newMessage) {
            const message = { ...data.newMessage };
            const isSender = userInfo.id === message.senderId;
            const isGroup = !!message.groupId;
            const isChatOpen = currentChatUserRef.current?.id === (isGroup ? message.groupId : (isSender ? message.receiverId : message.senderId));

            // --- [فك التشفير اللحظي للقائمة الجانبية] ---
            const otherUserId = isSender ? message.receiverId : message.senderId;
            const chatKey = isGroup 
                ? localStorage.getItem(`group-key-${message.groupId}`)
                : getSharedSecretKey(userInfo.id, otherUserId);

            if (message.type === "text") {
                message.message = decryptText(message.message, chatKey);
            }

            // --- إشعار سطح المكتب ---
            if (!isSender && (!isChatOpen || document.hidden)) {
                if ("Notification" in window && Notification.permission === "granted") {
                    const notificationText = message.type === "text" ? message.message : (message.type === "image" ? "📷 Sent an image" : "🎤 Sent an audio");
                    const notification = new Notification(`New message from ${message.sender?.name || "Someone"}`, {
                        body: notificationText,
                        icon: message.sender?.profilePicture || "/default-avatar.png",
                    });
                    notification.onclick = () => window.focus();
                }
            }

            dispatch({
                type: reducerCases.UPDATE_CONTACT_MESSAGE_LOCALLY,
                messageData: message,
                isUnread: !isSender && !isChatOpen 
            });

            if (!isSender && isChatOpen) {
                socket.current.emit("msg-seen", { to: message.senderId, from: userInfo.id });
                dispatch({ type: reducerCases.UPDATE_UNREAD_MESSAGES, userId: message.senderId, markAsReadByOther: false });
            }
        }
      });

      // --- [تحديث] استقبال مفتاح جروب جديد لايف ---
      socket.current.on("add-member-to-group", async ({ groupId, encryptedKey }) => {
        const myPrivateKey = localStorage.getItem("privateKey");
        if (myPrivateKey) {
            const groupKey = await decryptGroupKeyForMe(encryptedKey, myPrivateKey);
            if (groupKey) {
                localStorage.setItem(`group-key-${groupId}`, groupKey);
                // الإنضمام لروم الجروب فوراً لاستلام الرسايل
                socket.current.emit("join-chat", { userId: userInfo.id, chatId: groupId });
            }
        }
      });

      socket.current.on("connect_error", (err) => console.log("Socket error:", err.message));
      socket.current.on("incoming-voice-call", ({from, roomId, callType}) => dispatch({ type: reducerCases.SET_INCOMING_VOICE_CALL, incomingVoiceCall: {...from, roomId, callType} }));
      socket.current.on("incoming-video-call", ({from, roomId, callType}) => dispatch({ type: reducerCases.SET_INCOMING_VIDEO_CALL, incomingVideoCall: {...from, roomId, callType} }));
      socket.current.on("voice-call-rejected", () => dispatch({ type: reducerCases.END_CALL }));
      socket.current.on("video-call-rejected", () => dispatch({ type: reducerCases.END_CALL }));
      socket.current.on("online-users", ({onlineUsers}) => dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers }));
      socket.current.on("msg-delivered", ({ to }) => {
        dispatch({ 
            type: reducerCases.UPDATE_MESSAGES_TO_DELIVERED,
            toUserId: to
        });
      });
      
      socket.current.on("receive-typing", (data) => {
        if (userInfo.id === data.to) {
          dispatch({
            type: reducerCases.SET_IS_TYPING, 
            isTyping: { isTyping: data.typing, from: data.from, to: data.to }
          });
        }
      });
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = undefined;
      }
    };
  }, [userInfo]);

  useEffect(() => {
    let currentRoomId; 
    let isCurrentRequest = true;

    const getMessages = async () => {
      const chatId = currentChatUser.id;

      // --- [المرحلة 1: الرام كاش] ---
      if (messagesCache && messagesCache[chatId]) {
          dispatch({ 
              type: reducerCases.SET_MESSAGES, 
              messages: messagesCache[chatId] 
          });
      } else {
          // --- [المرحلة 2: الهارد كاش (Dexie)] ---
          const localMsgs = await getLocalMessages(chatId);
          if (localMsgs.length > 0) {
              dispatch({ type: reducerCases.SET_MESSAGES, messages: localMsgs });
          } else {
              dispatch({ type: reducerCases.SET_MESSAGES, messages: [] });
          }
      }
      
      try {
        // --- [المرحلة 3: السيرفر] ---
        const { data: { messages } } = await axios.get(`${GET_MESSAGES_ROUTE}/${userInfo.id}/${chatId}`);
        
        if (!isCurrentRequest) return;

        const isGroup = currentChatUser?.isGroup;
        const chatKey = isGroup 
          ? localStorage.getItem(`group-key-${chatId}`)
          : getSharedSecretKey(userInfo.id, chatId);

        const decryptedMessages = messages.map(msg => {
            if (msg.type === "text" && !msg.isDeleted) {
                msg.message = decryptText(msg.message, chatKey);
            }
            if (msg.replyTo && msg.replyTo.type === "text" && !msg.replyTo.isDeleted) {
                msg.replyTo.message = decryptText(msg.replyTo.message, chatKey);
            }
            return {
              ...msg,
              seenCount: msg._count?.seenBy || 0 
            };
        });

        // 1. تحديث الـ Dexie بالرسايل الجديدة
        await saveMessagesToLocal(decryptedMessages, chatId);

        // 2. تحديث الشاشة مع فلاج الـ BackgroundUpdate لمنع قفزة السكرول
        dispatch({ 
            type: reducerCases.SET_MESSAGES, 
            messages: decryptedMessages, 
            isBackgroundUpdate: true 
        }); 
        
        // 3. إدارة السوكيت والروم
        currentRoomId = isGroup ? chatId : (userInfo.id < chatId ? `${userInfo.id}-${chatId}` : `${chatId}-${userInfo.id}`);
        
        socket?.current?.emit("join-chat", { userId: userInfo.id, chatId: currentRoomId });
        dispatch({type: reducerCases.SET_CHAT_ID, chatId: currentRoomId});
        
        if (isGroup) {
            socket?.current?.emit("group-msg-seen", { userId: userInfo.id, groupId: chatId });
        } else {
            socket?.current?.emit("msg-seen", { to: chatId, from: userInfo.id });
            dispatch({ type: reducerCases.UPDATE_UNREAD_MESSAGES, userId: chatId });
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    if(currentChatUser?.id) {
      getMessages();
    }

    return () => {
      isCurrentRequest = false; 
      if (socket?.current && currentRoomId) {
        socket.current.emit("leave-chat", { userId: userInfo?.id, chatId: currentRoomId });
      }
    };
  }, [currentChatUser?.id]);

  socket?.current?.on("group-msg-blue-ticks", ({ messageId, groupId }) => {
    if (currentChatUser?.id === groupId) {
      dispatch({
        type: reducerCases.SET_GROUP_MESSAGE_READ, // هنضيف الـ Case دي في الـ Reducer
        messageId
      });
    }
  });

  if (initialLoading) {
    return (
      <div className="h-screen w-screen bg-panel-header-background flex items-center justify-center">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <>
      <ImageViewer />
      {incomingVideoCall && <IncomingVideoCall />}
      {incomingVoiceCall && <IncomingCall />}
      
      {videoCall && (<div className="h-screen w-screen max-h-full overflow-hidden"><VideoCall /></div>)}
      {voiceCall && (<div className="h-screen w-screen max-h-full overflow-hidden"><VoiceCall /></div>)}

      {!videoCall && !voiceCall && (
        // 1. الجريد الرئيسي للأبلكيشن (ChatList + Content)
        <div className="grid grid-cols-main h-screen w-screen max-h-screen max-w-full overflow-hidden bg-[#0b141a]">
          
          {showSettings ? (
            <Settings onClose={() => setShowSettings(false)} />
          ) : (
            <ChatList setShowSettings={setShowSettings} />
          )}

          {currentChatUser ? (
            // 2. الجريد الداخلي (منطقة الشات + السايدبار الأيمن)
            // شيلنا grid-cols-main من هنا عشان ميعملش Conflict
            <div className={`grid h-full overflow-hidden min-w-0 bg-[#0b141a] relative ${messagesSearch || showGroupInfo || showUserInfo ? "grid-cols-[1fr_400px]" : "grid-cols-1"}`}>
              
              <div className="flex flex-col h-full min-w-0 overflow-hidden relative">
                <Chat setShowGroupInfo={setShowGroupInfo} />
              </div>

              {/* 3. حاوية السايدبارات (البحث / الجروب / اليوزر) */}
              {(messagesSearch || showGroupInfo || showUserInfo) && (
                <div className="flex flex-col h-full min-w-0 overflow-hidden border-l border-conversation-border bg-[#0b141a] z-20">
                   {messagesSearch && <SearchMessages />}
                   {showGroupInfo && <GroupInfo onClose={() => setShowGroupInfo(false)} />}
                   {showUserInfo && <UserInfo />} 
                </div>
              )}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </>
  );
}

export default Main;