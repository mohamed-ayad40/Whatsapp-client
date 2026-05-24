import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ADD_AUDIO_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaStop, FaTrash, FaPlay, FaPause } from "react-icons/fa";
import { MdSend } from "react-icons/md";
import { encryptText, getSharedSecretKey } from "@/utils/Crypto";
import WaveSurfer from "wavesurfer.js";

function CaptureAudio({ hide }) {
  const [{ userInfo, currentChatUser, socket, chatId }, dispatch] = useStateProvider();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [renderedAudio, setRenderedAudio] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  
  const waveFormRef = useRef(null);
  const waveSurfer = useRef(null);

  // 🚨 الحل الجذري للـ Infinite Loop
  const sendRecordingRef = useRef(false);

  useEffect(() => {
    handleStartRecording();
    return () => {
       if (waveSurfer.current) waveSurfer.current.destroy();
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (recordedAudioUrl && waveFormRef.current) {
      waveSurfer.current = WaveSurfer.create({
        container: waveFormRef.current,
        waveColor: "#8696a0", 
        progressColor: "#00a884", 
        cursorColor: "transparent",
        barWidth: 2.5,
        barGap: 2,
        barRadius: 3,
        height: 30,
        responsive: true,
        normalize: true,
        backend: "MediaElement", 
      });

      waveSurfer.current.load(recordedAudioUrl);

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
    }
  }, [recordedAudioUrl]);

  const handlePlayPausePreview = () => {
    if (waveSurfer.current) {
        if (isPlaying) {
            waveSurfer.current.pause();
            setIsPlaying(false);
        } else {
            waveSurfer.current.play();
            setIsPlaying(true);
        }
    }
  };

  // 🚨 الدالة الرياضية البديلة لـ exportPeaks اللي اتلغت في V7
  const extractPeaks = () => {
    if (waveSurfer.current) {
      try {
        const decoded = waveSurfer.current.getDecodedData();
        if (decoded) {
          const channelData = decoded.getChannelData(0);
          const peaks = [];
          const step = Math.ceil(channelData.length / 40); // عايزين 40 رقم
          for (let i = 0; i < 40; i++) {
              let max = 0;
              for (let j = 0; j < step; j++) {
                  const idx = i * step + j;
                  if (idx < channelData.length) {
                     const val = Math.abs(channelData[idx]);
                     if (val > max) max = val;
                  }
              }
              peaks.push(max);
          }
          return peaks;
        }
      } catch (e) {
          console.error("Failed to generate peaks", e);
      }
    }
    return null;
  };

  // 🚨 دالة الرفع الأساسية
  const uploadAudio = async (audioFile) => {
    try {
      hide(); 
      const formData = new FormData();
      formData.append("audio", audioFile);

      const peaks = extractPeaks();
      if (peaks && peaks.length > 0) {
          formData.append("waveform", JSON.stringify(peaks)); 
      }

      const isGroup = currentChatUser?.isGroup;
      const params = { from: userInfo.id };
      if (isGroup) params.groupId = currentChatUser.id;
      else params.to = currentChatUser.id;

      const response = await axios.post(ADD_AUDIO_MESSAGE_ROUTE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params,
      });

      if (response.status === 201) {
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
            message: msgToSend, 
          });
        }

        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: { ...response.data.message, chatId: chatId }, 
          fromSelf: true,
        });
      }
    } catch (err) {
      console.error("Error sending audio message:", err);
    }
  };

  const handleStartRecording = async () => {
    try {
      setRecordingDuration(0);
      setIsRecording(true);
      setRecordedAudioUrl(null); 
      setIsPlaying(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());

        const audioType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: audioType });
        const audioURL = URL.createObjectURL(blob);
        const newFile = new File([blob], "voice-message.webm", { type: audioType });
        
        setRecordedAudioUrl(audioURL);
        setRenderedAudio(newFile);

        // لو اليوزر داس Send وهو بيسجل، الرفع هيحصل هنا بأمان تام
        if (sendRecordingRef.current) {
            sendRecordingRef.current = false;
            uploadAudio(newFile);
        }
      };
      
      mediaRecorder.start(250); 
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendRecording = () => {
    if (isRecording) {
        // بنبلغ الـ onstop إنه يرفع الملف أول ما التسجيل يقف
        sendRecordingRef.current = true;
        handleStopRecording();
        return;
    }
    // لو التسجيل واقف أصلاً وموجود
    if (renderedAudio) {
        uploadAudio(renderedAudio);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex text-2xl w-full justify-between items-center bg-input-background rounded-full py-2 px-4 shadow-xl">
      <div className="pt-1">
        <FaTrash className="text-panel-header-icon cursor-pointer hover:text-red-600 transition-colors" onClick={() => hide()} />
      </div>
      
      <div className="mx-4 flex-grow flex gap-3 justify-center items-center bg-search-input-container-background rounded-full py-2 px-4">
        {isRecording ? (
          <div className="flex items-center gap-3 w-full justify-start pl-4">
            <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
            </div>
            <div className="text-white text-base font-medium tracking-wide">
              {formatTime(recordingDuration)}
            </div>
          </div>
        ) : (
          <div className="flex items-center w-full gap-4 px-2">
            <div className="cursor-pointer text-icon-lighter hover:text-white transition-colors" onClick={handlePlayPausePreview}>
              {isPlaying ? <FaPause className="text-xl" /> : <FaPlay className="text-xl" />}
            </div>
            
            <div className="flex-1 text-white text-sm font-medium tracking-wide flex items-center gap-3">
              <span className="min-w-[40px] text-icon-lighter">
                 {formatTime(isPlaying ? currentPlaybackTime : totalDuration)}
              </span>
              <div className="flex-1 relative" ref={waveFormRef}></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="cursor-pointer">
            {!isRecording ? <FaMicrophone className="text-red-500" onClick={handleStartRecording} /> : <FaStop className="text-red-500 hover:text-red-400 transition-colors" onClick={handleStopRecording} />}
        </div>
        
        <div>
            <MdSend className="text-icon-green cursor-pointer hover:text-icon-lighter transition-colors" title="Send" onClick={sendRecording} /> 
        </div>
      </div>
    </div>
  );
}

export default CaptureAudio;