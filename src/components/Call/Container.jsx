import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { MdOutlineCallEnd, MdMicOff, MdMic, MdVideocamOff, MdVideocam } from "react-icons/md";

function Container({ data }) {
  const [{ socket, userInfo }, dispatch] = useStateProvider();
  
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0); // 🚨 عداد المكالمة

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null); // هيشتغل كـ Video أو Audio مخفي حسب نوع المكالمة
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // تشغيل التايمر لما المكالمة تفتح
  useEffect(() => {
    let timer;
    if (callAccepted) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callAccepted]);

  useEffect(() => {
    let isMounted = true;
    let pendingCandidates = []; // 🚨 طابور انتظار لـ ICE Candidates

    const startWebRTC = async () => {
      try {
        // 1. فتح الكاميرا أو المايك
        const stream = await navigator.mediaDevices.getUserMedia({
          video: data.callType === "video",
          audio: true,
        });

        if (!isMounted) return;
        localStreamRef.current = stream;

        // نعرض صورتنا لو المكالمة فيديو
        if (localVideoRef.current && data.callType === "video") {
          localVideoRef.current.srcObject = stream;
        }

        const peerConnection = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // 2. استقبال صوت/فيديو الطرف التاني
        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.current.emit("webrtc-ice-candidate", {
              to: data.id,
              candidate: event.candidate,
            });
          }
        };

        // ================= هندسة التزامن ================= //

        // 🚨 لو أنا اللي برد: أبلغ السيرفر إني فتحت الكاميرا وجاهز استقبل الـ Offer
        if (data.type === "in-coming") {
          socket.current.emit("accept-incoming-call", { id: data.id });
        }

        // 🚨 لو أنا اللي بتصل: هستنى الإشارة إن الطرف التاني فتح كاميرته وبقى جاهز
        socket.current.on("accept-call", async () => {
          setCallAccepted(true);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.current.emit("webrtc-offer", { to: data.id, offer: offer });
        });

        // استقبال الـ Offer
        socket.current.on("webrtc-offer-received", async (offer) => {
          setCallAccepted(true);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.current.emit("webrtc-answer", { to: data.id, answer: answer });

          // تفريغ الطابور لو في Candidates وصلت بدري
          pendingCandidates.forEach(c => peerConnection.addIceCandidate(new RTCIceCandidate(c)));
          pendingCandidates = [];
        });

        // استقبال الـ Answer
        socket.current.on("webrtc-answer-received", async (answer) => {
          if (!peerConnection.currentRemoteDescription) {
             await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
             pendingCandidates.forEach(c => peerConnection.addIceCandidate(new RTCIceCandidate(c)));
             pendingCandidates = [];
          }
        });

        // استقبال الـ ICE
        socket.current.on("webrtc-ice-candidate-received", async (candidate) => {
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingCandidates.push(candidate); // لو الاتصال لسه مكملش، خزنها في الطابور
          }
        });

      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    startWebRTC();

    return () => {
      isMounted = false;
      if (socket.current) {
         socket.current.off("accept-call");
         socket.current.off("webrtc-offer-received");
         socket.current.off("webrtc-answer-received");
         socket.current.off("webrtc-ice-candidate-received");
      }
      endCall();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    // بنتأكد إن الـ Stream موجود وإن جواه مسار صوت (Audio Track) على الأقل
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      localStreamRef.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    } else {
      console.warn("No audio track found to mute/unmute");
    }
  };

  const toggleVideo = () => {
    // بنتأكد إن الـ Stream موجود وإن جواه مسار فيديو (Video Track)
    if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
      localStreamRef.current.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    } else {
      console.warn("No video track found to play/pause");
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    socket.current.emit(data.callType === "video" ? "reject-video-call" : "reject-voice-call", {
      from: data.id,
    });
    dispatch({ type: reducerCases.END_CALL });
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col h-[100vh] overflow-hidden relative text-white">
      
      {/* 1. فيديو الطرف التاني (هيكون مخفي لحد ما يرد) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={data.callType === "video" && callAccepted ? "absolute inset-0 w-full h-full object-cover z-0" : "hidden"}
      ></video>

      {/* 2. صورتي أنا (تظهر فوراً أول ما أعمل مكالمة فيديو، سواء ردينا أو لسه) */}
      {data.callType === "video" && (
        <div className="absolute top-10 right-10 z-20 w-40 h-56 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-icon-green transition-all hover:scale-105">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted 
            className="w-full h-full object-cover"
          ></video>
          {isVideoOff && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Image src={userInfo?.profileImage} alt="avatar" fill className="object-cover" />
             </div>
          )}
        </div>
      )}

      {/* 3. شاشة الانتظار (تختفي أول ما التاني يدوس Accept) */}
      {(!callAccepted || data.callType !== "video") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-conversation-panel-background/95 backdrop-blur-md">
          <div className="flex flex-col gap-5 items-center">
            <div className={`relative ${!callAccepted ? "animate-pulse" : ""}`}>
              <Image
                src={data.profilePicture}
                alt="avatar"
                height={200}
                width={200}
                className="rounded-full shadow-2xl border-4 border-icon-green object-cover"
              />
            </div>
            <span className="text-4xl font-semibold mt-4 tracking-wide">{data.name}</span>
            <span className="text-lg text-icon-lighter">
              {!callAccepted ? "Calling..." : formatTime(callDuration)}
            </span>
          </div>
        </div>
      )}

      {/* 4. أزرار التحكم */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-8 bg-panel-header-background px-8 py-4 rounded-full shadow-2xl border border-conversation-border">
        <button onClick={toggleMute} className={`h-14 w-14 flex items-center justify-center rounded-full transition-all ${isMuted ? "bg-white text-black" : "bg-dropdown-background text-white hover:bg-icon-lighter/20"}`}>
          {isMuted ? <MdMicOff className="text-2xl" /> : <MdMic className="text-2xl" />}
        </button>

        <button onClick={endCall} className="h-16 w-16 bg-red-600 hover:bg-red-500 flex items-center justify-center rounded-full transition-all shadow-lg hover:scale-110">
          <MdOutlineCallEnd className="text-3xl text-white" />
        </button>

        {data.callType === "video" && (
          <button onClick={toggleVideo} className={`h-14 w-14 flex items-center justify-center rounded-full transition-all ${isVideoOff ? "bg-white text-black" : "bg-dropdown-background text-white hover:bg-icon-lighter/20"}`}>
            {isVideoOff ? <MdVideocamOff className="text-2xl" /> : <MdVideocam className="text-2xl" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default Container;