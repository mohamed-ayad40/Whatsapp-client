import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import React, { useState } from "react";
import { BiSearchAlt2 } from "react-icons/bi";
import { BsFilter } from "react-icons/bs";
import ContextMenu from "../common/ContextMenu";

function SearchBar() {
  const [{ contactSearch, contactFilter }, dispatch] = useStateProvider();
  
  // حالة لإظهار وقفل قائمة الفلتر
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuCordinates, setContextMenuCordinates] = useState({ x: 0, y: 0 });

  const showContextMenu = (e) => {
    e.preventDefault();
    // بنحدد مكان القائمة تحت الأيقونة بالظبط
    setContextMenuCordinates({ x: e.pageX - 150, y: e.pageY + 20 });
    setIsContextMenuVisible(true);
  };

  // خيارات الفلترة
  const filterOptions = [
    {
      name: "All Chats",
      callback: () => dispatch({ type: reducerCases.SET_CONTACT_FILTER, contactFilter: "all" }),
    },
    {
      name: "Unread Chats",
      callback: () => dispatch({ type: reducerCases.SET_CONTACT_FILTER, contactFilter: "unread" }),
    },
    {
      name: "Groups",
      callback: () => dispatch({ type: reducerCases.SET_CONTACT_FILTER, contactFilter: "groups" }),
    },
  ];

  return (
    <div className="bg-search-input-container-background flex py-3 pl-5 items-center gap-3 h-14">
      <div className="bg-panel-header-background flex items-center gap-5 px-3 py-1 rounded-lg flex-grow">
        <div>
          <BiSearchAlt2 className="text-panel-header-icon cursor-pointer text-l" />
        </div>
        <div className="w-full">
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => dispatch({ type: reducerCases.SET_CONTACT_SEARCH, contactSearch: e.target.value })}
            placeholder="Search or start a new chat"
            className="bg-transparent text-sm focus:outline-none text-white w-full"
          />
        </div>
      </div>
      
      {/* أيقونة الفلتر مع اللون الأخضر لو فيه فلتر نشط */}
      <div className="pr-5 pl-3 relative">
        <BsFilter
          id="context-opener"
          onClick={(e) => showContextMenu(e)}
          className={`cursor-pointer text-xl transition-all duration-300 ${
            contactFilter !== "all" ? "text-icon-green scale-110" : "text-panel-header-icon"
          }`}
          title="Filter chats"
        />
        
        {isContextMenuVisible && (
          <ContextMenu
            options={filterOptions}
            cordinates={contextMenuCordinates}
            contextMenu={isContextMenuVisible}
            setContextMenu={setIsContextMenuVisible}
          />
        )}
      </div>
    </div>
  );
}

export default SearchBar;