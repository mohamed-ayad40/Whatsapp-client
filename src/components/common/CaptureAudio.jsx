import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ADD_AUDIO_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaStop, FaTrash } from "react-icons/fa";
import { MdSend } from "react-icons/md";
import { encryptText, getSharedSecretKey } from "@/utils/Crypto";

function CaptureAudio({ hide }) {
  const [{ userInfo, currentChatUser, socket, chatId }, dispatch] = useStateProvider();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [renderedAudio, setRenderedAudio] = useState(null);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    handleStartRecording();
  }, []);

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
      setRecordedAudioUrl(null); // لو إنت شغال بالنسخة اللي بدون WaveSurfer حالياً
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 🚨 الخدعة الجديدة: إجبار المتصفح يفضل فاتح المايك 🚨
      // هنعمل مشغل صوت وهمي ومكتوم، المتصفح هيفتكر إننا بنشغل الصوت فهيبعت الداتا كاملة
      const dummyAudio = new Audio();
      dummyAudio.muted = true;
      dummyAudio.srcObject = stream;
      dummyAudio.play().catch((err) => console.log("Dummy audio play bypassed:", err));
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        // نقفل المايك
        stream.getTracks().forEach(track => track.stop());
        
        // 🚨 نقفل المشغل الوهمي عشان نفضي الرامات
        dummyAudio.pause();
        dummyAudio.srcObject = null;

        const audioType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: audioType });
        
        console.log("Blob Size AFTER HACK:", blob.size, "bytes");
        
        const audioURL = URL.createObjectURL(blob);
        
        // لو شغال بنسخة الـ Player العادي:
        setRecordedAudioUrl(audioURL);
        
        // لو رجعت لنسخة الـ WaveSurfer (اللي في الـ useEffect):
        // setRecordedAudio(new Audio(audioURL)); 
        
        setRenderedAudio(new File([blob], "voice-message.webm", { type: audioType }));
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
    <div className="flex text-2xl w-full justify-between items-center bg-input-background rounded-full border border-conversation-border py-2 px-4 shadow-xl">
      <div className="pt-1">
        <FaTrash className="text-panel-header-icon cursor-pointer hover:text-red-600 transition-colors" onClick={() => hide()} />
      </div>
      
      <div className="mx-4 text-white text-lg flex-grow flex gap-3 justify-center items-center bg-search-input-container-background rounded-full py-1 px-4">
        {isRecording ? (
          <div className="flex items-center gap-3 w-60 justify-center">
            <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
            </div>
            <div className="text-red-600 font-medium tracking-wide">
              Recording <span>{formatTime(recordingDuration)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            {/* مشغل HTML5 العادي للتجربة وسماع الصوت */}
            {recordedAudioUrl && (
              <audio src={recordedAudioUrl} controls className="h-10 w-full max-w-[250px]" />
            )}
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