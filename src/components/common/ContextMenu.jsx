import React, { useEffect, useRef, useState } from "react";

function ContextMenu({ options, cordinates, contextMenu, setContextMenu }) {
  const contextMenuRef = useRef(null);
  // حالة جديدة عشان نحفظ فيها مكان القائمة بعد ما نحسبه
  const [position, setPosition] = useState({ top: cordinates.y, left: cordinates.x });

  // 1. قفل القائمة لو داس بره
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (event.target.id !== "context-opener") {
        if (
          contextMenuRef.current &&
          !contextMenuRef.current.contains(event.target)
        ) {
          setContextMenu(false);
        }
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  // 2. الذكاء الاصطناعي بتاع القائمة (حساب الحواف)
  useEffect(() => {
    if (contextMenuRef.current) {
      const menuRect = contextMenuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newLeft = cordinates.x;
      let newTop = cordinates.y;

      // لو القائمة هتخرج بره الشاشة من اليمين، نعكسها للشمال
      if (cordinates.x + menuRect.width > windowWidth) {
        newLeft = cordinates.x - menuRect.width;
      }

      // لو القائمة هتخرج بره الشاشة من تحت، نعكسها لفوق
      if (cordinates.y + menuRect.height > windowHeight) {
        newTop = cordinates.y - menuRect.height;
      }

      setPosition({ top: newTop, left: newLeft });
    }
  }, [cordinates]);

  return (
    <div
      ref={contextMenuRef}
      // رفعنا الـ z-index لـ 9999 عشان مستحيل رسالة تغطي عليه
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