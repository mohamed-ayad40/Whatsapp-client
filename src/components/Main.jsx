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

function Main() {
  const router = useRouter();
  const [{userInfo, currentChatUser, messagesSearch, messages, videoCall, voiceCall, incomingVoiceCall, incomingVideoCall, userContacts}, dispatch] = useStateProvider();
  const [redirectLogin, setRedirectLogin] = useState(false);
  const [socketEvent, setSocketEvent] = useState(false);
  const socket = useRef();

  useEffect(() => {
    if(redirectLogin) router.push("/login");
  }, [redirectLogin]);


  onAuthStateChanged(firebaseAuth, async (currentUser) => {
    if(!currentUser) setRedirectLogin(true);
    if(!userInfo && currentUser?.email) {
      const {data} = await axios.post(CHECK_USER_ROUTE, {email: currentUser.email});
      if(!data.status) {
        router.push("/login");
      }
      if(data?.data) {
        const {id, name, email, profilePicture: profileImage, status} = data.data;
        dispatch({
          type: reducerCases.SET_USER_INFO,
          userInfo: {
            id, name, email, profileImage, status
          }
        });
      }
    }
  });

  useEffect(() => {
    if(userInfo) {
      console.log(HOST);
      socket.current = io(HOST, {
        addTrailingSlash: false,
        path: '/socket.io',
        transports: ["websocket"],
      });
      console.log(HOST);
      socket.current.emit("add-user", userInfo.id);
      dispatch({
        type: reducerCases.SET_SOCKET,
        socket
      })
    }
  }, [userInfo]);

  useEffect(() => {
    if(socket.current && !socketEvent) {
      socket.current.on("msg-receive", (data) => {
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: {
            ...data.message,
          }
        })
      });
      
      socket.current.on("refresh-seen", async (data) => {
        console.log("On refreshing seen");
        dispatch({
          type: reducerCases.UPDATE_UNREAD_MESSAGES,
        })
        const {data: {users, onlineUsers}} = await axios.get(`${GET_INITIAL_CONTACTS_ROUTE}/${userInfo.id}`);
        console.log(users);
        dispatch({type: reducerCases.SET_ONLINE_USERS, onlineUsers}); //to the receiver and reloading contacts for new messages
        dispatch({type: reducerCases.SET_USER_CONTACTS, userContacts: users});
      });

      socket.current.on("connect_error", (err) => {
        // the reason of the error, for example "xhr poll error"
        console.log(err.message);
      
        // some additional description, for example the status code of the initial HTTP response
        console.log(err.description);
      
        // some additional context, for example the XMLHttpRequest object
        console.log(err.context);
      });
      
      socket.current.on("incoming-voice-call", ({from, roomId, callType}) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: {...from, roomId, callType}
        });
      });

      socket.current.on("incoming-video-call", ({from, roomId, callType}) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: {...from, roomId, callType}
        });
      });

      socket.current.on("voice-call-rejected", () => {
        dispatch({
          type: reducerCases.END_CALL
        });
      });

      socket.current.on("video-call-rejected", () => {
        dispatch({
          type: reducerCases.END_CALL
        });
      });

      socket.current.on("online-users", ({onlineUsers}) => {
        dispatch({
          type: reducerCases.SET_ONLINE_USERS,
          onlineUsers,
        })
      })
      socket.current.on("receive-typing", (data) => {
        if(userInfo.id === data.to) {
          dispatch({type: reducerCases.SET_IS_TYPING, isTyping: {isTyping: data.typing, from: data.from, to: data.to}});
        }
      });

      setSocketEvent(true);
    }
  }, [socket.current]);

  useEffect(() => {
    const getMessages = async () => {
      dispatch({
        type: reducerCases.SET_MESSAGES,
        messages: []
      })
      const {data: {messages}} = await axios.get(`${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}`);
      dispatch({
        type: reducerCases.SET_MESSAGES,
        messages
      });
      const chatId = userInfo.id < currentChatUser?.id ? `${userInfo.id}-${currentChatUser?.id}` : `${currentChatUser?.id}-${userInfo.id}`;
      socket?.current?.emit("join-chat", { userId: userInfo.id, chatId });
      dispatch({type: reducerCases.SET_CHAT_ID, chatId});
      socket.current.emit("msg-seen", {
        to: currentChatUser.id
      });
    };
    if(currentChatUser?.id) {
      getMessages();
    };
  }, [currentChatUser]);

useEffect(() => {
  socket?.current?.on("msg-send-refresh", async (data) => {
      const {data: {users, onlineUsers}} = await axios.get(`${GET_INITIAL_CONTACTS_ROUTE}/${userInfo.id}`);
      console.log(users);
      dispatch({type: reducerCases.SET_ONLINE_USERS, onlineUsers}); //to the receiver and reloading contacts for new messages
      dispatch({type: reducerCases.SET_USER_CONTACTS, userContacts: users});
  });
}, [socket.current, currentChatUser])

  useEffect(() => {
    if(socket.current && currentChatUser && messages.length) {
      userContacts.map((user) => {
        if(user.id === currentChatUser.id) {
          console.log(user);
        }
        if (user.id === currentChatUser.id && user.messageStatus !== "read") {
          socket.current.emit("msg-seen", { // receiver to sender
            to: currentChatUser.id,
            from: userInfo.id
          });
        };
      });
      let updatedUsers = userContacts?.map((user) => { // i'm the receiver
        if (currentChatUser?.id === user?.id) { //if i'm opening chat and seeen alreayd
          console.log(user.totalUnreadMessages);
            return {
              ...user,
              totalUnreadMessages: 0,
              messageStatus: messages[messages?.length -1].messageStatus,
              message: messages[messages?.length -1]?.message
            };
        }
        return user;
      }); 
        dispatch({ type: reducerCases.SET_USER_CONTACTS, userContacts: updatedUsers });
    }
  }, [messages.length]);

  return (
    <>
    {incomingVideoCall && <IncomingVideoCall />}
    {incomingVoiceCall && <IncomingCall />}
    {videoCall && <div className="h-screen w-screen max-h-full overflow-hidden">
        <VideoCall />
      </div>}

    {voiceCall && <div className="h-screen w-screen max-h-full overflow-hidden">
        <VoiceCall />
      </div>}
      {!videoCall && !voiceCall && (
      <div className="grid grid-cols-main h-screen w-screen max-h-screen max-w-full">
        <ChatList />
        {
          currentChatUser ? 
          <div className={messagesSearch ? "grid grid-cols-2" : "grid-cols-2"}>
            <Chat />
            {
              messagesSearch && <SearchMessages />
            }
          </div> 
          : <Empty />
        }
      </div>
      )}
    </>
  );
}

export default Main;
