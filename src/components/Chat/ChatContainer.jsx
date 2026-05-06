import { useStateProvider } from "@/context/StateContext";
import { calculateTime } from "@/utils/CalculateTime";
import React, { useEffect, useRef, useState, memo } from "react";
import MessageStatus from "../common/MessageStatus";
import ImageMessage from "./ImageMessage";
import dynamic from "next/dynamic";
import axios from "axios";
import { GET_MESSAGES_ROUTE, DELETE_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import { reducerCases } from "@/context/constants";
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";
import ContextMenu from "../common/ContextMenu";
import { MdCheckBoxOutlineBlank, MdCheckBox, MdDelete, MdOutlineTurnRight } from "react-icons/md";
import { IoClose } from "react-icons/io5";

const VoiceMessage = dynamic(() => import("./VoiceMessage"), { ssr: false });

// ------------------------------------------------------------------
// 1. مكون الرسالة الواحدة (SingleMessage)
// ------------------------------------------------------------------
const SingleMessage = memo(({ message, userInfo, showContextMenu }) => {
  const [{ isSelectionMode, selectedMessages, currentChatUser }, dispatch] = useStateProvider();  
  const isSender = message.senderId === userInfo.id;
  const isSelected = selectedMessages.includes(message.id);

  // دالة تحديد/إلغاء تحديد الرسالة
  const handleMessageClick = () => {
    if (isSelectionMode) {
      dispatch({ type: reducerCases.TOGGLE_MESSAGE_SELECTION, messageId: message.id });
    }
  };

  // حالة: لو الرسالة ممسوحة
  if (message.isDeleted) {
    return (
      <div className={`flex items-center gap-3 ${isSender ? "justify-end" : "justify-start"}`}>
        {isSelectionMode && (
          <div onClick={handleMessageClick} className="cursor-pointer text-icon-lighter hover:text-white text-xl">
            {isSelected ? <MdCheckBox className="text-icon-green" /> : <MdCheckBoxOutlineBlank />}
          </div>
        )}
        <div 
          onClick={handleMessageClick}
          className={`text-icon-lighter italic px-3 py-[5px] text-sm rounded-md flex gap-2 items-end bg-panel-header-background border-[1px] border-conversation-border ${isSelectionMode ? "cursor-pointer" : ""} ${isSelected ? "opacity-70 ring-2 ring-icon-green" : ""}`}
        >
          🚫 This message was deleted
          <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
            {calculateTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // حالة: لو الرسالة عادية (نص أو صورة أو صوت)
  return (
    <div className={`flex items-center gap-3 ${isSender ? "justify-end" : "justify-start"}`}>
      
      {/* أيقونة التحديد */}
      {isSelectionMode && (
        <div onClick={handleMessageClick} className="cursor-pointer text-icon-lighter hover:text-white text-xl">
          {isSelected ? <MdCheckBox className="text-icon-green" /> : <MdCheckBoxOutlineBlank />}
        </div>
      )}

      {/* الرسالة نفسها (مع صندوق الريبلاي المدمج) */}
      <div
        className={`relative flex flex-col gap-1 rounded-md p-1 ${isSelectionMode ? "cursor-pointer" : ""} ${isSelected ? "opacity-70 ring-2 ring-icon-green" : ""} ${!isSender ? "bg-incoming-background" : "bg-outgoing-background"}`}
        onContextMenu={(e) => {
            if(!isSelectionMode) showContextMenu(e, message, isSender)
        }}
        onClick={handleMessageClick}
      >
        
        {/* 🟢 صندوق الرد (يظهر فوق أي نوع رسالة) */}
        {message.replyTo && (
          <div className="bg-black/20 rounded p-2 text-xs flex flex-col border-l-4 border-icon-green max-w-[300px] mb-1">
            <span className="font-semibold text-icon-green">
              {message.replyTo.senderId === userInfo.id ? "You" : currentChatUser?.name}
            </span>
            <span className="truncate text-icon-lighter">
              {message.replyTo.isDeleted ? "🚫 This message was deleted" : 
               message.replyTo.type === "image" ? "📷 Image" : 
               message.replyTo.type === "audio" ? "🎤 Voice Message" : 
               message.replyTo.message}
            </span>
          </div>
        )}

        {/* 🟢 محتوى الرسالة الحقيقي */}
        {message?.type === "text" && (
          <div className="text-white px-2 py-[2px] text-sm flex gap-2 items-end justify-between">
            <span className="break-all pb-1">
              {message?.message}
              {message.isEdited && (
                <span className="text-bubble-meta text-[11px] ml-2 italic text-icon-lighter">
                  (Edited)
                </span>
              )}
            </span>
            <div className="flex gap-1 items-end min-w-fit">
              <span className="text-bubble-meta text-[11px] pt-0">
                {calculateTime(message?.createdAt)}
              </span>
              {isSender && <MessageStatus messageStatus={message?.messageStatus} />}
            </div>
          </div>
        )}

        {/* لو صورة أو صوت */}
        {message?.type === "image" && <ImageMessage message={message} />}
        {message?.type === "audio" && <VoiceMessage message={message} />}

      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.message === nextProps.message; 
});

// ------------------------------------------------------------------
// 2. المكون الأساسي (ChatContainer)
// ------------------------------------------------------------------
function ChatContainer() {
  const [{ messages, currentChatUser, userInfo, isSelectionMode, selectedMessages }, dispatch] = useStateProvider();
    // حالة نافذة التأكيد (مخفية ولا ظاهرة؟ وهل كل الرسايل بتاعتي؟)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, allMine: false });
  const chatContainerRef = useRef(null);
  
  const [contextMenuState, setContextMenuState] = useState({ visible: false, x: 0, y: 0, options: [] });
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
    // نقفل وضع التحديد لو غيرنا الشات
    dispatch({ type: reducerCases.CLEAR_MESSAGE_SELECTION }); 
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
        setIsFetchingMore(false);
      }
    }
  };

  // دالة إظهار القائمة
  const showContextMenu = (e, message, isSender) => {
    e.preventDefault();
    
    const deleteMessage = async (type) => {
      try {
        await axios.post(DELETE_MESSAGE_ROUTE, { messageId: message.id, type });
        dispatch({ type: reducerCases.DELETE_MESSAGE_LOCALLY, payload: { id: message.id, type } });
      } catch (error) {
        console.log("Error deleting message:", error);
      }
    };

    let options = [
      { name: "Copy", callback: () => navigator.clipboard.writeText(message.message) },
      { name: "Reply", callback: () => dispatch({ type: reducerCases.SET_MESSAGE_TO_REPLY, messageToReply: message }) },
      { name: "Select Messages", callback: () => dispatch({ type: reducerCases.SET_MESSAGE_SELECTION_MODE, isSelectionMode: true }) }
    ];

    if (isSender) {
      if (message.type === "text") {
        options.push({ name: "Edit Message", callback: () => dispatch({ type: reducerCases.SET_MESSAGE_TO_EDIT, messageToEdit: message }) });
      }
      options.push({ name: "Delete for me", callback: () => deleteMessage("me") });
      options.push({ name: "Delete for everyone", callback: () => deleteMessage("everyone") });
    } else {
      options.push({ name: "Delete for me", callback: () => deleteMessage("me") });
    }

    setContextMenuState({ visible: true, x: e.pageX, y: e.pageY, options });
  };

  // دالة مسح الرسايل المحددة جماعياً
  // 1. الدالة دي بتشتغل لما تدوس على أيقونة سلة المهملات (بتظهر النافذة بس)
  const handleDeleteIconClick = () => {
    if (selectedMessages.length === 0) return;
    const allMine = selectedMessages.every(id => {
      const msg = messages.find(m => m.id === id);
      return msg?.senderId === userInfo.id;
    });
    setConfirmDelete({ isOpen: true, allMine });
  };

  // 2. الدالة دي بتشتغل لما تختار اختيار من النافذة (بتنفذ المسح بجد)
  const executeDelete = async (type) => {
    setConfirmDelete({ isOpen: false, allMine: false }); // نخفي النافذة الأول
    try {
      await Promise.all(
        selectedMessages.map(async (msgId) => {
          await axios.post(DELETE_MESSAGE_ROUTE, { messageId: msgId, type });
          dispatch({ type: reducerCases.DELETE_MESSAGE_LOCALLY, payload: { id: msgId, type } });
        })
      );
      dispatch({ type: reducerCases.CLEAR_MESSAGE_SELECTION }); // نلغي التحديد
    } catch (error) {
      console.log("Error deleting multiple messages:", error);
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
          <div className="flex flex-col justify-end w-full gap-2">
            {messages?.map((message) => (
              <SingleMessage 
                key={message?.id} 
                message={message} 
                userInfo={userInfo} 
                showContextMenu={showContextMenu} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* القائمة */}
      {contextMenuState.visible && (
        <ContextMenu
          options={contextMenuState.options}
          cordinates={{ x: contextMenuState.x, y: contextMenuState.y }}
          contextMenu={contextMenuState.visible}
          setContextMenu={(val) => setContextMenuState(prev => ({ ...prev, visible: val }))}
        />
      )}

      {/* شريط المهام العائم (يظهر فقط في وضع التحديد) */}
      {isSelectionMode && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-panel-header-background rounded-full px-6 py-3 z-50 flex items-center justify-between min-w-[300px] shadow-lg border border-conversation-border">
          <div className="flex items-center gap-4">
            <IoClose
              className="text-2xl cursor-pointer text-icon-lighter hover:text-white transition-colors"
              onClick={() => dispatch({ type: reducerCases.CLEAR_MESSAGE_SELECTION })} 
            />
            <span className="text-white font-semibold">
              {selectedMessages.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-6">
            <MdOutlineTurnRight
              className={`text-2xl cursor-pointer transition-colors ${selectedMessages.length > 0 ? "text-icon-lighter hover:text-white" : "text-icon-lighter/30 cursor-not-allowed"}`}
              onClick={() => {
                if(selectedMessages.length > 0) {
                  console.log("Forward logic will go here"); 
                }
              }}
              title="Forward Messages"
            />
            <MdDelete
              className={`text-2xl cursor-pointer transition-colors ${selectedMessages.length > 0 ? "text-icon-lighter hover:text-red-500" : "text-icon-lighter/30 cursor-not-allowed"}`}
              onClick={handleDeleteIconClick} // 🟢 غيرنا دي
              title="Delete Messages"
            />
          </div>
        </div>
      )}
            {/* 🟢 نافذة التأكيد الاحترافية (Custom Prompt) */}
      {confirmDelete.isOpen && (
        <>
          {/* خلفية شفافة عشان تمنع الضغط على أي حاجة تانية */}
          <div 
            className="fixed inset-0 bg-black/40 z-[90]" 
            onClick={() => setConfirmDelete({ isOpen: false, allMine: false })}
          ></div>
          
          {/* النافذة نفسها (بتنزل من فوق بـ Animation خفيف) */}
          <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-dropdown-background shadow-2xl border border-conversation-border rounded-lg p-5 z-[100] w-[350px] flex flex-col gap-5 animate-slide-down">
            <span className="text-white text-lg font-medium">Delete {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''}?</span>
            
            <div className="flex flex-col gap-2">
              {/* لو كل الرسايل بتاعتك، هيظهرلك خيار الحذف للجميع */}
              {confirmDelete.allMine && (
                <button 
                  className="text-[#f15c6d] hover:bg-background-default-hover px-4 py-3 rounded text-right transition-colors font-medium" 
                  onClick={() => executeDelete("everyone")}
                >
                  Delete for everyone
                </button>
              )}
              
              <button 
                className="text-[#f15c6d] hover:bg-background-default-hover px-4 py-3 rounded text-right transition-colors font-medium" 
                onClick={() => executeDelete("me")}
              >
                Delete for me
              </button>
              
              <button 
                className="text-icon-green hover:bg-background-default-hover border border-icon-green/20 px-4 py-3 rounded text-center transition-colors font-medium mt-2" 
                onClick={() => setConfirmDelete({ isOpen: false, allMine: false })}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatContainer;