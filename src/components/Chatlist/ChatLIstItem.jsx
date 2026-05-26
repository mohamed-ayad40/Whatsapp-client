import React, { useEffect, useState } from "react";
import Avatar from "../common/Avatar";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import { calculateTime } from "@/utils/CalculateTime";
import MessageStatus from "../common/MessageStatus";
import { FaCamera, FaMicrophone, FaCheckCircle } from "react-icons/fa"; 
import ContextMenu from "../common/ContextMenu"; // 🚨 استيراد القائمة السريعة

function ChatListItem({ data, isContactsPage = false, isSelectionMode = false, isSelected = false, onSelect }) {
  const [{ userInfo, currentChatUser, isTyping, userContacts }, dispatch] = useStateProvider();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [chat, setChat] = useState(data);

  // 🚨 حالات الـ Quick Actions Menu
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuCordinates, setContextMenuCordinates] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setChat(data);
  }, [data, userContacts]);

  useEffect(() => {
    setTotalUnreadMessages(chat.totalUnreadMessages || 0);
  }, [chat]);

  const handleContactClick = () => {
    if (isSelectionMode) {
      if (onSelect) onSelect(data.id);
      return;
    }

    if (currentChatUser?.id === data.id) return;

    const isGroup = data.isGroup;
    const contactId = isGroup 
      ? data.id 
      : (userInfo.id === data.senderId ? data.receiverId : data.senderId);

    if (!isContactsPage) {
      setTotalUnreadMessages(0);
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: { ...data, id: contactId },
      });
    } else {
      dispatch({ type: reducerCases.CHANGE_CURRENT_CHAT_USER, user: { ...data } });
      dispatch({ type: reducerCases.SET_ALL_CONTACTS_PAGE });
    }
  };

  // 🚨 دالة فتح القائمة السريعة للأفاتار
  const showQuickActions = (e) => {
    e.preventDefault();
    e.stopPropagation(); // عشان الكليك ميسمعش في الـ Parent ويفتح الشات
    setContextMenuCordinates({ x: e.pageX, y: e.pageY });
    setIsContextMenuVisible(true);
  };

  // 🚨 خيارات القائمة السريعة للـ Avatar
  const quickActionOptions = [
    {
      name: "Text Message",
      callback: () => {
        handleContactClick(); // يفتح الشات
      },
    },
    {
      name: "Voice Call",
      callback: () => {
        dispatch({
          type: reducerCases.SET_VOICE_CALL,
          voiceCall: { ...data, type: "out-going", callType: "voice", roomId: Date.now() },
        });
      },
    },
    {
      name: "Video Call",
      callback: () => {
        dispatch({
          type: reducerCases.SET_VIDEO_CALL,
          videoCall: { ...data, type: "out-going", callType: "video", roomId: Date.now() },
        });
      },
    }
  ];

  const typingInfo = isTyping?.typingInfo;
  
  const isThisChatTyping = typingInfo?.isTyping && (
    (!data.isGroup && typingInfo.to === userInfo?.id && typingInfo.from === data.id) || 
    (data.isGroup && typingInfo.to === data.id && typingInfo.from !== userInfo?.id)     
  );

  const typingUser = data.isGroup && isThisChatTyping 
    ? data.users?.find(u => u.id === typingInfo.from) 
    : null;

  return (
    <div
      onClick={handleContactClick}
      className={`relative flex cursor-pointer items-center hover:bg-background-default-hover transition-all ${
        currentChatUser?.id === data.id || isSelected ? "bg-background-default-hover" : ""
      }`}
    >
      {isSelectionMode && isSelected && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-icon-green z-10 animate-fade-in">
          <FaCheckCircle size={20} />
        </div>
      )}

      {/* 🚨 تغليف الأفاتار بـ div مخصص للكليك عليه لوحده */}
      <div 
        className="min-w-fit px-5 pt-3 pb-1"
        onClick={showQuickActions} // يفتح القايمة السريعة
      >
        <Avatar type="lg" image={data?.profilePicture} />
      </div>

      <div className="min-h-full flex flex-col justify-center mt-3 pr-2 w-full">
        <div className="flex justify-between">
          <div>
            <span className="text-white">{data?.name}</span>
          </div>
          {!isContactsPage && !isSelectionMode && (
            <div>
              <span className={`${totalUnreadMessages > 0 ? "text-icon-green" : "text-secondary"} text-sm`}>
                {calculateTime(data?.createdAt)}
              </span>
            </div>
          )}
        </div>
        <div className="flex border-b border-conversation-border pb-2 pt-1 pr-2">
          <div className="flex justify-between w-full">
            <span className="text-secondary line-clamp-1 text-sm">
              {isContactsPage || isSelectionMode ? (
                data?.about || "\u00A0"
              ) : (
                <div className="flex items-center gap-1 max-w-[200px] sm:max-w-[250px]">
                  {isThisChatTyping ? (
                    <span className="text-icon-green truncate">
                      {data.isGroup ? `${typingUser?.name || 'Someone'} is typing...` : "typing..."}
                    </span>
                  ) : (
                    <>
                      {data?.senderId === userInfo?.id && (
                        <MessageStatus 
                          messageStatus={data?.messageStatus} 
                          isGroup={data?.isGroup}
                          seenCount={data?.seenCount}
                          totalMembers={data?.userIds?.length || data?.users?.length || 0}
                        />
                      )}
                      {data?.type === "text" && <span className="truncate">{data?.message}</span>}
                      {data?.type === "audio" && <span className="flex gap-1 items-center"><FaMicrophone /> Audio</span>}
                      {data?.type === "image" && <span className="flex gap-1 items-center"><FaCamera /> Image</span>}
                    </>
                  )}
                </div>
              )}
            </span>
            {totalUnreadMessages > 0 && !isSelectionMode && (
              <span className="bg-icon-green px-[5px] rounded-full text-sm text-white">
                {totalUnreadMessages}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🚨 عرض القائمة السريعة للـ Quick Actions */}
      {isContextMenuVisible && (
        <ContextMenu 
          options={quickActionOptions} 
          cordinates={contextMenuCordinates} 
          contextMenu={isContextMenuVisible} 
          setContextMenu={setIsContextMenuVisible} 
        />
      )}
    </div>
  );
}

export default ChatListItem;