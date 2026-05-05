import { useStateProvider } from "@/context/StateContext";
import Image from "next/image";
import React, { useState } from "react";
import MessageStatus from "../common/MessageStatus";
import { HOST } from "@/utils/ApiRoutes";
import { calculateTime } from "@/utils/CalculateTime";
import { reducerCases } from "@/context/constants";

function ImageMessage({message}) {
  const [{userInfo, currentChatUser}, dispatch] = useStateProvider();
  const [imageLoading, setImageLoading] = useState(true); // الصورة بتبدأ وهي "بتحمل"
  
  // التعديل هنا: بنختبر اللينك عشان نعرف هو جاي من كلاوديناري ولا من اللوكال هوست القديم
  const imageUrl = message.message.startsWith("http") 
    ? message.message 
    : `${HOST}/${message.message}`;

  return (
    <div className={`p-1 rounded-lg ${message?.senderId !== userInfo?.id ? "bg-incoming-background" : "bg-outgoing-background"}`}>
      <div className="relative">
        {/* التعديل التاني: استخدمنا المتغير imageUrl هنا بدل اللينك القديم المباشر */}
        {imageLoading && (
          <div className="animate-pulse bg-gray-700 rounded-lg h-[300px] w-[300px] flex items-center justify-center">
            <div className="text-gray-500 text-xs">Loading Image...</div>
          </div>
        )}
        <Image src={imageUrl} className={`rounded-lg cursor-pointer ${imageLoading ? "invisible h-0 w-0" : "visible"}`} alt="chat image" height={300} width={300} onLoadingComplete={() => setImageLoading(false)} onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: message.message })} />
        <div className="absolute bottom-1 right-1 flex items-end gap-1">
          <span className="text-bubble-meta text-[11px] pt-0 min-w-fit">
            {calculateTime(message.createdAt)}
          </span>
          <span className="text-bubble-meta">
            {message?.senderId === userInfo?.id && <MessageStatus messageStatus={message?.messageStatus} />}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ImageMessage;