import Avatar from "@/components/common/Avatar";
import Input from "@/components/common/Input";
import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { ONBOARD_USER_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

function onboarding() {
  const router = useRouter();
  const [{ userInfo, newUser }, dispatch] = useStateProvider();
  const [name, setName] = useState(userInfo?.name || "");
  const [about, setAbout] = useState("");
  const [image, setImage] = useState("/default_avatar.png");

  useEffect(() => {
    if (!newUser && !userInfo?.email) router.push("/login");
    else if (!newUser && userInfo?.email) router.push("/");
  }, [newUser, userInfo, router]);

  // --- دالة توليد مفاتيح التشفير (الجديدة) ---
  const generateEncryptionKeys = async () => {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

      // تصدير المفاتيح بصيغة نصية (String) عشان نعرف نخزنها
      const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

      const publicKeyString = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
      const privateKeyString = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

      // تخزين المفتاح الخاص في جهاز اليوزر "فقط"
      localStorage.setItem("privateKey", privateKeyString);

      return publicKeyString;
    } catch (err) {
      console.error("Key generation failed:", err);
      return null;
    }
  };

  const onBoardUserHandler = async () => {
    if (validateDetails()) {
      const email = userInfo.email;
      try {
        // 1. توليد المفاتيح أولاً
        const publicKey = await generateEncryptionKeys();

        // 2. إرسال البيانات شاملة الـ Public Key للسيرفر
        const { data } = await axios.post(ONBOARD_USER_ROUTE, {
          email,
          name,
          about,
          image,
          publicKey, // الإضافة الجديدة
        });

        if (data.status) {
          dispatch({
            type: reducerCases.SET_NEW_USER,
            newUser: false,
          });
          dispatch({
            type: reducerCases.SET_USER_INFO,
            userInfo: {
              id: data.user.id,
              name,
              email,
              profileImage: image,
              status: about,
            },
          });
          router.push("/");
        }
      } catch (err) {
        console.log(err);
      }
    }
  };

  const validateDetails = () => {
    return name.length >= 3;
  };

  return (
    <div className="bg-panel-header-background h-screen w-screen text-white flex flex-col items-center justify-center overflow-hidden">
      <div className="flex items-center justify-center gap-2">
        <Image src="/whatsapp.gif" alt="whatsapp" height={300} width={300} priority />
        <span className="text-7xl">Whatsapp</span>
      </div>
      <h2 className="text-2xl mt-5">Create your profile</h2>
      <div className="flex gap-12 mt-10 items-start">
        <div className="flex flex-col items-center justify-center gap-6 min-w-[300px]">
          <Input name="Display Name" state={name} setState={setName} label />
          <Input name="About" state={about} setState={setAbout} label />
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={onBoardUserHandler}
              className="flex items-center justify-center gap-7 bg-search-input-container-background p-5 rounded-lg hover:bg-background-default-hover transition-all font-medium border border-conversation-border/30"
            >
              Create Profile
            </button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Avatar type="xl" image={image} setImage={setImage} />
        </div>
      </div>
    </div>
  );
}

export default onboarding;