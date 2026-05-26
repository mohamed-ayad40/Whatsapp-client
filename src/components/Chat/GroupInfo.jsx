import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { IoClose, IoPersonAddOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { MdLockOutline, MdLockOpen, MdAdminPanelSettings } from "react-icons/md";
import Avatar from "../common/Avatar";
import { 
  TOGGLE_GROUP_LOCK_ROUTE, 
  TOGGLE_ADMIN_ROLE_ROUTE, 
  REMOVE_MEMBER_ROUTE, 
  GET_GROUP_MEDIA_ROUTE,
  UPDATE_GROUP_ROUTE 
} from "@/utils/ApiRoutes";
import ContactsList from "../Chatlist/ContactsList";
import { decryptText } from "@/utils/Crypto"; // 🚨 استيراد دالة فك التشفير
import ContextMenu from "../common/ContextMenu";

function GroupInfo({ onClose }) {

  // 🚨 حالات الـ Quick Actions Menu للأعضاء
  const [activeMemberMenu, setActiveMemberMenu] = useState(null); // عشان نعرف بندوس على مين
  const [memberMenuCordinates, setMemberMenuCordinates] = useState({ x: 0, y: 0 });

  const showMemberQuickActions = (e, member) => {
    e.preventDefault();
    e.stopPropagation();
    if (member.id === userInfo.id) return; // مفيش قايمة لنفسك
    
    setMemberMenuCordinates({ x: e.pageX, y: e.pageY });
    setActiveMemberMenu(member);
  };
  const [{ currentChatUser, userInfo }, dispatch] = useStateProvider();
  const [showAddMember, setShowAddMember] = useState(false);
  const [mediaMessages, setMediaMessages] = useState([]); 
  
  const isAdmin = currentChatUser?.adminIds?.includes(userInfo?.id);

  useEffect(() => {
    const fetchGroupMedia = async () => {
      try {
        if (currentChatUser?.isGroup) {
          const { data } = await axios.get(`${GET_GROUP_MEDIA_ROUTE}/${currentChatUser.id}`);
          
          // 🚨 التعديل السحري: فك تشفير الصور قبل ما تترسم في الشاشة
          const groupKey = localStorage.getItem(`group-key-${currentChatUser.id}`) || currentChatUser.id;
          
          const decryptedMedia = data.mediaMessages.map(msg => {
            let url = msg.message;
            try {
              url = decryptText(url, groupKey);
            } catch (e) {
              console.log("Media decryption failed for:", msg.id);
            }
            return { ...msg, message: url };
          });

          setMediaMessages(decryptedMedia);
        }
      } catch (err) {
        console.error("Error fetching group media:", err);
      }
    };
    fetchGroupMedia();
  }, [currentChatUser]);

  const handleAdminAction = async (route, payload) => {
    const previousLockedState = currentChatUser?.isLocked;

    if (route === TOGGLE_GROUP_LOCK_ROUTE) {
      dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: { ...currentChatUser, isLocked: !previousLockedState },
      });
    }

    try {
      const { data } = await axios.post(route, payload);
      dispatch({ 
        type: reducerCases.CHANGE_CURRENT_CHAT_USER, 
        user: { ...currentChatUser, ...data.group } 
      });
    } catch (err) {
      console.error("Admin Action Failed:", err);
      if (route === TOGGLE_GROUP_LOCK_ROUTE) {
        dispatch({
          type: reducerCases.CHANGE_CURRENT_CHAT_USER,
          user: { ...currentChatUser, isLocked: previousLockedState },
        });
      }
    }
  };

  const handleGroupImageChange = async (newImage) => {
    // 1. تحديث اليوزر الحالي (عشان الصورة تتغير جوه الشات)
    dispatch({
        type: reducerCases.CHANGE_CURRENT_CHAT_USER,
        user: { ...currentChatUser, profilePicture: newImage }
    });
    
    // 🚨 2. التعديل السحري: تحديث لستة الـ Contacts عشان Dexie يحفظها فوراً وميأخرش في الـ Refresh
    dispatch({
        type: reducerCases.UPDATE_GROUP_IN_CONTACTS,
        group: { 
            id: currentChatUser.id, 
            name: currentChatUser.name, 
            profilePicture: newImage, 
            about: currentChatUser.about 
        }
    });
    
    try {
       await axios.post(UPDATE_GROUP_ROUTE, {
         groupId: currentChatUser.id,
         profilePicture: newImage
       });
    } catch (err) {
       console.log("Error updating group image in backend", err);
    }
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
    <div className="flex flex-col bg-[#0b141a] h-full w-full border-l border-conversation-border animate-sidebar-slide shadow-2xl">
      <div className="h-16 px-6 py-5 flex items-center gap-6 bg-panel-header-background text-primary-strong border-b border-conversation-border flex-shrink-0">
        <IoClose className="cursor-pointer text-2xl hover:text-white transition-all" onClick={onClose} />
        <span className="font-medium truncate">Group Info</span>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-background-default min-h-0">
        <div className="flex flex-col items-center p-8 bg-panel-header-background/30 mb-2">
          
          <div 
             className="mb-4 cursor-pointer transform transition-transform hover:scale-105 duration-300"
             onClick={(e) => {
                // 🚨 فلترة صارمة: نمنع فتح الصورة لو الكليك جاي من الكاميرا، أو من الـ input بتاع رفع الصور
                if (
                  e.target.id === 'context-opener' || 
                  e.target.closest('#context-opener') || 
                  e.target.id === 'photo-picker' || 
                  e.target.closest('input')
                ) return;

                if (currentChatUser?.profilePicture) {
                   dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: currentChatUser.profilePicture });
                }
             }}
          >
            <Avatar 
               type="xl" 
               image={currentChatUser?.profilePicture} 
               viewOnly={!isAdmin} 
               setImage={handleGroupImageChange}
               onViewPhoto={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: currentChatUser.profilePicture })}
            />
          </div>

          <h2 className="text-white text-2xl mt-4 font-semibold truncate max-w-full px-4">{currentChatUser?.name}</h2>
          <span className="text-secondary mt-1">Group • {currentChatUser?.users?.length} Members</span>
        </div>

        {/* 🚨 الجزء المحدث الخاص بالميديا في الجروب */}
        <div className="px-6 py-4 flex flex-col gap-4 border-b border-conversation-border/50">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => {
              // 🚨 إضافة اللوجيك لفتح الشاشة المجمعة لما تدوس على السهم أو العنوان
              if (mediaMessages.length > 0) {
                dispatch({ type: "SET_SHARED_MEDIA_MODAL", payload: mediaMessages });
              }
            }}
          >
            <span className="text-secondary text-sm font-semibold">Media, Links and Docs</span>
            <span className="text-icon-green text-xs group-hover:underline">
              {mediaMessages.length > 0 ? mediaMessages.length : ""} ❯
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {mediaMessages.length > 0 ? (
              mediaMessages.slice(0, 6).map((msg) => (
                <div 
                  key={msg.id} 
                  // 🚨 إصلاح اسم الأكشن عشان الصورة تكبر لما تدوس عليها
                  onClick={() => dispatch({ type: reducerCases.SET_IMAGE_VIEWER, imageViewer: msg.message })}
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

        <div className="px-6 py-4 flex flex-col gap-4 pb-20"> 
          <span className="text-secondary text-sm font-semibold">{currentChatUser?.users?.length} Members</span>
          <div className="flex flex-col gap-1">
            {currentChatUser?.users?.map((user) => (
              <div key={user.id} className="relative flex items-center justify-between py-3 px-2 rounded-lg hover:bg-panel-header-background/50 transition-all group overflow-visible">
                
                {/* 🚨 التعديل السحري: نقلنا الـ onClick للـ div الأب اللي شايل الصورة والاسم مع بعض */}
                <div 
                  className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
                  onClick={(e) => showMemberQuickActions(e, user)}
                >
                  <div className="hover:opacity-80 transition-all flex-shrink-0">
                    <Avatar type="sm" image={user.profilePicture} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-white text-sm font-medium truncate">
                        {user.name} {user.id === userInfo.id && <span className="text-xs text-secondary ml-1 font-normal">(You)</span>}
                    </span>
                    {currentChatUser.adminIds.includes(user.id) && (
                      <div className="flex items-center gap-1 text-[10px] text-icon-green uppercase font-bold tracking-tighter mt-[2px]">
                        <MdAdminPanelSettings className="text-[12px]" /> Admin
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin && user.id !== userInfo.id && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 z-10 relative">
                    <button 
                      className="p-2 text-white bg-background-default-hover rounded-full hover:bg-icon-green/20 hover:text-icon-green transition-all" 
                      onClick={(e) => { e.stopPropagation(); handleAdminAction(TOGGLE_ADMIN_ROLE_ROUTE, { groupId: currentChatUser.id, targetUserId: user.id }); }}
                    >
                      <IoShieldCheckmarkOutline />
                    </button>
                    <button 
                      className="p-2 text-red-500 bg-background-default-hover rounded-full hover:bg-red-500 hover:text-white transition-all" 
                      onClick={(e) => { e.stopPropagation(); handleAdminAction(REMOVE_MEMBER_ROUTE, { groupId: currentChatUser.id, targetUserId: user.id }); }}
                    >
                      <IoClose />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 🚨 عرض القائمة السريعة للـ Quick Actions للعضو */}
          {activeMemberMenu && (
            <ContextMenu 
              options={[
                {
                  name: "Text Message",
                  callback: () => {
                    dispatch({ type: reducerCases.CHANGE_CURRENT_CHAT_USER, user: activeMemberMenu });
                  },
                },
                {
                  name: "Voice Call",
                  callback: () => {
                    dispatch({ type: reducerCases.SET_VOICE_CALL, voiceCall: { ...activeMemberMenu, type: "out-going", callType: "voice", roomId: Date.now() } });
                  },
                },
                {
                  name: "Video Call",
                  callback: () => {
                    dispatch({ type: reducerCases.SET_VIDEO_CALL, videoCall: { ...activeMemberMenu, type: "out-going", callType: "video", roomId: Date.now() } });
                  },
                }
              ]} 
              cordinates={memberMenuCordinates} 
              contextMenu={activeMemberMenu !== null} 
              setContextMenu={() => setActiveMemberMenu(null)} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupInfo;