import React, { useState } from "react";
import Avatar from "../common/Avatar";
import { MdCall } from "react-icons/md";
import { IoVideocam } from "react-icons/io5";
import { BiSearchAlt2 } from "react-icons/bi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import ContextMenu from "../common/ContextMenu";
import { calculateTime } from "@/utils/CalculateTime";
import axios from "axios";
import { DELETE_CHAT_ROUTE, EXIT_GROUP_ROUTE } from "@/utils/ApiRoutes";
import { deleteLocalChat } from "@/utils/LocalDatabase";

// استقبلنا الـ Prop اللي بتبدل بين الشات والـ Group Info
function ChatHeader({ setShowGroupInfo }) {
  // ضفنا userInfo و socket هنا عشان نستخدمهم في الأكشنز
  const [{ currentChatUser, onlineUsers, isTyping, userInfo, socket }, dispatch] = useStateProvider();

  const [contextMenuCordinates, setContextMenuCordinates] = useState({
    x: 0,
    y: 0,
  });

  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);

  const showContextMenu = (e) => {
    e.preventDefault();
    setContextMenuCordinates({ x: e.pageX - 50, y: e.pageY + 20 });
    setIsContextMenuVisible(true);
  };

  // --- [أكشن حذف الشات الفردي] ---
  const handleDeleteChat = async () => {
    try {
      await axios.post(DELETE_CHAT_ROUTE, { 
          userId: userInfo.id, 
          chatId: currentChatUser.id 
      });
      await deleteLocalChat(currentChatUser.id);
      dispatch({ type: reducerCases.DELETE_CHAT, chatId: currentChatUser.id });
    } catch (err) {
      console.log("Error deleting chat:", err);
    }
  };

  // --- [أكشن الخروج من الجروب] ---
  const handleExitGroup = async () => {
    try {
      await axios.post(EXIT_GROUP_ROUTE, { 
          userId: userInfo.id, 
          groupId: currentChatUser.id 
      });
      socket.current.emit("leave-group", { 
          userId: userInfo.id, 
          groupId: currentChatUser.id 
      });
      await deleteLocalChat(currentChatUser.id);
      dispatch({ type: reducerCases.EXIT_GROUP, groupId: currentChatUser.id });
    } catch (err) {
      console.log("Error exiting group:", err);
    }
  };

  const contextMenuOptions = [
    {
      name: currentChatUser?.isGroup ? "Exit Group" : "Delete Chat",
      callback: () => {
        if (currentChatUser?.isGroup) handleExitGroup();
        else handleDeleteChat();
        setIsContextMenuVisible(false);
      },
    },
    {
      name: "Close Chat",
      callback: async () => {
        dispatch({ type: reducerCases.SET_EXIT_CHAT });
        setIsContextMenuVisible(false);
      },
    },
  ];

  const handleVoiceCall = () => {
    dispatch({
      type: reducerCases.SET_VOICE_CALL,
      voiceCall: {
        ...currentChatUser,
        type: "out-going",
        callType: "voice",
        roomId: Date.now(),
      },
    });
  };

  const handleVideoCall = () => {
    dispatch({
      type: reducerCases.SET_VIDEO_CALL,
      videoCall: {
        ...currentChatUser,
        type: "out-going",
        callType: "video",
        roomId: Date.now(),
      },
    });
  };

  return (
    <div className="h-16 px-4 py-3 flex justify-between items-center bg-panel-header-background z-50 flex-shrink-0 border-b border-conversation-border">
      
      {/* 1. منطقة المعلومات - بتفتح السايدبار المناسب */}
      <div 
        className={`flex items-center gap-6 cursor-pointer min-w-0 flex-1 group`}
        onClick={() => {
          if (currentChatUser?.isGroup) setShowGroupInfo(true);
          else dispatch({ type: reducerCases.SET_SHOW_USER_INFO });
        }}
      >
        <div className="flex-shrink-0">
          <Avatar type="sm" image={currentChatUser?.profilePicture} />
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-primary-strong truncate font-medium">
            {currentChatUser?.name}
          </span>
          <span className="text-secondary text-xs truncate">
            {currentChatUser?.isGroup
              ? currentChatUser.users?.map((u) => u.name).join(", ")
              : isTyping?.typingInfo?.isTyping && currentChatUser?.id === isTyping?.typingInfo?.from
              ? "typing..."
              : onlineUsers.includes(currentChatUser?.id)
              ? "Online"
              : currentChatUser?.lastSeen
              ? `Last seen ${calculateTime(currentChatUser.lastSeen)}`
              : "Offline"}
          </span>
        </div>
      </div>

      {/* 2. منطقة الأيقونات */}
      <div className="flex gap-6 flex-shrink-0 ml-4">
        <MdCall 
          onClick={handleVoiceCall} 
          className="text-panel-header-icon cursor-pointer text-xl hover:text-white transition-all" 
        />
        <IoVideocam 
          onClick={handleVideoCall} 
          className="text-panel-header-icon cursor-pointer text-xl hover:text-white transition-all" 
        />
        <BiSearchAlt2 
          className="text-panel-header-icon cursor-pointer text-xl hover:text-white transition-all" 
          onClick={() => dispatch({ type: reducerCases.SET_MESSAGE_SEARCH })} 
        />
        <BsThreeDotsVertical 
          id="context-opener" 
          onClick={(e) => showContextMenu(e)} 
          className="text-panel-header-icon cursor-pointer text-xl hover:text-white transition-all" 
        />
        
        {isContextMenuVisible && (
          <ContextMenu
            options={contextMenuOptions}
            cordinates={contextMenuCordinates}
            contextMenu={isContextMenuVisible}
            setContextMenu={setIsContextMenuVisible}
          />
        )}
      </div>
    </div>
  );
}

export default ChatHeader;