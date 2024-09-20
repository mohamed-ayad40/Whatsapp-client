import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ADD_IMAGE_MESSAGE_ROUTE, ADD_MESSAGE_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
// import EmojiPicker from "emoji-picker-react";
import React, { useEffect, useRef, useState } from "react";
import {BsEmojiSmile} from "react-icons/bs";
import { FaMicrophone } from "react-icons/fa";
import {ImAttachment} from "react-icons/im";
import { MdSend } from "react-icons/md";
import PhotoPicker from "../common/PhotoPicker";
import dynamic from "next/dynamic";
const CaptureAudio = dynamic(() => import("../common/CaptureAudio"), {ssr: false});
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function MessageBar() {
  const [{userInfo, currentChatUser, socket, chatId}, dispatch] = useStateProvider();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [grabPhoto, setGrabPhoto] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if(e.target.id !== "emoji-open") {
        if(emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
          setShowEmojiPicker(false);
        }
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    }
  }, []);

  useEffect(() => {
    if(grabPhoto) {
      const data = document.getElementById("photo-picker");
      data.click();
      document.body.onfocus = (e) => {
        setTimeout(() => {
          setGrabPhoto(false);
        }, 1000);
      };
    }
  }, [grabPhoto]);

  useEffect(() => {
      socket.current.emit("trigger-typing", {
        to: currentChatUser?.id,
        from: userInfo?.id,
        typing: message.length > 0 ? true : false
      });
  }, [message]);

  const photoPickerChange = async (e) => {
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("image", file);
      const response = await axios.post(ADD_IMAGE_MESSAGE_ROUTE, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        params: {
          from: userInfo.id,
          to: currentChatUser.id,
        }
      });
      if(response.status === 201) {
        socket.current.emit("send-msg", {
          to: currentChatUser?.id,
          from: userInfo?.id,
          message: response.data.message
        });
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: {
            ...response.data.message,
          },
          fromSelf: true,
        })
      }
    } catch (err) {
      console.log(err);
    };
  };

  const handleEmojiModel = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emoji) => {
    console.log(emoji)
    setMessage((prevMessage) => (prevMessage += emoji.emoji))
  };
  const sendMessage = async () => {
    try {
      setMessage("");

      const { data } = await axios.post(ADD_MESSAGE_ROUTE, {
        to: currentChatUser?.id,
        from: userInfo?.id,
        message,
        chatId
      });
      socket.current.emit("send-msg", {
        to: currentChatUser?.id,
        from: userInfo?.id,
        message: data.message
      });
      dispatch({
        type: reducerCases.ADD_MESSAGE,
        newMessage: {
          ...data.message,
        },
        fromSelf: true,
      })
      inputRef.current.focus();
    } catch (err) {
      console.log(err);
    };
  };
  useEffect(() => {
    inputRef?.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey && message) {
        sendMessage(); 
      }
    };

    inputRef?.current?.addEventListener('keydown', handleKeyDown);

    return () => {
      inputRef?.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [message]);
  return (
    <div className="bg-panel-header-background h-20 px-4 flex items-center gap-6 relative">
      {
        !showAudioRecorder && (
          <>
            <div className="flex gap-6">
              <BsEmojiSmile id="emoji-open" onClick={handleEmojiModel} className="text-panel-header-icon cursor-pointer text-xl" title="Emoji" />
              {showEmojiPicker && (<div className="absolute bottom-24 left-16 z-40" ref={emojiPickerRef}>
                <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
              </div>)}
              <ImAttachment onClick={() => setGrabPhoto(true)} className="text-panel-header-icon cursor-pointer text-xl" title="Attach File" />
            </div>
            <div className="w-full rounded-lg h-10 flex items-center">
              <input ref={inputRef} onChange={e => setMessage(e.target.value)} value={message} type="text" placeholder="Type a message" className="bg-input-background text-sm focus:outline-none text-white h-10 rounded-lg px-5 py-4 w-full" />
            </div>
            <div className="flex w-10 items-center justify-center">
              <button>
                {
                  message.length ? (
                    <MdSend onClick={sendMessage} className="text-panel-header-icon cursor-pointer text-xl" title="Send Message" />
                  ) : (
                    <FaMicrophone onClick={() => setShowAudioRecorder(true)} className="text-panel-header-icon cursor-pointer text-xl" title="Record" />
                  )
                }
              </button>
            </div>
          </>
      )}
      {grabPhoto && <PhotoPicker onChange={photoPickerChange} />}
      {
        showAudioRecorder && <CaptureAudio hide={setShowAudioRecorder} />
      }
    </div>
  );
}

export default MessageBar;
