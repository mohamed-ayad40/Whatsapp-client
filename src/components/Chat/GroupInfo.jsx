import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { IoClose, IoPersonAddOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { MdLockOutline, MdLockOpen, MdAdminPanelSettings } from "react-icons/md";
import Avatar from "../common/Avatar";
import { TOGGLE_GROUP_LOCK_ROUTE, TOGGLE_ADMIN_ROLE_ROUTE, REMOVE_MEMBER_ROUTE, GET_GROUP_MEDIA_ROUTE } from "@/utils/ApiRoutes";
import ContactsList from "../Chatlist/ContactsList";

function GroupInfo({ onClose }) {
  const [{ currentChatUser, userInfo }, dispatch] = useStateProvider();
  const [showAddMember, setShowAddMember] = useState(false);
  const [mediaMessages, setMediaMessages] = useState([]); // حالة تخزين الميديا
  const isAdmin = currentChatUser?.adminIds?.includes(userInfo?.id);

  // --- جلب ميديا الجروب عند فتح المكون ---
  useEffect(() => {
    const fetchGroupMedia = async () => {
      try {
        if (currentChatUser?.isGroup) {
          const { data } = await axios.get(`${GET_GROUP_MEDIA_ROUTE}/${currentChatUser.id}`);
          setMediaMessages(data.mediaMessages);
        }
      } catch (err) {
        console.error("Error fetching group media:", err);
      }
    };
    fetchGroupMedia();
  }, [currentChatUser]);

  const handleAdminAction = async (route, payload) => {
    // 1. الاحتفاظ بالحالة القديمة عشان لو حصل إيرور نرجع لها (Rollback)
    const previousLockedState = currentChatUser?.isLocked;

    // 2. تحديث متفائل (Optimistic Update)
    // لو بنعمل Lock/Unlock، هنغيرها في الفرونت فوراً قبل ما نكلم السيرفر
    if (route === TOGGLE_GROUP_LOCK_ROUTE) {
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: { ...currentChatUser, isLocked: !previousLockedState },
      });
    }

    try {
      // 3. نكلم الباك إند في الخلفية
      const { data } = await axios.post(route, payload);
      
      // تحديث نهائي بالبيانات اللي رجعت من السيرفر للتأكيد
      dispatch({ 
        type: reducerCases.CHANGE_CURRENT_CHAT_USER, 
        user: { ...currentChatUser, ...data.group } 
      });
    } catch (err) {
      console.error("Admin Action Failed:", err);
      
      // 4. التراجع (Rollback) في حالة الفشل
      // لو الريكويست فشل، بنرجع حالة القفل زي ما كانت عشان اليوزر ميتخدعش
      if (route === TOGGLE_GROUP_LOCK_ROUTE) {
        dispatch({
          type: reducerCases.CHANGE_CURRENT_CHAT_USER,
          user: { ...currentChatUser, isLocked: previousLockedState },
        });
        // ممكن تطلع Toast هنا تقول إن العملية فشلت
      }
    }
  };

  // دالة لفتح الصورة (بناءً على ImageViewer اللي عندك في السيستم)
  const openImage = (url) => {
    dispatch({
      type: reducerCases.SET_IMAGE_VIEW_DATA, // تأكد من اسم الـ Action ده عندك في الـ Reducer
      imagePreviewUrl: url,
    });
  };

  if (showAddMember) {
    return (
      <div className="flex flex-col bg-conversation-panel-background w-full h-full border-l border-conversation-border animate-slide-right">
        <div className="h-16 px-10 py-5 flex items-center gap-10 bg-panel-header-background text-primary-strong">
          <IoClose className="cursor-pointer text-2xl" onClick={() => setShowAddMember(false)} />
          <span>Add New Member</span>
        </div>
        <div className="flex-grow overflow-hidden">
             <ContactsList
                isAddMode={true} 
                groupId={currentChatUser.id} 
                existingMembers={currentChatUser.userIds} 
                onClose={() => setShowAddMember(false)} 
             />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#0b141a] h-full w-full border-l border-conversation-border animate-sidebar-slide shadow-2xl">      {/* 1. الـ Header */}
      <div className="h-16 px-6 py-5 flex items-center gap-6 bg-panel-header-background text-primary-strong border-b border-conversation-border flex-shrink-0">
        <IoClose className="cursor-pointer text-2xl hover:text-white transition-all" onClick={onClose} />
        <span className="font-medium truncate">Group Info</span>
      </div>
      
      {/* 2. الـ Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-background-default min-h-0">
        {/* Profile Section */}
        <div className="flex flex-col items-center p-8 bg-panel-header-background/30 mb-2">
          <Avatar type="xl" image={currentChatUser?.profilePicture} />
          <h2 className="text-white text-2xl mt-4 font-semibold truncate max-w-full px-4">{currentChatUser?.name}</h2>
          <span className="text-secondary mt-1">Group • {currentChatUser?.users?.length} Members</span>
        </div>

        {/* Media Preview Section (المعرض اللي ضفناه) */}
        <div className="px-6 py-4 flex flex-col gap-4 border-b border-conversation-border/50">
          <div className="flex items-center justify-between cursor-pointer group">
            <span className="text-secondary text-sm font-semibold">Media, Links and Docs</span>
            <span className="text-icon-green text-xs group-hover:underline">
              {mediaMessages.length > 0 ? mediaMessages.length : ""} ❯
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {mediaMessages.length > 0 ? (
              mediaMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEW_DATA, imagePreviewUrl: msg.message })}
                  className="aspect-square bg-panel-header-background rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-all border border-white/5"
                >
                  <img src={msg.message} alt="media" className="h-full w-full object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-3 py-4 text-center text-xs text-secondary italic">No media shared yet</div>
            )}
          </div>
        </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <div className="px-6 py-4 flex flex-col gap-4">
            <span className="text-icon-green text-xs font-bold uppercase tracking-wider">Admin Controls</span>
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => setShowAddMember(true)}
                    className="flex flex-col items-center justify-center gap-2 bg-panel-header-background p-4 rounded-xl border border-conversation-border hover:bg-background-default-hover transition-all text-white group min-w-0"
                >
                    <div className="bg-icon-green/10 p-2 rounded-full group-hover:bg-icon-green/20">
                        <IoPersonAddOutline className="text-icon-green text-xl" />
                    </div>
                    <span className="text-xs truncate w-full px-1">Add Member</span>
                </button>

                <button 
                    onClick={() => handleAdminAction(TOGGLE_GROUP_LOCK_ROUTE, { groupId: currentChatUser.id })}
                    className="flex flex-col items-center justify-center gap-2 bg-panel-header-background p-4 rounded-xl border border-conversation-border hover:bg-background-default-hover transition-all text-white group min-w-0"
                >
                    <div className={`p-2 rounded-full ${currentChatUser?.isLocked ? "bg-red-500/10" : "bg-blue-500/10"}`}>
                        {currentChatUser?.isLocked ? <MdLockOutline className="text-red-500 text-xl" /> : <MdLockOpen className="text-blue-400 text-xl" />}
                    </div>
                    <span className="text-xs truncate w-full px-1">{currentChatUser?.isLocked ? "Unlock Chat" : "Lock Chat"}</span>
                </button>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="px-6 py-4 flex flex-col gap-4 pb-20"> 
          <span className="text-secondary text-sm font-semibold">{currentChatUser?.users?.length} Members</span>
          <div className="flex flex-col gap-1">
            {currentChatUser?.users?.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-panel-header-background/50 transition-all group overflow-hidden">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar type="sm" image={user.profilePicture} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-white text-sm font-medium truncate">
                        {user.name} {user.id === userInfo.id && <span className="text-xs text-secondary ml-1 font-normal">(You)</span>}
                    </span>
                    {currentChatUser.adminIds.includes(user.id) && (
                      <div className="flex items-center gap-1 text-[10px] text-icon-green uppercase font-bold tracking-tighter">
                        <MdAdminPanelSettings /> Admin
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && user.id !== userInfo.id && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button className="p-2 text-white bg-background-default-hover rounded-full hover:bg-icon-green/20 hover:text-icon-green transition-all" onClick={() => handleAdminAction(TOGGLE_ADMIN_ROLE_ROUTE, { groupId: currentChatUser.id, targetUserId: user.id })}>
                      <IoShieldCheckmarkOutline />
                    </button>
                    <button className="p-2 text-red-500 bg-background-default-hover rounded-full hover:bg-red-500 hover:text-white transition-all" onClick={() => handleAdminAction(REMOVE_MEMBER_ROUTE, { groupId: currentChatUser.id, targetUserId: user.id })}>
                      <IoClose />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupInfo;