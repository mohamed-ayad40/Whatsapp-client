import { useStateProvider } from "@/context/StateContext";
import Image from "next/image";
import React from "react";
import MessageStatus from "../common/MessageStatus";
import { HOST } from "@/utils/ApiRoutes";
import { calculateTime } from "@/utils/CalculateTime";

function ImageMessage({message}) {
  const [{userInfo, currentChatUser}] = useStateProvider();
  
  // التعديل هنا: بنختبر اللينك عشان نعرف هو جاي من كلاوديناري ولا من اللوكال هوست القديم
  const imageUrl = message.message.startsWith("http") 
    ? message.message 
    : `${HOST}/${message.message}`;

  return (
    <div className={`p-1 rounded-lg ${message.senderId === currentChatUser.id ? "bg-incoming-background" : "bg-outgoing-background"}`}>
      <div className="relative">
        {/* التعديل التاني: استخدمنا المتغير imageUrl هنا بدل اللينك القديم المباشر */}
        <Image src={imageUrl} className="rounded-lg" alt="asset" height={300} width={300} />
        <div className="absolute bottom-1 right-1 flex items-end gap-1">
          <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
            {calculateTime(message.createdAt)}
          </span>
          <span className="text-bubble-meta">
            {message.senderId === userInfo.id && <MessageStatus messageStatus={message.messageStatus} />}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ImageMessage;