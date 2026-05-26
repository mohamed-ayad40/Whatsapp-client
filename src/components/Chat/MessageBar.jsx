import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ADD_IMAGE_MESSAGE_ROUTE, ADD_MESSAGE_ROUTE, EDIT_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { BsEmojiSmile } from "react-icons/bs";
import { FaMicrophone } from "react-icons/fa";
import { ImAttachment } from "react-icons/im";
import { MdSend } from "react-icons/md";
import { IoClose } from "react-icons/io5"; 
import PhotoPicker from "../common/PhotoPicker";
import dynamic from "next/dynamic";
const CaptureAudio = dynamic(() => import("../common/CaptureAudio"), { ssr: false });
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
import { encryptText, getSharedSecretKey } from "@/utils/Crypto";

function MessageBar() {
  const [{ userInfo, currentChatUser, socket, chatId, messageToEdit, messageToReply }, dispatch] = useStateProvider();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [grabPhoto, setGrabPhoto] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = currentChatUser?.adminIds?.includes(userInfo?.id);
  const isLocked = currentChatUser?.isLocked; 
  const canSend = !currentChatUser?.isGroup || !isLocked || isAdmin;
  // 🚨 التعديل الجديد: التركيز التلقائي (Focus) على حقل الإدخال لما تفتح أي شات
  useEffect(() => {
    // نتأكد إن الحقل موجود وإن اليوزر عنده صلاحية يكتب (عشان لو جروب مقفول ميعملش فوكس في الفراغ)
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentChatUser, canSend]);

  useEffect(() => {
    if (messageToEdit) {
      setMessage(messageToEdit.message);
      inputRef.current?.focus();
    }
  }, [messageToEdit]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.id !== "emoji-open") {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
          setShowEmojiPicker(false);
        }
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (grabPhoto) {
      const data = document.getElementById("photo-picker");
      data.click();
      document.body.onfocus = () => setTimeout(() => setGrabPhoto(false), 1000);
    }
  }, [grabPhoto]);

  useEffect(() => {
    if (socket?.current) {
      socket.current.emit("trigger-typing", {
        to: currentChatUser?.id, // ده هيكون groupId لو إحنا في جروب
        from: userInfo?.id,
        typing: message.length > 0,
      });
    }
  }, [message, socket, currentChatUser, userInfo]);

  const cancelAction = () => {
    dispatch({ type: reducerCases.SET_MESSAGE_TO_EDIT, messageToEdit: null });
    dispatch({ type: reducerCases.SET_MESSAGE_TO_REPLY, messageToReply: null });
    setMessage("");
  };

  const photoPickerChange = async (e) => {
    if (!canSend) return; 
    try {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file);

      const isGroup = currentChatUser?.isGroup;
      const params = { from: userInfo.id };
      if (isGroup) params.groupId = currentChatUser.id;
      else params.to = currentChatUser.id;

      const response = await axios.post(ADD_IMAGE_MESSAGE_ROUTE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params,
      });

      if (response.status === 201) {
        // 🚨 إضافة المفتاح البديل (الـ Fallback) للجروبات هنا
        const chatKey = isGroup 
          ? (localStorage.getItem(`group-key-${currentChatUser.id}`) || currentChatUser.id)
          : getSharedSecretKey(userInfo.id, currentChatUser.id);

        const encryptedImageUrl = encryptText(response.data.message.message, chatKey);
        
        const msgToSend = { 
            ...response.data.message, 
            message: encryptedImageUrl 
        };

        if (!isGroup) {
          socket.current.emit("send-msg", {
            to: currentChatUser?.id,
            from: userInfo?.id,
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
      console.log(err);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !canSend) return; 

    try {
      const isGroup = currentChatUser?.isGroup;
      
      // 🚨 إضافة المفتاح البديل للجروبات عشان ميضربش إيرور 
      let sharedKey = isGroup 
        ? (localStorage.getItem(`group-key-${currentChatUser.id}`) || currentChatUser.id) 
        : getSharedSecretKey(userInfo?.id, currentChatUser?.id);

      // مسحنا "الحارس" اللي كان بيوقف الإرسال عشان لو حصل أي ظرف يبعتها 
      const messageToSend = encryptText(message, sharedKey);

      if (messageToEdit) {
        dispatch({
          type: reducerCases.EDIT_MESSAGE_LOCALLY,
          payload: { id: messageToEdit.id, message: message }, 
        });
        cancelAction(); 
        
        await axios.post(EDIT_MESSAGE_ROUTE, {
          messageId: messageToEdit.id,
          newMessage: messageToSend, 
        });
        return; 
      }

      const tempId = Date.now().toString();
      const tempMessage = {
        id: tempId, 
        message: message, 
        senderId: userInfo?.id,
        receiverId: isGroup ? null : currentChatUser?.id,
        groupId: isGroup ? currentChatUser?.id : null,
        type: "text",
        messageStatus: "sending", 
        createdAt: new Date().toISOString(),
        replyTo: messageToReply,
        chatId: chatId,
      };

      dispatch({ type: reducerCases.ADD_MESSAGE, newMessage: tempMessage, fromSelf: true });
      setMessage("");
      inputRef.current?.focus();

      const payload = {
        from: userInfo?.id, 
        message: messageToSend, 
        chatId,
        replyTo: messageToReply?.id || null 
      };

      if (isGroup) payload.groupId = currentChatUser?.id;
      else payload.to = currentChatUser?.id;

      const { data } = await axios.post(ADD_MESSAGE_ROUTE, payload);

      const realMessageToSave = { ...data.message, message: message, chatId: chatId };
      dispatch({ type: reducerCases.REPLACE_TEMP_MESSAGE, tempId: tempId, realMessage: realMessageToSave });

      if (!isGroup) {
        socket.current.emit("send-msg", {
          to: currentChatUser?.id, 
          from: userInfo?.id, 
          message: data.message 
        });
      }

      dispatch({ type: reducerCases.SET_MESSAGE_TO_REPLY, messageToReply: null });

    } catch (err) {
      console.error("Error in sendMessage:", err);
    }
  };

  const handleEmojiModel = () => {
    if (canSend) setShowEmojiPicker(!showEmojiPicker);
  };
  const handleEmojiClick = (emoji) => setMessage((prev) => prev + emoji.emoji);

  return (
    <div className="flex flex-col w-full">
      {(messageToEdit || messageToReply) && (
        <div className="bg-panel-header-background h-14 px-4 flex items-center justify-between border-b border-conversation-border border-l-4 border-l-icon-green transition-all duration-300">
          <div className="flex flex-col">
            <span className="text-icon-green text-sm font-semibold">
              {messageToEdit ? "Edit message" : `Replying to ${messageToReply?.senderId === userInfo.id ? "yourself" : currentChatUser.name}`}
            </span>
            <span className="text-secondary text-sm truncate max-w-[500px]">
              {messageToEdit?.message || 
               (messageToReply?.type === "image" ? "📷 Image" : 
                messageToReply?.type === "audio" ? "🎤 Voice Message" : 
                messageToReply?.message)}
            </span>
          </div>
          <IoClose onClick={cancelAction} className="text-icon-lighter cursor-pointer text-2xl hover:text-white" />
        </div>
      )}

      <div className="bg-panel-header-background h-20 px-4 flex items-center gap-6 relative">
        {!canSend ? (
          <div className="w-full flex items-center justify-center text-secondary italic text-sm bg-input-background h-12 rounded-lg border border-conversation-border">
            Only admins can send messages to this group.
          </div>
        ) : (
          !showAudioRecorder && (
            <>
              <div className="flex gap-6">
                <BsEmojiSmile id="emoji-open" onClick={handleEmojiModel} className="text-panel-header-icon cursor-pointer text-xl" title="Emoji" />
                {showEmojiPicker && (
                  <div className="absolute bottom-24 left-16 z-40" ref={emojiPickerRef}>
                    <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
                  </div>
                )}
                <ImAttachment onClick={() => setGrabPhoto(true)} className="text-panel-header-icon cursor-pointer text-xl" title="Attach File" />
              </div>
              <div className="w-full rounded-lg h-10 flex items-center">
                <input 
                  ref={inputRef} 
                  onChange={e => setMessage(e.target.value)} 
                  onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                      }
                  }}
                  value={message} 
                  type="text" 
                  placeholder="Type a message" 
                  className="bg-input-background text-sm outline-none focus:outline-none focus:ring-0 focus:border-none text-white h-10 rounded-lg px-5 py-4 w-full" 
                />
              </div>
              <div className="flex w-10 items-center justify-center">
                <button onClick={sendMessage}>
                  {message.length ? (
                    <MdSend className="text-panel-header-icon cursor-pointer text-xl hover:text-icon-green transition-colors" title="Send Message" />
                  ) : (
                    <FaMicrophone onClick={() => { if(canSend) setShowAudioRecorder(true) }} className="text-panel-header-icon cursor-pointer text-xl" title="Record" />
                  )}
                </button>
              </div>
            </>
          )
        )}
        {grabPhoto && <PhotoPicker onChange={photoPickerChange} />}
        {showAudioRecorder && <CaptureAudio hide={setShowAudioRecorder} />}
      </div>
    </div>
  );
}

export default MessageBar;