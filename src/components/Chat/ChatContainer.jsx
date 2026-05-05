import { useStateProvider } from "@/context/StateContext";
import { calculateTime } from "@/utils/CalculateTime";
import React, { useEffect, useRef, useState, memo } from "react";
import MessageStatus from "../common/MessageStatus";
import ImageMessage from "./ImageMessage";
import dynamic from "next/dynamic";
import axios from "axios";
import { GET_MESSAGES_ROUTE } from "@/utils/ApiRoutes";
import { reducerCases } from "@/context/constants";
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";
import ContextMenu from "../common/ContextMenu"; // ضفنا الاستدعاء بتاع القائمة
import { DELETE_MESSAGE_ROUTE } from "@/utils/ApiRoutes"; // ضيف ده فوق مع الـ Imports


const VoiceMessage = dynamic(() => import("./VoiceMessage"), { ssr: false });

const SingleMessage = memo(({ message, userInfo }) => {
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuCordinates, setContextMenuCordinates] = useState({ x: 0, y: 0 });
  const [{ currentChatUser }, dispatch] = useStateProvider();

  // إظهار القائمة لما تدوس كليك يمين
  const showContextMenu = (e) => {
    e.preventDefault();
    setContextMenuCordinates({ x: e.pageX, y: e.pageY });
    setIsContextMenuVisible(true);
  };

  const isSender = message.senderId === userInfo.id;

  const deleteMessage = async (type) => {
    try {
      await axios.post(DELETE_MESSAGE_ROUTE, { messageId: message.id, type });
      dispatch({
        type: reducerCases.DELETE_MESSAGE_LOCALLY,
        payload: { id: message.id, type },
      });
    } catch (error) {
      console.log("Error deleting message:", error);
    }
  };

  // الخيارات بتاعة القائمة (بتتغير حسب دي رسالتك ولا رسالته)
  let contextMenuOptions = [
    {
      name: "Copy",
      callback: () => {
        navigator.clipboard.writeText(message.message); // بتنسخ النص فوراً
      },
    },
  ];

  if (isSender) {
    if (message.type === "text") {
      contextMenuOptions.push({
        name: "Edit Message",
        callback: () => {
          console.log("Edit message triggered", message.id);
          // هنعمل الـ Logic بتاعها في الخطوة الجاية
          dispatch({ type: reducerCases.SET_MESSAGE_TO_EDIT, messageToEdit: message });
        },
      });
    }
    contextMenuOptions.push({
      name: "Delete for me",
      callback: () => deleteMessage("me"),
    });
    contextMenuOptions.push({
      name: "Delete for everyone",
      callback: () => deleteMessage("everyone"),
    });
  } else {
    contextMenuOptions.push({
      name: "Delete for me",
      callback: () => deleteMessage("me"),
    });
  }

  // 1. لو الرسالة ممسوحة نعرضها كده
  if (message.isDeleted) {
    return (
      <div className={`flex ${!isSender ? "justify-start" : "justify-end"}`}>
        <div className="text-icon-lighter italic px-3 py-[5px] text-sm rounded-md flex gap-2 items-end bg-panel-header-background border-[1px] border-conversation-border">
          🚫 This message was deleted
          <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
            {calculateTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // 2. لو مش ممسوحة تتعرض عادي مع خاصية الكليك يمين
  return (
    <div
      className={`flex ${!isSender ? "justify-start" : "justify-end"} relative`}
      onContextMenu={showContextMenu}
    >
      {message?.type === "text" && (
        <div
          className={`text-white px-2 py-[5px] text-sm rounded-md flex gap-2 items-end max-w-[45%] ${
            !isSender ? "bg-incoming-background" : "bg-outgoing-background"
          }`}
        >
          <span className="break-all pb-1">
            {message?.message}
            {message.isEdited && (
              <span className="text-bubble-meta text-[11px] ml-2 italic text-icon-lighter">
                (Edited)
              </span>
            )}
          </span>
          <div className="flex gap-1 items-end">
            <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
              {calculateTime(message?.createdAt)}
            </span>
            {isSender && <MessageStatus messageStatus={message?.messageStatus} />}
          </div>
        </div>
      )}
      {message?.type === "image" && <ImageMessage message={message} />}
      {message?.type === "audio" && <VoiceMessage message={message} />}

      {isContextMenuVisible && (
        <ContextMenu
          options={contextMenuOptions}
          cordinates={contextMenuCordinates}
          contextMenu={isContextMenuVisible}
          setContextMenu={setIsContextMenuVisible}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.messageStatus === nextProps.message.messageStatus &&
    prevProps.message.isDeleted === nextProps.message.isDeleted &&
    prevProps.message.isEdited === nextProps.message.isEdited
  );
});



// ... (باقي كود ChatContainer زى ما هو بالظبط بدون أي تغيير)
function ChatContainer() {
  const [{ messages, currentChatUser, userInfo }, dispatch] = useStateProvider();
  const chatContainerRef = useRef(null);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages?.length > 0) {
      if (isInitialLoad) {
        scrollToBottom();
        setIsInitialLoad(false);
      } else if (!isFetchingMore) {
        scrollToBottom();
      }
    }
  }, [messages]);

  useEffect(() => {
    setIsInitialLoad(true);
    setHasMoreMessages(true);
  }, [currentChatUser]);

  const handleScroll = async (e) => {
    if (e.target.scrollTop <= 10 && !isFetchingMore && hasMoreMessages) {
      setIsFetchingMore(true);
      
      const oldScrollHeight = e.target.scrollHeight;
      const oldestMessageId = messages[0]?.id; 

      try {
        const { data } = await axios.get(
          `${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}?cursor=${oldestMessageId}`
        );

        if (data.messages && data.messages.length > 0) {
          const sharedKey = getSharedSecretKey(userInfo.id, currentChatUser.id);
          const decryptedOldMessages = data.messages.map(msg => {
              if (msg.type === "text") msg.message = decryptText(msg.message, sharedKey);
              return msg;
          });

          dispatch({
            type: reducerCases.SET_MESSAGES,
            messages: [...decryptedOldMessages, ...messages], 
          });

          setHasMoreMessages(data.hasMore);
        } else {
          setHasMoreMessages(false);
        }

        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight - oldScrollHeight;
          }
          setIsFetchingMore(false);
        }, 0);

      } catch (err) {
        console.error("Error fetching older messages:", err);
        setIsFetchingMore(false);
      }
    }
  };

  return (
    <div
      className="flex-1 min-h-0 w-full relative overflow-y-auto overflow-x-hidden custom-scrollbar"
      ref={chatContainerRef}
      onScroll={handleScroll} 
    >
      <div className="bg-chat-background bg-fixed h-full w-full opacity-5 fixed left-0 top-0 z-0 pointer-events-none"></div>
      <div className="mx-10 my-6 relative bottom-0 z-40 left-0">
        
        {isFetchingMore && (
          <div className="flex justify-center mb-4">
            <span className="text-secondary text-sm bg-panel-header-background px-3 py-1 rounded-full animate-pulse">
              Loading older messages...
            </span>
          </div>
        )}

        <div className="flex w-full">
          <div className="flex flex-col justify-end w-full gap-1">
            {messages?.map((message) => (
              <SingleMessage 
                key={message?.id} 
                message={message} 
                userInfo={userInfo} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;