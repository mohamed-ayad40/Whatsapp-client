import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ADD_IMAGE_MESSAGE_ROUTE, ADD_MESSAGE_ROUTE, EDIT_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { BsEmojiSmile } from "react-icons/bs";
import { FaMicrophone } from "react-icons/fa";
import { ImAttachment } from "react-icons/im";
import { MdSend } from "react-icons/md";
import { IoClose } from "react-icons/io5"; // ضفنا أيقونة القفل
import PhotoPicker from "../common/PhotoPicker";
import dynamic from "next/dynamic";
const CaptureAudio = dynamic(() => import("../common/CaptureAudio"), { ssr: false });
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
import { encryptText, getSharedSecretKey, decryptText } from "@/utils/Crypto";

function MessageBar() {
  // ضفنا messageToEdit و messageToReply هنا
  const [{ userInfo, currentChatUser, socket, chatId, messageToEdit, messageToReply }, dispatch] = useStateProvider();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [grabPhoto, setGrabPhoto] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // لما اليوزر يختار يعمل Edit، نكتبله الرسالة القديمة في المربع أوتوماتيك
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
        to: currentChatUser?.id,
        from: userInfo?.id,
        typing: message.length > 0 ? true : false
      });
    }
  }, [message]);

  const photoPickerChange = async (e) => { /* ... نفس الكود بتاعك ... */ };
  const handleEmojiModel = () => setShowEmojiPicker(!showEmojiPicker);
  const handleEmojiClick = (emoji) => setMessage((prev) => prev += emoji.emoji);

  // إلغاء وضع التعديل أو الريبلاي
  const cancelAction = () => {
    dispatch({ type: reducerCases.SET_MESSAGE_TO_EDIT, messageToEdit: null });
    dispatch({ type: reducerCases.SET_MESSAGE_TO_REPLY, messageToReply: null });
    setMessage("");
  };

  const sendMessage = async () => {
    try {
      const sharedKey = getSharedSecretKey(userInfo?.id, currentChatUser?.id);
      const encryptedMessage = encryptText(message, sharedKey);

      // --- لو إحنا في وضع "تعديل الرسالة" ---
      if (messageToEdit) {
        const { data } = await axios.post(EDIT_MESSAGE_ROUTE, {
          messageId: messageToEdit.id,
          newMessage: encryptedMessage, // بنبعت النص متشفر
        });

        // نحدث الشاشة بتاعتنا فوراً
        dispatch({
          type: reducerCases.EDIT_MESSAGE_LOCALLY,
          payload: { id: messageToEdit.id, message: message }, // بنعرض النص المفكوك
        });

        cancelAction(); // نقفل شريط التعديل ونفضي المربع
        return; // نوقف الدالة هنا عشان ميبعتش رسالة جديدة
      }

      // --- لو رسالة جديدة عادية (نفس الكود بتاعك) ---
      const tempId = Date.now().toString();
      const tempMessage = {
        id: tempId, message: message, senderId: userInfo?.id,
        receiverId: currentChatUser?.id, type: "text",
        messageStatus: "sending", createdAt: new Date().toISOString(),
      };

      dispatch({ type: reducerCases.ADD_MESSAGE, newMessage: tempMessage, fromSelf: true });
      setMessage("");
      inputRef.current.focus();

      const { data } = await axios.post(ADD_MESSAGE_ROUTE, {
        to: currentChatUser?.id, from: userInfo?.id, message: encryptedMessage, chatId
      });

      const realMessageToSave = { ...data.message, message: tempMessage.message };
      dispatch({ type: reducerCases.REPLACE_TEMP_MESSAGE, tempId: tempId, realMessage: realMessageToSave });

      socket.current.emit("send-msg", {
        to: currentChatUser?.id, from: userInfo?.id, message: data.message 
      });

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    inputRef?.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey && message) {
        sendMessage();
      }
    };
    inputRef?.current?.addEventListener('keydown', handleKeyDown);
    return () => inputRef?.current?.removeEventListener('keydown', handleKeyDown);
  }, [message, messageToEdit]); // ضفنا messageToEdit عشان الـ Enter يشوفها

  return (
    <div className="flex flex-col w-full">
      {/* --- الشريط الجديد اللي بيظهر فوق المربع في حالة التعديل أو الريبلاي --- */}
      {(messageToEdit || messageToReply) && (
        <div className="bg-panel-header-background h-14 px-4 flex items-center justify-between border-b border-conversation-border border-l-4 border-l-icon-green">
          <div className="flex flex-col">
            <span className="text-icon-green text-sm font-semibold">
              {messageToEdit ? "Edit message" : `Replying to ${messageToReply?.senderId === userInfo.id ? "yourself" : currentChatUser.name}`}
            </span>
            <span className="text-secondary text-sm truncate max-w-[500px]">
              {messageToEdit?.message || messageToReply?.message}
            </span>
          </div>
          <IoClose onClick={cancelAction} className="text-icon-lighter cursor-pointer text-2xl hover:text-white" />
        </div>
      )}
      {/* ---------------------------------------------------------------------- */}

      <div className="bg-panel-header-background h-20 px-4 flex items-center gap-6 relative">
        {!showAudioRecorder && (
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
              <input ref={inputRef} onChange={e => setMessage(e.target.value)} value={message} type="text" placeholder="Type a message" className="bg-input-background text-sm focus:outline-none text-white h-10 rounded-lg px-5 py-4 w-full" />
            </div>
            <div className="flex w-10 items-center justify-center">
              <button>
                {message.length ? (
                  <MdSend onClick={sendMessage} className="text-panel-header-icon cursor-pointer text-xl" title="Send Message" />
                ) : (
                  <FaMicrophone onClick={() => setShowAudioRecorder(true)} className="text-panel-header-icon cursor-pointer text-xl" title="Record" />
                )}
              </button>
            </div>
          </>
        )}
        {grabPhoto && <PhotoPicker onChange={photoPickerChange} />}
        {showAudioRecorder && <CaptureAudio hide={setShowAudioRecorder} />}
      </div>
    </div>
  );
}

export default MessageBar;