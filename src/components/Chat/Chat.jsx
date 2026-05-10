import React from "react";
import ChatHeader from "./ChatHeader";
import ChatContainer from "./ChatContainer";
import MessageBar from "./MessageBar";

function Chat( {setShowGroupInfo} ) {
  return (<div className="border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col h-[100vh] z-10 relative">
    <ChatHeader setShowGroupInfo={setShowGroupInfo} />
    <ChatContainer />
    <MessageBar />
  </div>);
}

export default Chat;
