import React, { useState } from "react";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import { UPDATE_USER_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import { BiArrowBack, BiCheck } from "react-icons/bi";
import Avatar from "../common/Avatar";
import Input from "../common/Input";
import { encryptText } from "@/utils/Crypto";

function Settings({ onClose }) {
  const [{ userInfo }, dispatch] = useStateProvider();
  const [name, setName] = useState(userInfo?.name || "");
  const [about, setAbout] = useState(userInfo?.status || "");
  const [image, setImage] = useState(userInfo?.profileImage || "/default_avatar.png");

    // تأكد إنه بالمنظر ده في ملف الـ Settings
    const handleUpdate = async () => {
        try {
            const personalKey = userInfo.id; 
            const encryptedAbout = encryptText(about, personalKey);

            const { data } = await axios.post(UPDATE_USER_ROUTE, {
                id: userInfo.id,
                name,
                about: encryptedAbout, // النسخة المتشفرة للسيرفر
                profilePicture: image,
            });

            if (data.status) {
                dispatch({
                    type: reducerCases.SET_USER_INFO,
                    userInfo: {
                        ...userInfo,
                        name,
                        status: about, // القيمة الصافية للـ UI المحلي
                        profileImage: image,
                    },
                });
                onClose();
            }
        } catch (err) {
            console.log(err);
        }
    };

return (
<div className="flex flex-col bg-[#0b141a] h-full w-full animate-sidebar-left-slide shadow-2xl z-20">    
    {/* الهيدر: خليناه h-16 و items-center عشان يكون محاذي للهيدر بتاع الشات لست */}
    <div className="h-16 flex items-center px-6 bg-panel-header-background text-white gap-8 shrink-0">
      <BiArrowBack className="cursor-pointer text-xl" onClick={onClose} />
      <span className="font-semibold text-base">Profile</span>
    </div>

    {/* المحتوى */}
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center">
      <div className="mt-8 mb-8">
         <Avatar type="xl" image={image} setImage={setImage} />
      </div>
      
      <div className="w-full px-10 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Input name="Your Name" state={name} setState={setName} label />
          <p className="text-secondary text-xs px-2 leading-relaxed opacity-70">
            This is not a username. This name will be visible to your WhatsApp contacts.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 mb-8">
          <Input name="About" state={about} setState={setAbout} label />
        </div>
      </div>

      <div className="pb-10 mt-auto">
        <button 
          onClick={handleUpdate}
          className="bg-icon-green p-4 rounded-full shadow-xl hover:scale-105 transition-all"
        >
          <BiCheck className="text-white text-3xl" />
        </button>
      </div>
    </div>
  </div>
);
}

export default Settings;