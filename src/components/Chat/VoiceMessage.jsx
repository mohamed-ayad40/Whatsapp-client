import { useStateProvider } from "@/context/StateContext";
import { HOST } from "@/utils/ApiRoutes";
import React, { useEffect, useRef, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";
import Avatar from "../common/Avatar";
import { FaPlay, FaStop, FaPause } from "react-icons/fa";
import { BsMicFill } from "react-icons/bs"; 
import { calculateTime } from "@/utils/CalculateTime";
import MessageStatus from "../common/MessageStatus";
import { decryptText, getSharedSecretKey } from "@/utils/Crypto";

function VoiceMessage({ message }) {
  const [{ currentChatUser, userInfo }] = useStateProvider();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false); 
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const waveFormRef = useRef(null);
  const waveSurfer = useRef(null);
  const isSender = message?.senderId === userInfo?.id;

  const audioURL = useMemo(() => {
      let url = message?.message;
      if (!url) return null;
      if (!url.startsWith("http") && !url.startsWith("blob:") && !url.startsWith("/")) {
        const chatKey = message.groupId 
          ? localStorage.getItem(`group-key-${message.groupId}`)
          : getSharedSecretKey(userInfo?.id, (isSender ? message.receiverId : message.senderId));
        try { url = decryptText(url, chatKey); } catch (err) { console.error(err); }
      }
      if (url.startsWith("/uploads")) url = `${HOST}${url}`;
      return url;
  }, [message?.message, message?.groupId, message?.receiverId, message?.senderId, isSender, userInfo?.id]);

  useEffect(() => {
    if (!waveFormRef.current) return;

    waveSurfer.current = WaveSurfer.create({
      container: waveFormRef.current,
      waveColor: isSender ? "#8696a0" : "#d1d7db", 
      progressColor: isSender ? "#53bdeb" : "#00a884",
      cursorColor: "transparent",
      barWidth: 2.5,
      barGap: 2, 
      barRadius: 3,
      height: 30,
      responsive: true,
      normalize: true, 
      backend: "MediaElement", 
    });

    const dummyAudio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

    // 🚨 اللقطة السحرية للدمج بين الجديد والقديم
    if (message?.waveform && message.waveform.length > 0) {
        // الرسايل الجديدة (بتنزل من غير ما تحمل الصوت)
        waveSurfer.current.load(dummyAudio, message.waveform);
    } else {
        // الرسايل القديمة (بنحمل الصوت عشان نرجع شكل موجتها الطبيعي)
        if (audioURL) {
            waveSurfer.current.load(audioURL);
            waveSurfer.current.once("ready", () => {
                setIsAudioLoaded(true); // اتأكدنا إن الصوت اتحمل فعلاً
            });
        }
    }

    waveSurfer.current.on("ready", () => {
      setTotalDuration(waveSurfer.current.getDuration() || 0);
    });

    waveSurfer.current.on("audioprocess", (currentTime) => {
      setCurrentPlaybackTime(currentTime);
    });

    waveSurfer.current.on("finish", () => {
      setIsPlaying(false);
      setCurrentPlaybackTime(0);
    });

    return () => {
      if(waveSurfer.current) waveSurfer.current.destroy();
    };
  }, [message?.waveform, isSender, audioURL]); // ضفنا audioURL عشان التحديث

  const handlePlayAudio = () => {
    if (!waveSurfer.current) return;
    
    // لو الصوت لسه متحملش (يعني رسالة جديدة)، نحمله قبل ما نشغل
    if (!isAudioLoaded && audioURL && message?.waveform && message.waveform.length > 0) {
        waveSurfer.current.load(audioURL);
        waveSurfer.current.once("ready", () => {
            setIsAudioLoaded(true);
            setTotalDuration(waveSurfer.current.getDuration());
            waveSurfer.current.play();
            setIsPlaying(true);
        });
    } else {
        // لو الصوت اوريدي متحمل (رسالة قديمة أو رسالة جديدة اشتغلت قبل كده)
        waveSurfer.current.play();
        setIsPlaying(true);
    }
  };

  const handlePauseAudio = () => {
    if (waveSurfer.current) {
        waveSurfer.current.pause();
        setIsPlaying(false);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === 0) return "00:00"; 
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-4 text-white px-3 py-2 text-sm rounded-lg shadow-sm w-fit min-w-[280px] max-w-[320px] ${isSender ? "bg-outgoing-background" : "bg-incoming-background"}`}>
      
      <div className="relative">
         <Avatar type="lg" image={isSender ? userInfo?.profileImage : currentChatUser?.profilePicture} />
         <div className="absolute bottom-0 right-0 bg-icon-green rounded-full p-[3px] border border-panel-header-background">
           <BsMicFill className="text-white text-[10px]" />
         </div>
      </div>
      
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-3 w-full">
          <div className="cursor-pointer text-2xl text-icon-lighter hover:text-white transition-colors">
            {isPlaying && !isAudioLoaded ? (
              <div className="w-5 h-5 border-2 border-t-icon-green border-gray-400 rounded-full animate-spin ml-1"></div>
            ) : !isPlaying ? (
              <FaPlay onClick={handlePlayAudio} />
            ) : (
              <FaPause onClick={handlePauseAudio} />
            )}
          </div>
          
          <div className="w-full relative flex-1 h-[30px]" ref={waveFormRef} />
        </div>
        
        <div className="flex justify-between items-center w-full mt-1">
          <span className="text-bubble-meta text-[11px] tracking-wide">
            {formatTime(isPlaying ? currentPlaybackTime : totalDuration)}
          </span>
          <div className="flex gap-1 items-center text-bubble-meta text-[11px]">
            <span>{calculateTime(message?.createdAt)}</span>
            {isSender && <MessageStatus messageStatus={message?.messageStatus} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceMessage;