import React from "react";
import { IoClose } from "react-icons/io5";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";

function SharedMediaModal() {
  const [{ sharedMediaModal }, dispatch] = useStateProvider();

  if (!sharedMediaModal) return null;

  return (
    <div className="flex flex-col bg-[#0b141a] h-full w-full border-l border-conversation-border animate-sidebar z-50 absolute top-0 right-0">
      <div className="h-16 px-6 flex items-center gap-6 bg-[#202c33] text-primary-strong shadow-md shrink-0">
        <IoClose 
          className="cursor-pointer text-2xl text-icon-lighter hover:text-white transition-all" 
          onClick={() => dispatch({ type: "SET_SHARED_MEDIA_MODAL", payload: null })} 
        />
        <span className="font-medium text-white">Media</span>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1 bg-[#0b141a] p-2">
        {sharedMediaModal.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {sharedMediaModal.map((media) => (
              <div 
                key={media.id} 
                className="relative aspect-square overflow-hidden bg-[#202c33] cursor-pointer hover:opacity-80 transition-all border border-white/5"
                onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: media.decryptedUrl || media.message })}
              >
                <img 
                  src={media.decryptedUrl || media.message} 
                  className="h-full w-full object-cover" 
                  alt="shared media" 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-secondary text-sm italic">
            No media shared yet
          </div>
        )}
      </div>
    </div>
  );
}

export default SharedMediaModal;