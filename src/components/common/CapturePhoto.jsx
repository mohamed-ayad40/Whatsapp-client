import React, { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";

function CapturePhoto({ hide, setImage }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null); // 🚨 عشان نقدر نتحكم في الـ stream بأمان

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera access denied or error:", error);
        // 🚨 لو الكاميرا اترفضت أو حصل إيرور، اقفل الكومبوننت فوراً وميسبش شاشة سوداء
        hide(false);
      }
    };
    startCamera();
    
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [hide]);

  const capturePhoto = () => {
    // 🚨 حماية: مياخدش صورة غير لو الكاميرا شغالة فعلاً وفيها داتا عشان ميبعتش ضلمة
    if (!videoRef.current || !streamRef.current || !streamRef.current.active) {
        return;
    }
    const canvas = document.createElement("canvas");
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 300, 150);
    setImage(canvas.toDataURL("image/jpeg"));
    hide(false);
  };

  return (
    // 🚨 ضفنا z-50 عشان نتأكد إنها فوق أي حاجة تانية ومحدش يدوس وراها
    <div className="absolute h-4/6 w-2/6 top-1/4 left-1/3 bg-gray-900 gap-3 rounded-lg pt-2 flex items-center justify-center z-50 shadow-2xl border border-white/10">
      <div className="flex flex-col gap-4 w-full justify-center items-center">
        <div className="pt-2 pe-2 cursor-pointer flex items-end justify-end w-full" onClick={() => hide(false)}>
          <IoClose className="h-10 w-10 cursor-pointer text-white hover:text-red-500 transition-colors" />
        </div>
        <div className="flex justify-center">
          <video id="video" width={400} autoPlay ref={videoRef}></video>
        </div>
        <button
          onClick={capturePhoto}
          className="h-16 w-16 bg-white rounded-full cursor-pointer border-8 border-teal-light p-2 mb-10 hover:bg-gray-200 transition-colors"
        ></button>
      </div>
    </div>
  );
}

export default CapturePhoto;