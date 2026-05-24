import React from "react";
import ChatHeader from "./ChatHeader";
import ChatContainer from "./ChatContainer";
import MessageBar from "./MessageBar";
import { useStateProvider } from "@/context/StateContext";

function Chat({ setShowGroupInfo }) {
  const [{ userInfo, currentChatUser }] = useStateProvider();

  // 🚨 التحقق مما إذا كان المستخدم الحالي قد قام بحظر جهة الاتصال هذه
  const isBlocked = userInfo?.blockedUsers?.includes(currentChatUser?.id);

  return (
    <div className="border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col h-[100vh] z-10 relative">
      
      {/* الهيدر العلوي */}
      <ChatHeader setShowGroupInfo={setShowGroupInfo} />
      
      {/* منطقة الرسائل */}
      <ChatContainer />
      
      {/* 🚨 التحكم في شريط الإدخال بناءً على حالة الحظر */}
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