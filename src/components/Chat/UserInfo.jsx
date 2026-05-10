import React, { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import Avatar from "../common/Avatar";
import { MdBlock, MdDelete, MdChevronRight } from "react-icons/md";
import { getLocalMessages } from "@/utils/LocalDatabase";
import { HOST } from "@/utils/ApiRoutes";

function UserInfo() {
  const [{ currentChatUser }, dispatch] = useStateProvider();
  const [sharedMedia, setSharedMedia] = useState([]);

  useEffect(() => {
    const fetchMedia = async () => {
      const allMsgs = await getLocalMessages(currentChatUser.id);
      setSharedMedia(allMsgs.filter(m => m.type === "image").slice(0, 6));
    };
    if (currentChatUser) fetchMedia();
  }, [currentChatUser]);

  return (
    // أضفنا animate-sidebar هنا للأنيميشن
    <div className="flex flex-col bg-[#0b141a] h-full w-full border-l border-conversation-border animate-sidebar">
      
      {/* Header - ثابت فوق */}
      <div className="h-16 px-6 py-5 flex items-center gap-6 bg-[#202c33] text-primary-strong shadow-md">
        <IoClose 
          className="cursor-pointer text-2xl text-icon-lighter hover:text-white transition-all" 
          onClick={() => dispatch({ type: reducerCases.SET_SHOW_USER_INFO })} 
        />
        <span className="font-medium">Contact Info</span>
      </div>

      <div className="overflow-y-auto custom-scrollbar h-full bg-[#0b141a]">
        
        {/* بروفايل اليوزر - تركيز على الصورة */}
        <div className="flex flex-col items-center justify-center py-8 bg-[#111b21] mb-2 shadow-sm">
          <div className="mb-4 transform transition-transform hover:scale-105 duration-300">
            <Avatar type="xl" image={currentChatUser?.profilePicture} />
          </div>
          <h2 className="text-white text-2xl font-normal">{currentChatUser?.name}</h2>
          <span className="text-[#8696a0] text-sm">{currentChatUser?.email}</span>
        </div>

        {/* About Section - Card Style */}
        <div className="info-card">
          <span className="text-[#8696a0] text-sm mb-2 block">About</span>
          <p className="text-[#e9edef] text-base leading-relaxed">
            {currentChatUser?.about || "Available"}
          </p>
        </div>

        {/* Shared Media - تحسين عرض الصور */}
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
              <div key={m.id} className="relative aspect-square overflow-hidden rounded-md bg-[#202c33] cursor-pointer hover:brightness-110 transition-all">
                <img src={`${HOST}/${m.message}`} className="h-full w-full object-cover" alt="media" />
              </div>
            )) : (
              <p className="text-[#8696a0] text-xs col-span-3 py-4 text-center">No media shared yet</p>
            )}
          </div>
        </div>

        {/* Settings & Actions - Danger Zone */}
        <div className="mt-2 space-y-[2px]">
          <div className="info-card flex items-center gap-6 text-[#ef4444] cursor-pointer group">
            <MdBlock className="text-2xl group-hover:scale-110 transition-transform" />
            <span className="flex-1">Block {currentChatUser?.name}</span>
          </div>
          
          <div className="info-card flex items-center gap-6 text-[#ef4444] cursor-pointer group">
            <MdDelete className="text-2xl group-hover:scale-110 transition-transform" />
            <span className="flex-1">Delete Chat</span>
          </div>
        </div>

        <div className="h-20 bg-[#0b141a]"></div> {/* مساحة للنهاية */}
      </div>
    </div>
  );
}

export default UserInfo;