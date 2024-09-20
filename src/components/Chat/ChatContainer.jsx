import { useStateProvider } from "@/context/StateContext";
import { calculateTime } from "@/utils/CalculateTime";
import React, { useEffect, useRef } from "react";
import MessageStatus from "../common/MessageStatus";
import ImageMessage from "./ImageMessage";
import dynamic from "next/dynamic";

const VoiceMessage = dynamic(() => import("./VoiceMessage"), { ssr: false });

function ChatContainer() {
  const [{ messages, currentChatUser, userInfo }] = useStateProvider();
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    // Scroll into view first
    // 

    // Then scroll a bit more manually
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // scroll
      // chatContainerRef.current?.scrollBy(0, window.innerHeight * 3); // Scroll 20px more down
    }, 300); // Delay to allow smooth scroll to finish
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      className="h-[80vh] w-full relative flex-grow overflow-auto custom-scrollbar"
      ref={chatContainerRef} // Reference the chat container
    >
      <div className="bg-chat-background bg-fixed h-full w-full opacity-5 fixed left-0 top-0 z-0"></div>
      <div className="mx-10 my-6 relative bottom-0 z-40 left-0">
        <div className="flex w-full">
          <div className="flex flex-col justify-end w-full gap-1 overflow-auto">
            {messages?.map((message, index) => (
              <div
                key={message?.id}
                className={`flex ${
                  message?.senderId === currentChatUser.id
                    ? "justify-start"
                    : "justify-end"
                }`}
              >
                {message?.type === "text" && (
                  <div
                    className={`text-white px-2 py-[5px] text-sm rounded-md flex gap-2 items-end max-w-[45%] ${
                      message?.senderId === currentChatUser.id
                        ? "bg-incoming-background"
                        : "bg-outgoing-background"
                    }`}
                  >
                    <span className="break-all pb-1">{message?.message}</span>
                    <div className="flex gap-1 items-end">
                      <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
                        {calculateTime(message?.createdAt)}
                      </span>
                      {message?.senderId === userInfo?.id && (
                        <MessageStatus messageStatus={message?.messageStatus} />
                      )}
                    </div>
                  </div>
                )}
                {message?.type === "image" && <ImageMessage message={message} />}
                {message?.type === "audio" && <VoiceMessage message={message} />}
              </div>
            ))}
            {/* Adding a bit of margin at the bottom for extra spacing */}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;
