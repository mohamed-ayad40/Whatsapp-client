import React, { useState } from "react";
import Avatar from "../common/Avatar";
import { useStateProvider } from "@/context/StateContext";
import { BsFillChatLeftTextFill, BsThreeDotsVertical } from "react-icons/bs";
import { MdGroupAdd } from "react-icons/md"; // الأيقونة الجديدة
import { reducerCases } from "@/context/constants";
import ContextMenu from "../common/ContextMenu";
import { useRouter } from "next/router";
import CreateGroup from "./CreateGroup"; // الكومبوننت الجديد

function ChatListHeader() {
  const [{ userInfo }, dispatch] = useStateProvider();
  const router = useRouter();

  const [contextMenuCordinates, setContextMenuCordinates] = useState({
    x: 0,
    y: 0,
  });

  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false); // الـ State الجديدة للجروب

  const showContextMenu = (e) => {
    e.preventDefault();
    setContextMenuCordinates({ x: e.pageX, y: e.pageY });
    setIsContextMenuVisible(true);
  };

  const contextMenuOptions = [
    {
      name: "Logout",
      callback: async () => {
        setIsContextMenuVisible(false);
        router.push("/logout");
      },
    },
  ];

  const handleAllContactsPage = () => {
    dispatch({
      type: reducerCases.SET_ALL_CONTACTS_PAGE,
    });
  };

  return (
    <>
      <div className="h-16 px-4 py-3 flex justify-between items-center ">
        <div className="cursor-pointer">
          <Avatar type="sm" image={userInfo?.profileImage} />
        </div>
        <div className="flex gap-6 items-center">
          {/* زرار إنشاء الجروب الجديد */}
          <MdGroupAdd
            title="Create Group"
            className="text-panel-header-icon cursor-pointer text-xl"
            onClick={() => setIsCreatingGroup(true)}
          />
          {/* الزرار القديم لفتح المحادثات */}
          <BsFillChatLeftTextFill
            title="New Chat"
            className="text-panel-header-icon cursor-pointer text-xl"
            onClick={handleAllContactsPage}
          />
          <>
            <BsThreeDotsVertical
              title="Menu"
              className="text-panel-header-icon cursor-pointer text-xl"
              onClick={(e) => showContextMenu(e)}
              id="context-opener"
            />
            {isContextMenuVisible && (
              <ContextMenu
                options={contextMenuOptions}
                cordinates={contextMenuCordinates}
                contextMenu={isContextMenuVisible}
                setContextMenu={setIsContextMenuVisible}
              />
            )}
          </>
        </div>
      </div>

      {/* عرض نافذة إنشاء الجروب لما اليوزر يدوس على الأيقونة */}
      {isCreatingGroup && (
        <CreateGroup onClose={() => setIsCreatingGroup(false)} />
      )}
    </>
  );
}

export default ChatListHeader;