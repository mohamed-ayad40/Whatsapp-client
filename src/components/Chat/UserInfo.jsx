import React, { useEffect, useState, useMemo } from "react";
import { IoClose } from "react-icons/io5";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import Avatar from "../common/Avatar";
import { MdBlock, MdDelete, MdChevronRight } from "react-icons/md";
import { getLocalMessages, deleteLocalChat } from "@/utils/LocalDatabase";
import { HOST, TOGGLE_BLOCK_USER_ROUTE, DELETE_CHAT_ROUTE } from "@/utils/ApiRoutes";
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";
import axios from "axios";

function UserInfo() {
  const [{ currentChatUser, userInfo, messages }, dispatch] = useStateProvider();
  const [sharedMedia, setSharedMedia] = useState([]);

  const isBlocked = useMemo(() => {
    return userInfo?.blockedUsers?.includes(currentChatUser?.id);
  }, [userInfo?.blockedUsers, currentChatUser?.id]);

  useEffect(() => {
    const fetchMedia = async () => {
      if (!currentChatUser) return;

      const allMsgs = await getLocalMessages(currentChatUser.id);
      const imageMsgs = allMsgs.filter(m => m.type === "image");

      const chatKey = currentChatUser?.isGroup
        ? localStorage.getItem(`group-key-${currentChatUser.id}`)
        : getSharedSecretKey(userInfo.id, currentChatUser.id);

      const decodedMedia = imageMsgs.map(msg => {
        let url = decryptText(msg.message, chatKey);
        if (url && url.startsWith("U2Fsd")) return null;
        if (url && !url.startsWith("http")) url = `${HOST}/${url}`;
        return { ...msg, decryptedUrl: url };
      }).filter(Boolean).slice(0, 6);

      setSharedMedia(decodedMedia);
    };

    fetchMedia();
  }, [currentChatUser, userInfo.id, messages]);

  const handleBlockUser = async () => {
    const updatedBlockedUsers = isBlocked
      ? userInfo.blockedUsers.filter(id => id !== currentChatUser.id)
      : [...(userInfo.blockedUsers || []), currentChatUser.id];

    dispatch({
      type: reducerCases.SET_USER_INFO,
      userInfo: { ...userInfo, blockedUsers: updatedBlockedUsers }
    });

    try {
      await axios.post(TOGGLE_BLOCK_USER_ROUTE, {
        userId: userInfo.id,
        targetId: currentChatUser.id
      });
    } catch (err) {
      console.error("Error toggling block:", err);
    }
  };

  const handleDeleteChat = async () => {
    dispatch({ type: reducerCases.DELETE_CHAT, chatId: currentChatUser.id });
    dispatch({ type: reducerCases.SET_SHOW_USER_INFO });

    try {
      await deleteLocalChat(currentChatUser.id);
      await axios.post(DELETE_CHAT_ROUTE, { userId: userInfo.id, chatId: currentChatUser.id });
    } catch (err) {
      console.log("Error deleting chat:", err);
    }
  };

  return (
    <div className="flex flex-col bg-[#0b141a] h-full w-full border-l border-conversation-border animate-sidebar z-30 relative">
      <div className="h-16 px-6 flex items-center gap-6 bg-[#202c33] text-primary-strong shadow-md shrink-0">
        <IoClose className="cursor-pointer text-2xl text-icon-lighter hover:text-white transition-all" onClick={() => dispatch({ type: reducerCases.SET_SHOW_USER_INFO })} />
        <span className="font-medium">Contact Info</span>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1 bg-[#0b141a]">
        <div className="flex flex-col items-center justify-center py-8 bg-[#111b21] mb-2 shadow-sm">
          
          <div 
             className="mb-4 cursor-pointer transform transition-transform hover:scale-105 duration-300"
             onClick={(e) => {
                if(e.target.id === 'context-opener' || e.target.closest('#context-opener')) return;
                
                if (currentChatUser?.profilePicture) {
                   dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: currentChatUser.profilePicture });
                }
             }}
          >
            {/* 🚨 هنا محمية تماماً بـ viewOnly={true} */}
            <Avatar type="xl" image={currentChatUser?.profilePicture} viewOnly={true} />
          </div>
          
          <h2 className="text-white text-2xl font-normal">{currentChatUser?.name}</h2>
          <span className="text-[#8696a0] text-sm">{currentChatUser?.email}</span>
        </div>

        <div className="info-card">
          <span className="text-[#8696a0] text-sm mb-2 block">About</span>
          <p className="text-[#e9edef] text-base leading-relaxed">
            {currentChatUser?.about || "Available"}
          </p>
        </div>

        <div className="info-card">
          <div className="flex justify-between items-center mb-4 cursor-pointer group">
            <span className="text-[#8696a0] text-sm">Media, links and docs</span>
            <div className="flex items-center text-[#8696a0] group-hover:text-icon-green transition-all">
              <span className="text-xs">{sharedMedia.length}</span>
              <MdChevronRight className="text-xl" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {sharedMedia.length > 0 ? sharedMedia.map(m => (
              <div key={m.id} className="relative aspect-square overflow-hidden rounded-md bg-[#202c33] cursor-pointer hover:brightness-110 transition-all"
                   onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: m.decryptedUrl })}>
                <img src={m.decryptedUrl} className="h-full w-full object-cover" alt="media" />
              </div>
            )) : (
              <p className="text-[#8696a0] text-xs col-span-3 py-4 text-center">No media shared yet</p>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-[2px]">
          {!currentChatUser?.isGroup && (
            <div onClick={handleBlockUser} className="info-card flex items-center gap-6 text-[#ef4444] cursor-pointer group">
              <MdBlock className="text-2xl group-hover:scale-110 transition-transform" />
              <span className="flex-1">{isBlocked ? `Unblock ${currentChatUser?.name}` : `Block ${currentChatUser?.name}`}</span>
            </div>
          )}

          <div onClick={handleDeleteChat} className="info-card flex items-center gap-6 text-[#ef4444] cursor-pointer group">
            <MdDelete className="text-2xl group-hover:scale-110 transition-transform" />
            <span className="flex-1">Delete Chat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserInfo;