import { useStateProvider } from "@/context/StateContext";
import Image from "next/image";
import React, { useState, useMemo } from "react";
import MessageStatus from "../common/MessageStatus";
import { HOST } from "@/utils/ApiRoutes";
import { calculateTime } from "@/utils/CalculateTime";
import { reducerCases } from "@/context/constants";
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";

function ImageMessage({message}) {
  const [{userInfo, currentChatUser}, dispatch] = useStateProvider();
  const [imageLoading, setImageLoading] = useState(true);

  // --- فك تشفير لينك الصورة ---
  const imageUrl = useMemo(() => {
    try {
      if (!message.message) return "";

      // 1. تحديد المفتاح (فردي ولا جروب)
      const chatKey = message.groupId 
        ? localStorage.getItem(`group-key-${message.groupId}`)
        : getSharedSecretKey(userInfo.id, (message.senderId === userInfo.id ? message.receiverId : message.senderId));

      // 2. فك التشفير
      const decryptedMsg = decryptText(message.message, chatKey);

      // 3. التأكد من المسار (Cloudinary vs Local)
      return decryptedMsg.startsWith("http") 
        ? decryptedMsg 
        : `${HOST}/${decryptedMsg}`;
    } catch (err) {
      console.error("Image decryption failed:", err);
      return "";
    }
  }, [message, userInfo]);

  return (
    <div className={`p-1 rounded-lg ${message?.senderId !== userInfo?.id ? "bg-incoming-background" : "bg-outgoing-background"}`}>
      <div className="relative">
        {imageLoading && (
          <div className="animate-pulse bg-gray-700 rounded-lg h-[300px] w-[300px] flex items-center justify-center">
            <div className="text-gray-500 text-xs">Loading Image...</div>
          </div>
        )}
        {imageUrl && (
          <Image 
            src={imageUrl} 
            className={`rounded-lg cursor-pointer ${imageLoading ? "invisible h-0 w-0" : "visible"}`} 
            alt="chat image" 
            height={300} 
            width={300} 
            onLoadingComplete={() => setImageLoading(false)} 
            onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: imageUrl })} 
          />
        )}
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