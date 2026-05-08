import React, { useEffect, useState } from "react";
import Avatar from "../common/Avatar";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import { calculateTime } from "@/utils/CalculateTime";
import MessageStatus from "../common/MessageStatus";
import { FaCamera, FaMicrophone } from "react-icons/fa";

function ChatListItem({ data, isContactsPage = false }) {
  const [{ userInfo, currentChatUser, isTyping, userContacts }, dispatch] = useStateProvider();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [chat, setChat] = useState(data);

  useEffect(() => {
    setChat(data);
  }, [data, userContacts]); // عدلنا الـ dependency عشان يستجيب للتغيير في data

  useEffect(() => {
    setTotalUnreadMessages(chat.totalUnreadMessages);
  }, [chat]);

  const handleContactClick = () => {
    if (currentChatUser?.id === data.id) return;

    // --- السحر هنا: حساب الـ ID والبيانات بناءً على نوع الشات ---
    const isGroup = data.isGroup;
    
    // لو جروب بناخد الـ ID بتاعه، لو فردي بنطبق حسبتك القديمة
    const contactId = isGroup 
      ? data.id 
      : (userInfo.id === data.senderId ? data.receiverId : data.senderId);

    if (!isContactsPage) {
      setTotalUnreadMessages(0);
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: {
          ...data, // بنبعت كل البيانات (بما فيها isGroup و users و adminIds)
          id: contactId,
        },
      });
    } else {
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: { ...data },
      });
      dispatch({
        type: reducerCases.SET_ALL_CONTACTS_PAGE,
      });
    }
  };

  return (
    <div
      onClick={handleContactClick}
      className={`flex cursor-pointer items-center hover:bg-background-default-hover ${
        currentChatUser?.id === data.id ? "bg-background-default-hover" : ""
      }`}
    >
      <div className="min-w-fit px-5 pt-3 pb-1">
        <Avatar type="lg" image={data?.profilePicture} />
      </div>
      <div className="min-h-full flex flex-col justify-center mt-3 pr-2 w-full">
        <div className="flex justify-between">
          <div>
            <span className="text-white">{data?.name}</span>
          </div>
          {!isContactsPage && (
            <div>
              <span
                className={`${
                  totalUnreadMessages > 0 ? "text-icon-green" : "text-secondary"
                } text-sm`}
              >
                {calculateTime(data?.createdAt)}
              </span>
            </div>
          )}
        </div>
        <div className="flex border-b border-conversation-border pb-2 pt-1 pr-2">
          <div className="flex justify-between w-full">
            <span className="text-secondary line-clamp-1 text-sm">
              {isContactsPage ? (
                data?.about || "\u00A0"
              ) : (
                <div className="flex items-center gap-1 max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[200px] xl:max-w-[300px]">
                  {/* لوجيك الـ Typing للفردي فقط حالياً */}
                  {!data.isGroup &&
                  isTyping?.typingInfo?.isTyping &&
                  userInfo?.id === isTyping?.typingInfo?.to &&
                  isTyping?.typingInfo?.from === data?.id ? (
                    <span className="text-icon-green">typing...</span>
                  ) : (
                    <>
                      {data?.senderId === userInfo?.id && !data.isGroup && (
                        <MessageStatus messageStatus={data?.messageStatus} />
                      )}
                      {data?.type === "text" && (
                        <span className="truncate">{data?.message}</span>
                      )}
                      {data?.type === "audio" && (
                        <span className="flex gap-1 items-center">
                          <FaMicrophone className="text-panel-header-icon" />
                          Audio
                        </span>
                      )}
                      {data?.type === "image" && (
                        <span className="flex gap-1 items-center">
                          <FaCamera className="text-panel-header-icon" />
                          Image
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </span>
            {totalUnreadMessages > 0 && (
              <span className="bg-icon-green px-[5px] rounded-full text-sm text-white">
                {totalUnreadMessages}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatListItem;