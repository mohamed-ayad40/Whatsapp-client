import React, { useState } from "react";
import Avatar from "../common/Avatar";
import { MdCall } from "react-icons/md";
import { IoVideocam } from "react-icons/io5";
import { BiSearchAlt2 } from "react-icons/bi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import ContextMenu from "../common/ContextMenu";

function ChatHeader() {
  const [{currentChatUser, onlineUsers, isTyping}, dispatch] = useStateProvider();

  const [contextMenuCordinates, setContextMenuCordinates] = useState({
    x: 0,
    y: 0,
  });

  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);

  const showContextMenu = (e) => {
    e.preventDefault();
    setContextMenuCordinates({x: e.pageX - 50, y: e.pageY + 20});
    setIsContextMenuVisible(true);
  };

  const contextMenuOptions = [
    {
      name: "Exit",
      callback: async () => {
        dispatch({ type: reducerCases.SET_EXIT_CHAT})
      }
    }
  ]



  const handleVoiceCall = () => {
    dispatch({
      type: reducerCases.SET_VOICE_CALL,
      voiceCall: {
        ...currentChatUser,
        type: "out-going",
        callType: "voice",
        roomId: Date.now(),
      }
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
      }
    });
  };

  return <div className="h-16 px-4 py-3 flex justify-between items-center bg-panel-header-background z-10">
    <div className="flex items-center justify-center gap-6">
      <Avatar type="sm" image={currentChatUser?.profilePicture} />
      <div className="flex flex-col">
        <span className="text-primary-strong">{currentChatUser?.name}</span>
        <span className="text-secondary text-sm">
          {isTyping?.typingInfo?.isTyping && currentChatUser?.id === isTyping?.typingInfo?.from ? "typing..." : onlineUsers.includes(currentChatUser.id) ? "Online" : "Offline"}
        </span>
      </div>
    </div>
    <div className="flex gap-6">
      <MdCall onClick={handleVoiceCall} className="text-panel-header-icon cursor-pointer text-xl" />
      <IoVideocam onClick={handleVideoCall} className="text-panel-header-icon cursor-pointer text-xl" />
      <BiSearchAlt2 className="text-panel-header-icon cursor-pointer text-xl" onClick={() => dispatch({type: reducerCases.SET_MESSAGE_SEARCH})} />
      <BsThreeDotsVertical id="context-opener" onClick={(e) => showContextMenu(e)} className="text-panel-header-icon cursor-pointer text-xl" />
      {isContextMenuVisible && (
        <ContextMenu options={contextMenuOptions} cordinates={contextMenuCordinates} contextMenu={isContextMenuVisible} setContextMenu={setIsContextMenuVisible} />
      )}
    </div>
  </div>;
}

export default ChatHeader;
