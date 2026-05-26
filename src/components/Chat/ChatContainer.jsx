import { useStateProvider } from "@/context/StateContext";
import { calculateTime } from "@/utils/CalculateTime";
import React, { useEffect, useRef, useState, memo, useCallback, useMemo } from "react";
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
import { BsArrowDown } from "react-icons/bs";
import { Virtuoso } from "react-virtuoso"; 
import Avatar from "../common/Avatar"; // 🚨 استيراد مكون الصورة

const VoiceMessage = dynamic(() => import("./VoiceMessage"), { ssr: false });

const SingleMessage = memo(({ message, userInfo, showContextMenu, isActive, onReplyClick, chatKey }) => {
  const [{ isSelectionMode, selectedMessages, currentChatUser }, dispatch] = useStateProvider();  
  const isSender = message?.senderId === userInfo?.id;
  const isSelected = selectedMessages.includes(message?.id);

  const decryptedMessageText = useMemo(() => {
      if (message?.type !== "text" || message?.isDeleted) return message?.message;
      return decryptText(message?.message, chatKey);
  }, [message?.message, message?.isDeleted, message?.type, chatKey]);

  const decryptedReplyText = useMemo(() => {
      if (!message?.replyTo || message?.replyTo.type !== "text" || message?.replyTo.isDeleted) return message?.replyTo?.message;
      return decryptText(message?.replyTo.message, chatKey);
  }, [message?.replyTo, chatKey]);

  const handleMessageClick = () => {
    if (isSelectionMode) {
      dispatch({ type: reducerCases.TOGGLE_MESSAGE_SELECTION, messageId: message?.id });
    }
  };

  if (message?.isDeleted) {
    return (
      <div 
        id={`msg-${message?.id}`}
        className={`flex items-center px-5 py-1 w-full transition-all duration-500 ${
          isActive ? "bg-black/10" : "hover:bg-black/5"
        } ${isSender ? "justify-end" : "justify-start"}`}
      >
        <div 
          onClick={handleMessageClick}
          className={`text-icon-lighter italic px-3 py-[5px] text-sm rounded-md flex gap-2 items-end bg-panel-header-background border-[1px] border-conversation-border cursor-pointer ${isSelected ? "opacity-70 ring-2 ring-icon-green" : ""}`}
        >
          🚫 This message was deleted
          <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
            {calculateTime(message?.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`msg-${message?.id}`}
      // 🚨 التعديل الأول: خلينا items-end بدل items-center عشان الصورة تبقى تحت جنب الرسالة
      className={`flex items-end px-5 py-[2px] w-full group transition-all duration-500 ${
        isActive ? "bg-black/10" : "hover:bg-black/5"
      } ${isSender ? "justify-end" : "justify-start"}`}
    >
      {isSelectionMode && (
        <div onClick={handleMessageClick} className="mr-4 mb-2 cursor-pointer text-icon-lighter hover:text-white text-xl">
          {isSelected ? <MdCheckBox className="text-icon-green" /> : <MdCheckBoxOutlineBlank />}
        </div>
      )}

      {/* 🚨 التعديل الثاني: رسم صورة الشخص جنب الرسالة لو إحنا في جروب ومحمي بـ ?. */}
      {currentChatUser?.isGroup && !isSender && (
        <div className="mr-2 mb-1 flex-shrink-0 cursor-pointer">
          <Avatar 
            type="sm" 
            image={message?.sender?.profilePicture || currentChatUser?.users?.find(u => u?.id === message?.senderId)?.profilePicture} 
          />
        </div>
      )}

      <div
        className={`relative flex flex-col gap-1 rounded-md p-1 cursor-pointer transition-all ${
          isSelected ? "opacity-70 ring-2 ring-icon-green" : ""
        } ${!isSender ? "bg-incoming-background" : "bg-outgoing-background"}`}
        onContextMenu={(e) => {
            if(!isSelectionMode) showContextMenu(e, message, isSender, decryptedMessageText)
        }}
        onClick={handleMessageClick}
      >
        {/* 🚨 التعديل الأول: تأمين message?.senderId بالـ ? عشان ميضربش كراش */}
        {currentChatUser?.isGroup && !isSender && (
          <span className="text-xs font-bold text-[#53bdeb] ml-1 mt-1 cursor-pointer w-fit">
            {message?.sender?.name || currentChatUser?.users?.find(u => u.id === message?.senderId)?.name || "Unknown"}
          </span>
        )}

        {message?.replyTo && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if(onReplyClick) onReplyClick(message?.replyTo.id);
            }}
            className="bg-black/20 rounded p-2 text-xs flex flex-col border-l-4 border-icon-green max-w-[300px] mb-1 hover:bg-black/30 transition-all cursor-alias"
          >
            <span className="font-semibold text-icon-green">
              {message?.replyTo.senderId === userInfo.id ? "You" : currentChatUser?.name}
            </span>
            <span className="truncate text-icon-lighter">
              {message?.replyTo.isDeleted ? "🚫 This message was deleted" : 
               message?.replyTo.type === "image" ? "📷 Image" : 
               message?.replyTo.type === "audio" ? "🎤 Voice Message" : 
               decryptedReplyText}
            </span>
          </div>
        )}

        {message?.type === "text" && (
          <div className="text-white px-2 py-[2px] text-sm flex gap-2 items-end justify-between">
            <span className="break-all pb-1">
              {decryptedMessageText}
              {message?.isEdited && (
                <span className="text-bubble-meta text-[11px] ml-2 italic text-icon-lighter">(Edited)</span>
              )}
            </span>
            <div className="flex gap-1 items-end min-w-fit">
              <span className="text-bubble-meta text-[11px] pt-0">
                {calculateTime(message?.createdAt)}
              </span>
              {isSender && (
                <MessageStatus 
                  messageStatus={message?.messageStatus} 
                  isGroup={!!message?.groupId}
                  // 🚨 حماية إضافية: يقرا العداد من أي مسار سواء Cache أو API
                  seenCount={message?.seenCount ?? message?._count?.seenBy ?? 0}
                  totalMembers={currentChatUser?.userIds?.length || currentChatUser?.users?.length || 2}
                />
              )}
            </div>
          </div>
        )}

        {message?.type === "image" && <ImageMessage message={message} />}
        {message?.type === "audio" && <VoiceMessage message={message} />}
      </div>
    </div>
  );
}, (prevProps, nextProps) => (
    prevProps.message === nextProps.message && 
    prevProps.isActive === nextProps.isActive &&
    prevProps.chatKey === nextProps.chatKey
));

function ChatContainer() {
  const [{ messages, currentChatUser, userInfo, isSelectionMode, selectedMessages, isTyping }, dispatch] = useStateProvider();
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, allMine: false });
  const [contextMenuState, setContextMenuState] = useState({ visible: false, x: 0, y: 0, options: [], activeMessageId: null });
  
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const [firstItemIndex, setFirstItemIndex] = useState(1000000); 
  
  const isFetchingRef = useRef(false);
  const virtuosoRef = useRef(null); 

  const activeChatKey = useMemo(() => {
      if (!currentChatUser) return null;
      return currentChatUser.isGroup 
          ? (localStorage.getItem(`group-key-${currentChatUser.id}`) || currentChatUser.id) 
          : getSharedSecretKey(userInfo.id, currentChatUser.id);
  }, [currentChatUser?.id, currentChatUser?.isGroup, userInfo.id]);

  const scrollToBottom = () => {
    if (virtuosoRef.current && messages?.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
    }
  };

  const handleReplyClick = useCallback((replyId) => {
    const index = messages.findIndex(m => m.id === replyId);
    if (index !== -1 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
        
        setTimeout(() => {
            const element = document.getElementById(`msg-${replyId}`);
            if (element) {
                element.classList.add("bg-icon-green/20");
                setTimeout(() => element.classList.remove("bg-icon-green/20"), 2000);
            }
        }, 150); 
    }
  }, [messages]);

  useEffect(() => {
    setHasMoreMessages(true);
    isFetchingRef.current = false;
    dispatch({ type: reducerCases.CLEAR_MESSAGE_SELECTION }); 
    setFirstItemIndex(1000000);
  }, [currentChatUser?.id]);

  const fetchOlderMessages = async () => {
    if (isFetchingRef.current || !hasMoreMessages || !messages || messages.length === 0) return;
    
    isFetchingRef.current = true;
    setIsFetchingMore(true);

    const oldestMessageId = messages[0]?.id; 

    try {
      const { data } = await axios.get(`${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}?cursor=${oldestMessageId}`);
      
      if (data.messages && data.messages.length > 0) {
        const newOlderMessages = data.messages;

        setFirstItemIndex(prev => prev - newOlderMessages.length);

        dispatch({
          type: reducerCases.ADD_OLDER_MESSAGES,
          messages: newOlderMessages, 
          chatId: currentChatUser.id
        });
        
        setHasMoreMessages(data.hasMore);
      } else { 
        setHasMoreMessages(false); 
      }
      
    } catch (err) { 
      console.error("Fetch Error:", err);
    } finally {
      isFetchingRef.current = false;
      setIsFetchingMore(false);
    }
  };

  const showContextMenu = useCallback((e, message, isSender, decryptedText) => {
    e.preventDefault();
    const messageTime = new Date(message?.createdAt).getTime();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    const isEditAllowed = (Date.now() - messageTime) < fifteenMinutesInMs;

    const deleteMessage = (type) => {
      dispatch({ type: reducerCases.DELETE_MESSAGE_LOCALLY, payload: { id: message?.id, type } });
      setContextMenuState(prev => ({ ...prev, visible: false, activeMessageId: null }));
      axios.post(DELETE_MESSAGE_ROUTE, { messageId: message?.id, type }).catch(err => console.error(err));
    };

    let options = [
      { name: "Copy", callback: () => navigator.clipboard.writeText(decryptedText || message?.message) },
      { name: "Reply", callback: () => dispatch({ type: reducerCases.SET_MESSAGE_TO_REPLY, messageToReply: message }) },
      { name: "Select Messages", callback: () => dispatch({ type: reducerCases.SET_MESSAGE_SELECTION_MODE, isSelectionMode: true }) }
    ];

    if (isSender) {
      if (message?.type === "text" && isEditAllowed) {
        options.push({ name: "Edit Message", callback: () => dispatch({ type: reducerCases.SET_MESSAGE_TO_EDIT, messageToEdit: message }) });
      }
      options.push({ name: "Delete for me", callback: () => deleteMessage("me") });
      options.push({ name: "Delete for everyone", callback: () => deleteMessage("everyone") });
    } else {
      options.push({ name: "Delete for me", callback: () => deleteMessage("me") });
    }
    setContextMenuState({ visible: true, x: e.pageX, y: e.pageY, options, activeMessageId: message?.id });
  }, [dispatch]);

  const executeDelete = async (type) => {
    setConfirmDelete({ isOpen: false, allMine: false });
    const messagesToProcess = [...selectedMessages];
    messagesToProcess.forEach(msgId => dispatch({ type: reducerCases.DELETE_MESSAGE_LOCALLY, payload: { id: msgId, type } }));
    dispatch({ type: reducerCases.CLEAR_MESSAGE_SELECTION });
    try {
      await Promise.all(messagesToProcess.map((msgId) => axios.post(DELETE_MESSAGE_ROUTE, { messageId: msgId, type })));
    } catch (error) { console.error(error); }
  };

  const handleDeleteIconClick = () => {
    if (selectedMessages.length === 0) return;
    const allMine = selectedMessages.every(id => messages.find(m => m.id === id)?.senderId === userInfo.id);
    setConfirmDelete({ isOpen: true, allMine });
  };

  return (
    <div className="flex-1 min-h-0 w-full relative z-0 flex flex-col">
      <div className="bg-chat-background bg-fixed h-full w-full opacity-5 fixed left-0 top-0 z-0 pointer-events-none"></div>
      
      <div className="flex-1 w-full relative z-10 my-4 h-full">
        {messages && messages.length > 0 && (
           <Virtuoso
             key={currentChatUser?.id} 
             ref={virtuosoRef}
             className="w-full h-full custom-scrollbar"
             data={messages}
             firstItemIndex={firstItemIndex}
             initialTopMostItemIndex={
                 messages?.length > 0 ? firstItemIndex + messages.length - 1 : 0
             } 
             initialItemCount={Math.min(messages?.length || 0, 20)}
             alignToBottom={true} 
             startReached={fetchOlderMessages} 
             computeItemKey={(index, message) => message?.id || index}
             itemContent={(index, message) => {
                // 🚨 التعديل التاني: لو الرسالة لسه بتحمل، نرجع div ليه طول (40px) بدل null عشان الـ Virtuoso ميضربش كراش
                if (!message) return <div style={{ height: '40px', visibility: 'hidden' }}></div>;
                
                return (
                  <div className="pb-1" style={{ overflowAnchor: 'none' }}> 
                     <SingleMessage 
                        message={message} 
                        userInfo={userInfo} 
                        showContextMenu={showContextMenu} 
                        isActive={contextMenuState.activeMessageId === message?.id} 
                        onReplyClick={handleReplyClick} 
                        chatKey={activeChatKey}
                     />
                  </div>
                )
             }}
             atBottomStateChange={(atBottom) => {
                 setShowScrollButton(!atBottom);
             }}
             followOutput={(isAtBottom) => isAtBottom ? 'auto' : false} 
             components={{
              Header: () => (
                  <div className="h-10 w-full flex justify-center items-center overflow-hidden">
                      {isFetchingMore && (
                          <span className="text-secondary text-sm bg-panel-header-background px-3 py-1 rounded-full animate-pulse">
                              Loading older messages...
                          </span>
                      )}
                  </div>
              ),
              Footer: () => {
                  // 🚨 التعديل الرابع: فقاعة الـ Typing الديناميكية ومحمية بالـ ?. 
                  const typingInfo = isTyping?.typingInfo;
                  const isCurrentlyTyping = typingInfo?.isTyping && typingInfo?.to === currentChatUser?.id && typingInfo?.from !== userInfo?.id;
                  const typingUser = currentChatUser?.isGroup ? currentChatUser?.users?.find(u => u?.id === typingInfo?.from) : null;

                  return (
                      <div className="pb-4 pt-2">
                          {isCurrentlyTyping && (
                              <div className="flex justify-start w-full px-4 mb-2 mt-2">
                                  <div className="flex items-end gap-2">
                                      {currentChatUser?.isGroup && typingUser && (
                                          <div className="mb-1 flex-shrink-0">
                                              <Avatar type="sm" image={typingUser?.profilePicture} />
                                          </div>
                                      )}
                                      <div className="flex flex-col gap-1">
                                          {currentChatUser?.isGroup && typingUser && (
                                              <span className="text-xs font-bold text-[#53bdeb] ml-1">{typingUser?.name}</span>
                                          )}
                                          <div className="bg-incoming-background p-3 px-4 rounded-xl rounded-tl-none flex items-center gap-1 shadow-sm w-fit h-[36px]">
                                              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              }
          }}
           />
        )}
      </div>

      {showScrollButton && (
        <button 
          onClick={scrollToBottom}
          className="fixed bottom-24 right-10 bg-panel-header-background text-icon-green p-3 rounded-full shadow-2xl border border-conversation-border hover:bg-input-background transition-all z-[60] animate-bounce"
          title="Scroll to bottom"
        >
          <BsArrowDown className="text-2xl" />
        </button>
      )}

      {contextMenuState.visible && (
        <ContextMenu
          options={contextMenuState.options}
          cordinates={{ x: contextMenuState.x, y: contextMenuState.y }}
          contextMenu={contextMenuState.visible}
          setContextMenu={(val) => setContextMenuState(prev => ({ ...prev, visible: val, activeMessageId: val ? prev.activeMessageId : null }))}
        />
      )}

      {isSelectionMode && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-panel-header-background rounded-full px-6 py-3 z-50 flex items-center justify-between min-w-[300px] shadow-lg border border-conversation-border animate-slide-up">
          <div className="flex items-center gap-4">
            <IoClose className="text-2xl cursor-pointer text-icon-lighter hover:text-white transition-colors" onClick={() => dispatch({ type: reducerCases.CLEAR_MESSAGE_SELECTION })} />
            <span className="text-white font-semibold">{selectedMessages.length} Selected</span>
          </div>
          <div className="flex items-center gap-6">
            <MdOutlineTurnRight className={`text-2xl cursor-pointer transition-colors ${selectedMessages.length > 0 ? "text-icon-lighter hover:text-white" : "text-icon-lighter/30 cursor-not-allowed"}`} onClick={() => selectedMessages.length > 0 && console.log("Forward logic here")} title="Forward Messages" />
            <MdDelete className={`text-2xl cursor-pointer transition-colors ${selectedMessages.length > 0 ? "text-icon-lighter hover:text-red-500" : "text-icon-lighter/30 cursor-not-allowed"}`} onClick={handleDeleteIconClick} title="Delete Messages" />
          </div>
        </div>
      )}

      {confirmDelete.isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[90]" onClick={() => setConfirmDelete({ isOpen: false, allMine: false })}></div>
          <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-dropdown-background shadow-2xl border border-conversation-border rounded-lg p-5 z-[100] w-[350px] flex flex-col gap-5 animate-slide-down">
            <span className="text-white text-lg font-medium">Delete {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''}?</span>
            <div className="flex flex-col gap-2">
              {confirmDelete.allMine && <button className="text-[#f15c6d] hover:bg-background-default-hover px-4 py-3 rounded text-right transition-colors font-medium" onClick={() => executeDelete("everyone")}>Delete for everyone</button>}
              <button className="text-[#f15c6d] hover:bg-background-default-hover px-4 py-3 rounded text-right transition-colors font-medium" onClick={() => executeDelete("me")}>Delete for me</button>
              <button className="text-icon-green hover:bg-background-default-hover border border-icon-green/20 px-4 py-3 rounded text-center transition-colors font-medium mt-2" onClick={() => setConfirmDelete({ isOpen: false, allMine: false })}>Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatContainer;