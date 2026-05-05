import React, { useEffect } from "react";
import { IoClose, IoDownloadOutline } from "react-icons/io5";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";

function ImageViewer() {
  const [{ imageViewer }, dispatch] = useStateProvider();

  // إغلاق الـ Viewer
  const closeViewer = () => {
    dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: null });
  };

  // إغلاق بالـ Esc من الكيبورد
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // دالة تحميل الصورة بشكل مباشر (عشان ميتفتحش في تاب تانية)
  const downloadImage = async (e) => {
    e.stopPropagation(); // عشان الشاشة متقفلش وإنت بتدوس تحميل
    try {
      const response = await fetch(imageViewer);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whatsapp-clone-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  if (!imageViewer) return null;

  return (
    // الخلفية السودة مع تأثير الـ Blur
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300 cursor-zoom-out"
      onClick={closeViewer}
    >
      {/* البار العلوي للزراير */}
      <div className="absolute top-5 right-5 flex gap-5 z-50">
        <button 
          onClick={downloadImage}
          className="text-white/70 hover:text-white transition-colors bg-black/20 p-2 rounded-full cursor-pointer"
          title="Download"
        >
          <IoDownloadOutline className="text-3xl" />
        </button>
        <button 
          onClick={closeViewer}
          className="text-white/70 hover:text-white transition-colors bg-black/20 p-2 rounded-full cursor-pointer"
          title="Close"
        >
          <IoClose className="text-3xl" />
        </button>
      </div>

      {/* الصورة نفسها */}
      <img
        src={imageViewer}
        alt="Full screen view"
        className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl rounded-md cursor-default"
        onClick={(e) => e.stopPropagation()} // عشان لما تدوس على الصورة نفسها الشاشة متقفلش
      />
    </div>
  );
}

export default ImageViewer;