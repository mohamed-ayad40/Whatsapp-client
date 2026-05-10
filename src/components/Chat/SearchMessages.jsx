import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { calculateTime } from "@/utils/CalculateTime";
import React, { useEffect, useState } from "react";
import { BiSearchAlt2 } from "react-icons/bi";
import { IoClose } from "react-icons/io5";

function SearchMessages() {
  const [{ currentChatUser, messages }, dispatch] = useStateProvider();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedMessages, setSearchedMessages] = useState([]);

  useEffect(() => {
    if (searchTerm) {
      setSearchedMessages(
        messages.filter(
          (message) =>
            message.type === "text" &&
            message.message.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setSearchedMessages([]);
    }
  }, [searchTerm, messages]);

  return (
    // 1. الأب واخد h-full و flex-col عشان نتحكم في توزيع العناصر عمودياً
    <div className="border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col z-10 h-full overflow-hidden">
      
      {/* 2. Header: ثابت فوق (shrink-0) */}
      <div className="h-16 px-4 py-5 flex gap-10 items-center bg-panel-header-background text-primary-strong shrink-0">
        <IoClose 
          className="cursor-pointer text-icon-lighter text-2xl hover:text-white transition-all" 
          onClick={() => dispatch({type: reducerCases.SET_MESSAGE_SEARCH})} 
        />
        <span>Search Messages</span>
      </div>

      {/* 3. منطقة البحث والنتائج: القابلة للـ Scroll */}
      <div className="flex-1 overflow-auto custom-scrollbar flex flex-col bg-conversation-panel-background">
        
        {/* صندوق البحث (ثابت نسبياً فوق النتائج) */}
        <div className="flex flex-col items-center w-full shrink-0">
          <div className="flex px-5 items-center gap-3 h-14 w-full mt-3">
            <div className="bg-panel-header-background flex items-center gap-5 px-4 py-2 rounded-lg flex-grow border border-transparent focus-within:border-icon-green transition-all">
              <div>
                <BiSearchAlt2 className="text-panel-header-icon text-l" />
              </div>
              <div className="w-full">
                <input 
                  type="text" 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  value={searchTerm} 
                  placeholder="Search Messages" 
                  className="bg-transparent text-sm focus:outline-none text-white w-full h-full" 
                  autoFocus
                />
              </div>
            </div>
          </div>

          <span className="mt-10 text-secondary text-sm">
            {!searchTerm.length && 
              (currentChatUser?.isGroup 
                ? `Search for messages in ${currentChatUser.name}` 
                : `Search for messages with ${currentChatUser.name}`)
            }
          </span>
        </div>

        {/* 4. منطقة النتائج: الآن مرنة وتملأ المساحة المتبقية بـ flex-1 */}
        <div className="flex-1 flex flex-col w-full">
          {searchTerm.length > 0 && searchedMessages.length === 0 && (
            <span className="text-secondary w-full flex justify-center mt-10">
              No messages found
            </span>
          )}

          <div className="flex flex-col w-full">
            {searchedMessages.map((message) => (
              <div 
                key={message.id}
                className="flex cursor-pointer flex-col justify-center hover:bg-background-default-hover w-full px-5 border-b-[0.1px] border-conversation-border py-5 transition-all"
              >
                <div className="text-sm text-secondary mb-1">
                  {calculateTime(message.createdAt)}
                </div>
                <div className="text-icon-green break-words">
                  {message.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SearchMessages;