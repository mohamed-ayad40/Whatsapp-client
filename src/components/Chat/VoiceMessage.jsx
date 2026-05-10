import { useStateProvider } from "@/context/StateContext";
import { HOST } from "@/utils/ApiRoutes";
import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import Avatar from "../common/Avatar";
import { FaPlay, FaStop } from "react-icons/fa";
import { calculateTime } from "@/utils/CalculateTime";
import MessageStatus from "../common/MessageStatus";
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";

function VoiceMessage({ message }) {
  const [{ currentChatUser, userInfo }] = useStateProvider();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const waveFormRef = useRef(null);
  const waveSurfer = useRef(null);

  useEffect(() => {
    // 1. فك تشفير لينك الصوت أولاً
    const getDecryptedAudioUrl = () => {
      const chatKey = message.groupId 
        ? localStorage.getItem(`group-key-${message.groupId}`)
        : getSharedSecretKey(userInfo.id, (message.senderId === userInfo.id ? message.receiverId : message.senderId));
      
      const decryptedUrl = decryptText(message.message, chatKey);
      return decryptedUrl;
    };

    const audioURL = getDecryptedAudioUrl();

    // 2. تهيئة الـ WaveSurfer
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

    // 3. تحميل الصوت المفكوك
    waveSurfer.current.load(audioURL);

    waveSurfer.current.on("ready", () => {
      setTotalDuration(waveSurfer.current.getDuration());
    });

    waveSurfer.current.on("audioprocess", (currentTime) => {
      setCurrentPlaybackTime(currentTime);
    });

    waveSurfer.current.on("finish", () => {
      setIsPlaying(false);
      setCurrentPlaybackTime(0);
    });

    return () => {
      waveSurfer.current.destroy();
    };
  }, [message, userInfo]);

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