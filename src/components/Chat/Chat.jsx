import React, { useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatContainer from "./ChatContainer";
import MessageBar from "./MessageBar";
import { useStateProvider } from "@/context/StateContext";

function Chat({ setShowGroupInfo }) {
  const [{ userInfo, currentChatUser }] = useStateProvider();

  const isBlocked = userInfo?.blockedUsers?.includes(currentChatUser?.id);

  // 🚨 الحل القاطع لمشكلة الـ State Leakage (تداخل بيانات الجروب مع الشخصي)
  // كل ما الشات يتغير، بنقفل السايدبار بتاع الجروب أوتوماتيك عشان ميحتفظش بالبيانات القديمة
  useEffect(() => {
    if (setShowGroupInfo) {
      setShowGroupInfo(false);
    }
  }, [currentChatUser?.id, setShowGroupInfo]);

  return (
    <div className="border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col h-[100vh] z-10 relative">
      
      <ChatHeader setShowGroupInfo={setShowGroupInfo} />
      <ChatContainer />
      
      {isBlocked ? (
        <div className="h-20 bg-panel-header-background flex items-center justify-center text-secondary text-sm border-t border-conversation-border">
            You blocked this contact. Unblock to send a message.
        </div>
      ) : (
        <MessageBar />
      )}
      
    </div>
  );
}

export default Chat;