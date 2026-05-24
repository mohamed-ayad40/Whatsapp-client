import Image from "next/image";
import React, { useEffect, useState } from "react";
import { FaCamera } from "react-icons/fa";
import ContextMenu from "./ContextMenu";
import PhotoPicker from "./PhotoPicker";
import PhotoLibrary from "./PhotoLibrary";
import CapturePhoto from "./CapturePhoto";

// 🚨 ضفنا onViewPhoto كـ Prop عشان نقدر نفتح الصورة من جوه القايمة
function Avatar({ type, image, setImage, viewOnly = false, onViewPhoto }) {
  const [hover, setHover] = useState(false);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuCordinates, setContextMenuCordinates] = useState({ x: 0, y: 0 });
  const [grabPhoto, setGrabPhoto] = useState(false);
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [showCapturePhoto, setShowCapturePhoto] = useState(false);

  const avatarSrc = image && image !== "" ? image : "/default_avatar.png";

  useEffect(() => {
    if (viewOnly) {
      setHover(false);
      setIsContextMenuVisible(false);
      setGrabPhoto(false);
      setShowPhotoLibrary(false);
      setShowCapturePhoto(false);
    }
  }, [viewOnly, image]);

  const photoPickerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    const data = document.createElement("img");
    reader.onload = (event) => {
      data.src = event.target.result;
      data.setAttribute("data-src", event.target.result);
    };
    reader.readAsDataURL(file);
    setTimeout(() => {
      setImage(data.src);
    }, 200);
  };

  useEffect(() => {
    if (grabPhoto) {
      const data = document.getElementById("photo-picker");
      data.click();
      document.body.onfocus = (e) => {
        setTimeout(() => {
          setGrabPhoto(false);
        }, 1000);
      };
    }
  }, [grabPhoto]);

  const showContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation(); // 🚨 السر هنا: دي اللي بتمنع القايمة إنها تقفل فوراً لما تدوس
    if (viewOnly) return;
    setContextMenuCordinates({ x: e.pageX, y: e.pageY });
    setIsContextMenuVisible(true);
  };

  const contextMenuOptions = [
    { name: "Take Photo", callback: () => { setShowCapturePhoto(true); } },
    { name: "Choose From Library", callback: () => { setShowPhotoLibrary(true); } },
    { name: "Upload Photo", callback: () => { setGrabPhoto(true); } },
    { name: "Remove Photo", callback: () => { setImage("/default_avatar.png"); } },
  ];

  // 🚨 لو مبعوت دالة onViewPhoto، هنضيف خيار "View Photo" في أول القايمة
  if (onViewPhoto && image && image !== "/default_avatar.png") {
      contextMenuOptions.unshift({ name: "View Photo", callback: onViewPhoto });
  }

  return (
    <>
      <div className="flex items-center justify-center">
        {type === "sm" && (
          <div className="relative h-10 w-10">
            <Image src={avatarSrc} alt="avatar" className="rounded-full object-cover" fill />
          </div>
        )}
        {type === "lg" && (
          <div className="relative h-14 w-14">
            <Image src={avatarSrc} alt="avatar" className="rounded-full object-cover" fill />
          </div>
        )}
        {type === "xl" && (
          <div
            className="relative z-0"
            onMouseEnter={() => !viewOnly && setHover(true)}
            onMouseLeave={() => !viewOnly && setHover(false)}
          >
            {!viewOnly && (
              <div
                id="context-opener"
                onClick={showContextMenu}
                className={`z-10 bg-photopicker-overlay-background h-60 w-60 absolute top-0 left-0 flex items-center rounded-full cursor-pointer justify-center flex-col text-center gap-2 transition-all duration-300 ${hover ? "opacity-100 visible" : "opacity-0 hidden"}`}
              >
                <FaCamera onClick={showContextMenu} className="text-2xl" id="context-opener" />
                <span id="context-opener" onClick={showContextMenu}>
                  Change <br /> Profile <br /> Picture
                </span>
              </div>
            )}
            <div className="relative h-60 w-60">
              <Image src={avatarSrc} alt="avatar" className="rounded-full object-cover" fill />
            </div>
          </div>
        )}
      </div>
      
      {!viewOnly && isContextMenuVisible && (
        <ContextMenu
          options={contextMenuOptions}
          cordinates={contextMenuCordinates}
          contextMenu={isContextMenuVisible}
          setContextMenu={setIsContextMenuVisible}
        />
      )}
      {!viewOnly && showCapturePhoto && <CapturePhoto setImage={setImage} hide={setShowCapturePhoto} />}
      {!viewOnly && showPhotoLibrary && <PhotoLibrary setImage={setImage} hidePhotoLibrary={setShowPhotoLibrary} />}
      {!viewOnly && grabPhoto && <PhotoPicker onChange={photoPickerChange} />}
    </>
  );
}

export default Avatar;