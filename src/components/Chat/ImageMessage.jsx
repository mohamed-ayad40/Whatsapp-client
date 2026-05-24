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

      const chatKey = message.groupId 
        ? localStorage.getItem(`group-key-${message.groupId}`)
        : getSharedSecretKey(userInfo.id, (message.senderId === userInfo.id ? message.receiverId : message.senderId));

      const decryptedMsg = decryptText(message.message, chatKey);

      return decryptedMsg.startsWith("http") 
        ? decryptedMsg 
        : `${HOST}/${decryptedMsg}`;
    } catch (err) {
      console.error("Image decryption failed:", err);
      return "";
    }
  }, [message, userInfo]);

  return (
    <div className={`p-1 rounded-lg w-fit ${message?.senderId !== userInfo?.id ? "bg-incoming-background" : "bg-outgoing-background"}`}>
      
      {/* 🚨 التعديل السحري: الأبعاد ثابتة هنا، مفيش أي CLS هيحصل مهما حصل */}
      <div className="relative h-[300px] w-[300px] rounded-lg overflow-hidden">
        
        {/* الـ Skeleton (Spinner): بيفضل في الخلفية لحد ما الصورة تظهر فوقه */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-700/60 flex flex-col items-center justify-center z-0">
            <div className="w-8 h-8 border-2 border-t-icon-green border-gray-400 rounded-full animate-spin mb-2"></div>
          </div>
        )}

        {/* الصورة مع Next.js Image Optimization */}
        {imageUrl && (
          <Image 
            src={imageUrl} 
            alt="chat image" 
            fill // بتخلي الصورة تاخد أبعاد الأب (300x300) تلقائياً
            sizes="300px" // مفيدة جداً للأداء عشان المتصفح ميسحبش جودة أعلى من المطلوب
            className={`cursor-pointer object-cover z-10 transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`} 
            onLoad={() => setImageLoading(false)} 
            onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: imageUrl })} 
          />
        )}

        {/* وقت الرسالة (بحماية للخلفية عشان يتقري على الصور الفاتحة) */}
        <div className="absolute bottom-1 right-1 flex items-end gap-1 z-20 bg-black/40 px-2 py-[2px] rounded-full">
          <span className="text-white text-[11px] pt-0 min-w-fit tracking-wide">
            {calculateTime(message.createdAt)}
          </span>
          <span className="text-white">
            {message?.senderId === userInfo?.id && <MessageStatus messageStatus={message?.messageStatus} />}
          </span>
        </div>
        
      </div>
    </div>
  );
}

export default ImageMessage;