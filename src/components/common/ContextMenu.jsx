import React, { useEffect, useRef, useState } from "react";

function ContextMenu({ options, cordinates, contextMenu, setContextMenu }) {
  const contextMenuRef = useRef(null);
  const [position, setPosition] = useState({ top: cordinates.y, left: cordinates.x });

  useEffect(() => {
    const handleOutsideClick = (event) => {
      // 🚨 التعديل السحري: هنتأكد إن الضغطة مش جاية من أي عنصر جواه id=context-opener 
      // سواء كان الديف نفسه، أو الأيقونة، أو النص اللي جواه.
      if (event.target.closest('#context-opener')) {
          return; // لو داس على الكاميرا، متعملش حاجة (سيب القايمة تفتح)
      }

      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(false); // لو داس بره القايمة وبره الكاميرا، اقفل القايمة
      }
    };
    
    // 🚨 ضفنا capture: true عشان الـ event يشتغل بدري قبل ما الدنيا تتلخبط
    document.addEventListener("click", handleOutsideClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleOutsideClick, { capture: true });
    };
  }, [setContextMenu]); // ضفنا setContextMenu في الـ dependencies عشان ميعملش warning

  useEffect(() => {
    if (contextMenuRef.current) {
      const menuRect = contextMenuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newLeft = cordinates.x;
      let newTop = cordinates.y;

      if (cordinates.x + menuRect.width > windowWidth) {
        newLeft = cordinates.x - menuRect.width;
      }

      if (cordinates.y + menuRect.height > windowHeight) {
        newTop = cordinates.y - menuRect.height;
      }

      setPosition({ top: newTop, left: newLeft });
    }
  }, [cordinates]);

  return (
    <div
      ref={contextMenuRef}
      className="bg-dropdown-background fixed py-2 z-[9999] shadow-2xl rounded-md border border-conversation-border transition-all duration-100"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <ul className="flex flex-col">
        {options.map(({ name, callback }) => (
          <li
            key={name}
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu(false);
              callback();
            }}
            className="px-6 py-3 cursor-pointer hover:bg-background-default-hover text-white text-[15px] whitespace-nowrap transition-colors duration-200"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ContextMenu;