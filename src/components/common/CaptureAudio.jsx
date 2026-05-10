import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ADD_AUDIO_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaPauseCircle, FaPlay, FaStop, FaTrash } from "react-icons/fa";
import { MdSend } from "react-icons/md";
import WaveSurfer from "wavesurfer.js";
// استيراد دوال التشفير
import { encryptText, getSharedSecretKey } from "@/utils/Crypto";

function CaptureAudio({ hide }) {
  const [{ userInfo, currentChatUser, socket }, dispatch] = useStateProvider();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [waveform, setWaveform] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderedAudio, setRenderedAudio] = useState(null);

  const mediaRecorderRef = useRef(null);
  const waveFormRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const wavesurfer = WaveSurfer.create({
      container: waveFormRef.current,
      waveColor: "#ccc",
      progressColor: "#4a9eff",
      cursorColor: "#7ae3c3",
      barWidth: 2,
      height: 30,
      responsive: true,
    });
    setWaveform(wavesurfer);

    wavesurfer.on("finish", () => setIsPlaying(false));
    wavesurfer.on("audioprocess", (time) => setCurrentPlaybackTime(time));

    return () => wavesurfer.destroy();
  }, []);

  useEffect(() => {
    if (waveform) handleStartRecording();
  }, [waveform]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      setRecordingDuration(0);
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const audioURL = URL.createObjectURL(blob);
        const audio = new Audio(audioURL);
        
        setRecordedAudio(audio);
        setRenderedAudio(new File([blob], "voice-message.webm"));
        waveform?.load(audioURL);
        
        waveform.on("ready", () => {
            setTotalDuration(waveform.getDuration());
        });
      };
      
      mediaRecorder.start();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handlePlayRecording = () => {
    if (waveform) {
      waveform.play();
      setIsPlaying(true);
    }
  };
  
  const handlePauseRecording = () => {
    if (waveform) {
      waveform.pause();
      setIsPlaying(false);
    }
  };

  const sendRecording = async () => {
    try {
      if (isRecording) handleStopRecording();
      
      if (!renderedAudio) {
          setTimeout(sendRecording, 100); 
          return;
      }

      hide(); 
      
      const formData = new FormData();
      formData.append("audio", renderedAudio);

      // دعم الجروبات في الـ Params
      const isGroup = currentChatUser?.isGroup;
      const params = { from: userInfo.id };
      if (isGroup) params.groupId = currentChatUser.id;
      else params.to = currentChatUser.id;

      const response = await axios.post(ADD_AUDIO_MESSAGE_ROUTE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params,
      });

      if (response.status === 201) {
        // --- [تشفير لينك الصوت] ---
        const chatKey = isGroup 
          ? localStorage.getItem(`group-key-${currentChatUser.id}`) 
          : getSharedSecretKey(userInfo.id, currentChatUser.id);

        const encryptedAudioUrl = encryptText(response.data.message.message, chatKey);
        
        const msgToSend = { 
            ...response.data.message, 
            message: encryptedAudioUrl 
        };

        if (!isGroup) {
          socket.current.emit("send-msg", {
            to: currentChatUser.id,
            from: userInfo.id,
            message: msgToSend, // نبعت النسخة المشفرة
          });
        }

        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: response.data.message, // نعرض النسخة الأصلية لينا
          fromSelf: true,
        });
      }
    } catch (err) {
      console.log("Error sending audio message:", err);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };
  
  return (
    <div className="flex text-2xl w-full justify-end items-center">
      <div className="pt-1">
        <FaTrash className="text-panel-header-icon cursor-pointer" onClick={() => hide()} />
      </div>
      <div className="mx-4 py-2 px-4 text-white text-lg flex gap-3 justify-center items-center bg-search-input-container-background rounded-full drop-shadow-lg">
        {isRecording ? (
          <div className="text-red-500 animate-pulse w-60 text-center">
            Recording <span>{formatTime(recordingDuration)}</span>
          </div>
        ) : (
          <div>
            {recordedAudio && (
              !isPlaying ? <FaPlay className="cursor-pointer" onClick={handlePlayRecording} /> : <FaStop className="cursor-pointer" onClick={handlePauseRecording} />
            )}
          </div>
        )}
        <div className="w-60" ref={waveFormRef} hidden={isRecording} />
        
        {recordedAudio && isPlaying && <span className="text-sm">{formatTime(currentPlaybackTime)}</span>}
        {recordedAudio && !isPlaying && <span className="text-sm">{formatTime(totalDuration)}</span>}
      </div>

      <div className="mr-4 cursor-pointer">
        {!isRecording ? <FaMicrophone className="text-red-500" onClick={handleStartRecording} /> : <FaPauseCircle className="text-red-500" onClick={handleStopRecording} />}
      </div>
      <div>
        <MdSend className="text-panel-header-icon cursor-pointer mr-4" title="Send" onClick={sendRecording} /> 
      </div>
    </div>
  );
}

export default CaptureAudio;