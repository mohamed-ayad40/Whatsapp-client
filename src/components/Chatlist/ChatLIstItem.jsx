import React, { useEffect, useState } from "react";
import Avatar from "../common/Avatar";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import { calculateTime } from "@/utils/CalculateTime";
import MessageStatus from "../common/MessageStatus";
import { FaCamera, FaMicrophone } from "react-icons/fa";

function ChatLIstItem({data, isContactsPage = false}) {
  const [{socket, userInfo, currentChatUser, isTyping, messages, userContacts}, dispatch]= useStateProvider();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  // const [test, setTest] = useState(messages);
  const [chat, setChat] = useState(data);
  useEffect(() => {
    console.log(data);
    setChat(data);
  }, [messages, userContacts]);
  useEffect(() => {
    setTotalUnreadMessages(chat.totalUnreadMessages);
  }, [chat]);

  const handleContactClick = () => {
    // if(currentChatUser?.id === data?.id) {
    
    if(!isContactsPage) {
      setTotalUnreadMessages(() => {
        return 0
      })
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: {
          name: data.name,
          about: data.about,
          profilePicture: data.profilePicture,
          email: data.email,
          id: userInfo.id === data.senderId ? data.receiverId : data.senderId
        }
      })

    } else {
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: {...data}
      })
      dispatch({
        type: reducerCases.SET_ALL_CONTACTS_PAGE,
      })
    }
    // }
  };
  return (
    <div onClick={handleContactClick} className={`flex cursor-pointer items-center hover:bg-background-default-hover`}>
      <div className="min-w-fit px-5 pt-3 pb-1">
        <Avatar type="lg" image={data?.profilePicture} />
      </div>
      <div className="min-h-full flex flex-col justify-center mt-3 pr-2 w-full">
        <div className="flex justify-between">
          <div>
            <span className="text-white">{data?.name}</span>
          </div>
          {
            !isContactsPage && (
              <div className="">
                <span className={`${!totalUnreadMessages > 0 ? "text-secondary" : "text-icon-green"} text-sm`}>
                  {calculateTime(chat?.createdAt)}
                </span>
              </div>
            )
          }
        </div>
        <div className="flex border-b border-conversation-border pb-2 pt-1 pr-2">
          <div className="flex justify-between w-full">
            <span className="text-secondary line-clamp-1 text-sm">{isContactsPage ? data?.about || "\u00A0" : (
              <div className="flex items-center gap-1 max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[200px] xl:max-w-[300px]">
                {isTyping?.typingInfo?.isTyping &&  userInfo?.id === isTyping?.typingInfo?.to && isTyping?.typingInfo?.from === data?.id ? "typing..." : ( <>
                  {chat?.senderId === userInfo.id && <MessageStatus messageStatus={chat?.messageStatus} />}
                  {chat?.type === "text" && <span className="truncate">{chat?.message}</span>}
                  {chat?.type === "audio" && (<span className="flex gap-1 items-center"><FaMicrophone className="text-panel-header-icon" />Audio</span>)}
                  {chat?.type === "image" && (<span className="flex gap-1 items-center"><FaCamera className="text-panel-header-icon" />Image</span>)}
                  </>)}
              </div>
            )}</span>
            {
              <span className={`${totalUnreadMessages && "bg-icon-green px-[5px] rounded-full text-sm"}`}>{totalUnreadMessages || ""}</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatLIstItem;