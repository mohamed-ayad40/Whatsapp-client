import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { CHECK_USER_ROUTE, UPDATE_PUBLIC_KEY_ROUTE } from "@/utils/ApiRoutes";
import { firebaseAuth } from "@/utils/FirebaseConfig";
import axios from "axios";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiPhone } from "react-icons/fi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// 🚨 دالة توليد المفاتيح (RSA للجروبات + ECDH للفردي)
const generateEncryptionKeys = async () => {
  try {
    // 1. مفاتيح RSA
    const rsaKeyPair = await window.crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"]
    );
    const rsaPublicBuffer = await window.crypto.subtle.exportKey("spki", rsaKeyPair.publicKey);
    const rsaPrivateBuffer = await window.crypto.subtle.exportKey("pkcs8", rsaKeyPair.privateKey);
    const rsaPublicKeyString = btoa(String.fromCharCode(...new Uint8Array(rsaPublicBuffer)));
    const rsaPrivateKeyString = btoa(String.fromCharCode(...new Uint8Array(rsaPrivateBuffer)));
    
    // 2. مفاتيح ECDH
    const ecdhKeyPair = await window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );
    const ecdhPublicBuffer = await window.crypto.subtle.exportKey("spki", ecdhKeyPair.publicKey);
    const ecdhPrivateBuffer = await window.crypto.subtle.exportKey("pkcs8", ecdhKeyPair.privateKey);
    const ecdhPublicKeyString = btoa(String.fromCharCode(...new Uint8Array(ecdhPublicBuffer)));
    const ecdhPrivateKeyString = btoa(String.fromCharCode(...new Uint8Array(ecdhPrivateBuffer)));

    // حفظ المفاتيح الخاصة في المتصفح
    localStorage.setItem("privateKey", rsaPrivateKeyString);
    localStorage.setItem("ecdhPrivateKey", ecdhPrivateKeyString);
    
    // إرجاع المفاتيح العامة للباك إند
    return { rsaPublicKey: rsaPublicKeyString, ecdhPublicKey: ecdhPublicKeyString };
  } catch (err) {
    console.error("Key generation failed:", err);
    return null;
  }
};

function Login() {
  const router = useRouter();
  const [{ userInfo, newUser }, dispatch] = useStateProvider();
  
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (userInfo?.id && !newUser) router.push("/");
  }, [userInfo, newUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!recaptchaRef.current) {
            recaptchaRef.current = new RecaptchaVerifier(
                "recaptcha-container", 
                {
                    size: "invisible",
                    callback: () => {},
                },
                firebaseAuth
            );
        }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleUserAuth = async (identifier, name, profileImage, isPhone = false) => {
    const payload = isPhone ? { phoneNumber: identifier } : { email: identifier };
    
    const { data } = await axios.post(CHECK_USER_ROUTE, payload);
    
    if (!data.status) {
      dispatch({
        type: reducerCases.SET_NEW_USER,
        newUser: true,
      });
      dispatch({
        type: reducerCases.SET_USER_INFO,
        userInfo: {
          name: name || "",
          ...(isPhone ? { phoneNumber: identifier } : { email: identifier }),
          profileImage: profileImage || "",
          status: "",
        },
      });
      router.push("/onboarding");
    } else {
      let { id, name: dbName, email, phoneNumber, profilePicture, status, publicKey, ecdhPublicKey } = data.data;

      // 🚨 التحديث الصامت: لو أي مفتاح من الـ 4 ناقص، نولد الثنائي من جديد
      if (!publicKey || !localStorage.getItem("privateKey") || !ecdhPublicKey || !localStorage.getItem("ecdhPrivateKey")) {
          console.log("Generating missing keys for legacy user...");
          const newKeys = await generateEncryptionKeys();
          
          if (newKeys) {
              try {
                  await axios.post(UPDATE_PUBLIC_KEY_ROUTE, { 
                      id, 
                      publicKey: newKeys.rsaPublicKey,
                      ecdhPublicKey: newKeys.ecdhPublicKey
                  });
                  publicKey = newKeys.rsaPublicKey; 
                  ecdhPublicKey = newKeys.ecdhPublicKey;
              } catch (err) {
                  console.error("Failed to update public key silently on server", err);
              }
          }
      }

      dispatch({
        type: reducerCases.SET_USER_INFO,
        userInfo: { id, name: dbName, email, phoneNumber, profileImage: profilePicture, status, publicKey, ecdhPublicKey },
      });
      router.push("/");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const { user: { displayName: name, email, photoURL: profileImage } } = await signInWithPopup(firebaseAuth, provider);
      await handleUserAuth(email, name, profileImage, false);
    } catch (err) {
      console.error(err);
      setError("Google login failed. Try again.");
    }
  };

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) {
        setError("Enter a valid phone number with country code (e.g. +201234567890)");
        return;
    }
    setError("");
    setLoading(true);
    try {
        const result = await signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaRef.current);
        setConfirmationResult(result);
        setShowOtpInput(true);
    } catch (err) {
        console.error(err);
        setError("Failed to send OTP. Check the number and try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const { phoneNumber: phone, displayName: name, photoURL } = result.user;
      await handleUserAuth(phone, name, photoURL, true);
    } catch (err) {
      console.error(err);
      setError("Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center bg-panel-header-background h-screen w-screen flex-col gap-6">
      <div className="flex items-center justify-center gap-2 text-white">
        <Image src="/whatsapp.gif" alt="Whatsapp" height={300} width={300} priority />
        <span className="text-7xl">Whatsapp</span>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-4 bg-search-input-container-background p-4 rounded-lg w-full text-white text-xl hover:bg-background-default-hover transition-all"
        >
          <FcGoogle className="text-3xl" />
          <span>Login with Google</span>
        </button>

        {!showPhoneInput ? (
          <>
            <button
              disabled
              className="flex items-center justify-center gap-4 bg-search-input-container-background p-4 rounded-lg w-full text-white text-xl opacity-50 cursor-not-allowed"
            >
              <FiPhone className="text-3xl" />
              <span>Login with Phone</span>
            </button>
            <p className="text-secondary text-xs text-center">
              Phone authentication requires Firebase Blaze plan (SMS billing). 
              Architecture is fully implemented — disabled for demo purposes.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3 w-full bg-search-input-container-background p-5 rounded-lg">
            {!showOtpInput ? (
              <>
                <div className="[&_.country-list]:border-0 [&_.country-list]:shadow-lg">
                  <PhoneInput
                    country={"eg"}
                    value={phoneNumber}
                    onChange={(phone) => setPhoneNumber("+" + phone)}
                    disableCountryCode={false}
                    countryCodeEditable={false}
                    enableSearch={true}
                    searchStyle={{
                        backgroundColor: "#2a3942",
                        color: "white",
                        border: "none",
                        width: "90%",
                    }}
                    inputStyle={{
                        backgroundColor: "#2a3942",
                        color: "white",
                        border: "none",
                        width: "100%",
                        height: "48px",
                        fontSize: "16px",
                    }}
                    buttonStyle={{
                        backgroundColor: "#2a3942",
                        border: "none",
                    }}
                    dropdownStyle={{
                        backgroundColor: "#2a3942",
                        color: "white",
                        border: "1px solid #3d5a65",
                    }}
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="bg-icon-green text-white py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </>
            ) : (
              <>
                <p className="text-secondary text-sm text-center">
                  OTP sent to {phoneNumber}
                </p>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="bg-input-background text-white px-4 py-3 rounded-lg outline-none w-full text-center tracking-widest text-xl"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="bg-icon-green text-white py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  onClick={() => { setShowOtpInput(false); setOtp(""); recaptchaRef.current = null; }}
                  className="text-secondary text-sm hover:text-white transition-all"
                >
                  Change number
                </button>
              </>
            )}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>

      <div id="recaptcha-container"></div>
    </div>
  );
}

export default Login;