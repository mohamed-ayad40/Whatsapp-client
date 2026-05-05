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
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";

function Main() {
  const router = useRouter();
  const [{userInfo, currentChatUser, messagesSearch, messages, videoCall, voiceCall, incomingVoiceCall, incomingVideoCall, userContacts}, dispatch] = useStateProvider();
  const [redirectLogin, setRedirectLogin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); 
  
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

  useEffect(() => {
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if(!currentUser) {
        setRedirectLogin(true);
        setInitialLoading(false);
        return;
      }
      if(!userInfo && currentUser?.email) {
        try {
          // --- التعديل هنا: هنجيب التوكن ونخليه ثابت في كل الـ Requests ---
          const token = await currentUser.getIdToken();
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // ---------------------------------------------------------------
          
          const {data} = await axios.post(CHECK_USER_ROUTE, {email: currentUser.email});
          if(!data.status) {
            router.push("/login");
            setInitialLoading(false);
            return;
          }
          if(data?.data) {
            const {id, name, email, profilePicture: profileImage, status} = data.data;
            dispatch({ type: reducerCases.SET_USER_INFO, userInfo: { id, name, email, profileImage, status } });
          }
        } catch (err) {
          console.log(err);
          setInitialLoading(false);
        }
      } 
    });
  }, []);

  useEffect(() => {
    const getInitialData = async () => {
      try {
        if (userInfo?.id) {
          const { data: { users, onlineUsers } } = await axios.get(`${GET_INITIAL_CONTACTS_ROUTE}/${userInfo.id}`);
          
          // فك تشفير آخر رسالة في القائمة الجانبية
          const decryptedUsers = users.map(user => {
              if (user.type === "text") {
                  const sharedKey = getSharedSecretKey(userInfo.id, user.id);
                  user.message = decryptText(user.message, sharedKey);
              }
              return user;
          });

          dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers });
          dispatch({ type: reducerCases.SET_USER_CONTACTS, userContacts: decryptedUsers }); // استخدمنا المفكوك
          setInitialLoading(false); 
        }
      } catch (e) {
        console.log("Error fetching contacts:", e);
        setInitialLoading(false);
      }
    };
    if(userInfo) getInitialData();
  }, [userInfo]);

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
        if (currentChatUserRef.current?.id === data.from) {
          // فك تشفير الرسالة اللايف
          const sharedKey = getSharedSecretKey(userInfo.id, data.from);
          const decryptedMessage = { ...data.message };
          if (decryptedMessage.type === "text") {
              decryptedMessage.message = decryptText(decryptedMessage.message, sharedKey);
          }

          dispatch({ type: reducerCases.ADD_MESSAGE, newMessage: decryptedMessage });
          socket.current.emit("msg-seen", { to: data.from, from: userInfo.id });
          dispatch({ type: reducerCases.UPDATE_UNREAD_MESSAGES, userId: data.from });
        }
      });
      
      socket.current.on("refresh-seen", (data) => {
        const reader = data?.readerId || currentChatUserRef.current?.id;
        if (reader) {
            // هنضيف flag جديد هنا يفهم الـ Reducer إن "الطرف التاني هو اللي قرأ"
            dispatch({ 
              type: reducerCases.UPDATE_UNREAD_MESSAGES, 
              userId: reader,
              markAsReadByOther: true // <--- السطر الجديد
            });
        }
      });

            // استقبال تعديل الرسالة
      socket.current.on("message-edited", (updatedMessage) => {
          // لو حابب تفك تشفيرها الأول (بما إنها مبعوتة متفرة من الداتا بيز)
          const sharedKey = getSharedSecretKey(userInfo.id, updatedMessage.senderId);
          const decryptedText = decryptText(updatedMessage.message, sharedKey);
          
          dispatch({ 
              type: reducerCases.EDIT_MESSAGE_LOCALLY, 
              payload: { id: updatedMessage.id, message: decryptedText } 
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

      socket.current.on("msg-send-refresh", (data) => {
        if (data?.newMessage) {
            const message = data.newMessage;
            const isSender = userInfo.id === message.senderId;
            const isChatOpen = currentChatUserRef.current?.id === (isSender ? message.receiverId : message.senderId);

            // 1. فك التشفير (الكود اللي عملناه قبل كده)
            const otherUserId = isSender ? message.receiverId : message.senderId;
            const sharedKey = getSharedSecretKey(userInfo.id, otherUserId);
            if (message.type === "text") {
                message.message = decryptText(message.message, sharedKey);
            }

            // --- 2. السحر هنا: إشعار سطح المكتب ---
            // لو أنا مش اللي باعت الرسالة + (الشات مقفول أو المتصفح نفسه مخفي)
            if (!isSender && (!isChatOpen || document.hidden)) {
                if ("Notification" in window && Notification.permission === "granted") {
                    // رسالة الإشعار
                    const notificationText = message.type === "text" 
                        ? message.message 
                        : (message.type === "image" ? "📷 Sent an image" : "🎤 Sent an audio");
                    
                    const notification = new Notification(`New message from ${message.sender?.name || "Someone"}`, {
                        body: notificationText,
                        icon: message.sender?.profilePicture || "/default-avatar.png", // صورة اليوزر
                    });

                    // لما اليوزر يدوس على الإشعار من الويندوز، المتصفح يفتح الشات فوراً
                    notification.onclick = () => {
                        window.focus();
                    };
                }
            }
            // ------------------------------------

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

      socket.current.on("connect_error", (err) => console.log("Socket error:", err.message));
      socket.current.on("incoming-voice-call", ({from, roomId, callType}) => dispatch({ type: reducerCases.SET_INCOMING_VOICE_CALL, incomingVoiceCall: {...from, roomId, callType} }));
      socket.current.on("incoming-video-call", ({from, roomId, callType}) => dispatch({ type: reducerCases.SET_INCOMING_VIDEO_CALL, incomingVideoCall: {...from, roomId, callType} }));
      socket.current.on("voice-call-rejected", () => dispatch({ type: reducerCases.END_CALL }));
      socket.current.on("video-call-rejected", () => dispatch({ type: reducerCases.END_CALL }));
      socket.current.on("online-users", ({onlineUsers}) => dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers }));
      
      socket.current.on("receive-typing", (data) => {
        // شيلنا الشرط بتاع فتح الشات، واكتفينا بالتأكد إن الكتابة مبعوتالي أنا
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
    const getMessages = async () => {
      dispatch({ type: reducerCases.SET_MESSAGES, messages: [] });
      const {data: {messages}} = await axios.get(`${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}`);
      
      // فك تشفير الرسايل
      const sharedKey = getSharedSecretKey(userInfo.id, currentChatUser.id);
      const decryptedMessages = messages.map(msg => {
          if (msg.type === "text") msg.message = decryptText(msg.message, sharedKey);
          return msg;
      });

      dispatch({ type: reducerCases.SET_MESSAGES, messages: decryptedMessages }); // استخدمنا المفكوك
      
      currentRoomId = userInfo.id < currentChatUser?.id ? `${userInfo.id}-${currentChatUser?.id}` : `${currentChatUser?.id}-${userInfo.id}`;
      socket?.current?.emit("join-chat", { userId: userInfo.id, chatId: currentRoomId });
      dispatch({type: reducerCases.SET_CHAT_ID, chatId: currentRoomId});
      
      // التعديل الأهم: إجبار السيرفر والسايد بار إنهم يعملوا Seen بمجرد فتح الشات بدون أي شروط!
      socket?.current?.emit("msg-seen", { to: currentChatUser.id, from: userInfo.id });
      dispatch({ type: reducerCases.UPDATE_UNREAD_MESSAGES, userId: currentChatUser.id });
    };

    if(currentChatUser?.id) {
      getMessages();
    }

    return () => {
      if (socket?.current && currentRoomId) {
        socket.current.emit("leave-chat", { userId: userInfo?.id, chatId: currentRoomId });
      }
    };
  }, [currentChatUser]);

  if (initialLoading) {
    return (
      <div className="h-screen w-screen bg-panel-header-background flex items-center justify-center">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <>
    <ImageViewer />  {/* ضفنا السطر ده هنا */}
    {incomingVideoCall && <IncomingVideoCall />}
    {incomingVoiceCall && <IncomingCall />}
    {videoCall && <div className="h-screen w-screen max-h-full overflow-hidden"><VideoCall /></div>}
    {voiceCall && <div className="h-screen w-screen max-h-full overflow-hidden"><VoiceCall /></div>}
    
    {!videoCall && !voiceCall && (
      <div className="grid grid-cols-main h-screen w-screen max-h-screen max-w-full">
        <ChatList />
        {
          currentChatUser ? 
          <div className={messagesSearch ? "grid grid-cols-2" : "grid-cols-2"}>
            <Chat />
            {messagesSearch && <SearchMessages />}
          </div> 
          : <Empty />
        }
      </div>
    )}
    </>
  );
}

export default Main;