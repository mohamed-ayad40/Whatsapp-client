import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { firebaseAuth } from "@/utils/FirebaseConfig";
import { signOut } from "firebase/auth";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

function Logout() {
  const [{ socket, userInfo }, dispatch] = useStateProvider();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // 1. تبليغ السيرفر بالخروج (signout) لتحديث الـ lastSeen
        if (socket?.current && userInfo?.id) {
          socket.current.emit("signout", userInfo.id);
          socket.current.disconnect(); 
        }

        // 2. الخروج من Firebase
        await signOut(firebaseAuth);

        // 3. تنظيف الـ LocalStorage من مفاتيح التشفير (E2EE Security)
        // بنمسح المفاتيح الشخصية ومفاتيح الجروبات
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("group-key-") || 
            key === "privateKey" || 
            key === "publicKey" || 
            key === "userInfo"
          ) {
            localStorage.removeItem(key);
          }
        });

        // 4. تصفير الـ Global State (إعادة ضبط المصنع)
        dispatch({ type: reducerCases.SET_EXIT_CHAT });

        // 5. التوجيه لصفحة اللوجين
        router.push("/login");
      } catch (err) {
        console.error("Logout Error:", err);
      }
    };

    if (userInfo) {
        performLogout();
    } else {
        router.push("/login");
    }
  }, [socket, userInfo, dispatch, router]);

  return (
    <div className="h-screen w-screen bg-panel-header-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* ممكن تحط هنا Loader أو Spinner */}
        <span className="loader"></span> 
        <span className="text-white text-xl animate-pulse font-medium">
          Logging out safely...
        </span>
      </div>
    </div>
  );
}

export default Logout;