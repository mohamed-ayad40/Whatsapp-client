import { useStateProvider } from "@/context/StateContext";
import { HOST } from "@/utils/ApiRoutes";
import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import Avatar from "../common/Avatar";
import { FaPlay, FaStop } from "react-icons/fa";
import { calculateTime } from "@/utils/CalculateTime";
import MessageStatus from "../common/MessageStatus";

function VoiceMessage({ message }) {
  const [{ currentChatUser, userInfo }] = useStateProvider();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const waveFormRef = useRef(null);
  const waveSurfer = useRef(null);

  useEffect(() => {
    // 1. تهيئة الـ WaveSurfer
    waveSurfer.current = WaveSurfer.create({
      container: waveFormRef.current,
      waveColor: "#ccc",
      progressColor: "#4a9eff",
      cursorColor: "#7ae3c3",
      barWidth: 2,
      height: 30,
      responsive: true,
      cursorWidth: 1,
    });

    const audioURL = `${message.message}`; // لو اللينك كامل من Cloudinary مش محتاج HOST قبله، لو relative حط HOST

    // 2. تحميل الصوت
    waveSurfer.current.load(audioURL);

    // 3. لما يحمل، نجيب المدة الكلية
    waveSurfer.current.on("ready", () => {
      setTotalDuration(waveSurfer.current.getDuration());
    });

    // 4. تحديث الوقت أثناء التشغيل
    waveSurfer.current.on("audioprocess", (currentTime) => {
      setCurrentPlaybackTime(currentTime);
    });

    // 5. لما يخلص، نرجع زرار الـ Play
    waveSurfer.current.on("finish", () => {
      setIsPlaying(false);
      setCurrentPlaybackTime(0); // تصفير الوقت
    });

    // تنظيف الميموري لما تقفل الشات
    return () => {
      waveSurfer.current.destroy();
    };
  }, [message.message]);

  const handlePlayAudio = () => {
    waveSurfer.current.play();
    setIsPlaying(true);
  };

  const handlePauseAudio = () => {
    waveSurfer.current.pause();
    setIsPlaying(false);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-5 text-white px-4 pr-2 py-4 text-sm rounded-md ${message.senderId === userInfo.id ? "bg-outgoing-background" : "bg-incoming-background"}`}>
      <div>
        <Avatar type="lg" image={message.senderId === userInfo.id ? userInfo.profileImage : currentChatUser?.profilePicture} />
      </div>
      <div className="cursor-pointer text-xl">
        {!isPlaying ? <FaPlay onClick={handlePlayAudio} /> : <FaStop onClick={handlePauseAudio} />}
      </div>
      <div className="relative">
        <div className="w-60" ref={waveFormRef} />
        <div className="text-bubble-meta text-[11px] pt-1 flex justify-between absolute bottom-[-22px] w-full">
          <span>
            {formatTime(isPlaying ? currentPlaybackTime : totalDuration)}
          </span>
          <div className="flex gap-1">
            <span>{calculateTime(message.createdAt)}</span>
            {message?.senderId === userInfo?.id && <MessageStatus messageStatus={message?.messageStatus} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceMessage;