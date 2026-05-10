import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { GET_ALL_CONTACTS, ADD_GROUP_MEMBERS_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { BiArrowBack, BiSearchAlt2 } from "react-icons/bi";
import { MdDone } from "react-icons/md"; // أيقونة التأكيد
import ChatLIstItem from "./ChatLIstItem";
import { encryptGroupKeyForMember } from "@/utils/Crypto";

const ContactSkeleton = () => (
  <div className="flex items-center gap-5 px-5 py-3 animate-pulse">
    <div className="bg-panel-header-background rounded-full h-12 w-12"></div>
    <div className="flex-grow flex flex-col gap-3">
      <div className="bg-panel-header-background h-3 w-1/4 rounded"></div>
      <div className="bg-panel-header-background h-2 w-1/2 rounded opacity-50"></div>
    </div>
  </div>
);

function ContactsList({ isAddMode = false, groupId = null, existingMembers = [], onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchContacts, setSearchContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]); // الأعضاء اللي اخترناهم للإضافة
  const [{ userInfo }, dispatch] = useStateProvider();

  
  // لوجيك البحث والفلترة
  useEffect(() => {
    const filterData = (data) => {
      const filteredData = {};
      Object.keys(data).forEach((key) => {
        filteredData[key] = data[key].filter((obj) => {
          // 1. فلترة بالاسم
          const matchesSearch = obj.name.toLowerCase().includes(searchTerm.toLowerCase());
          // 2. فلترة الأعضاء الموجودين أصلاً (لو إحنا في وضع الإضافة)
          const isNotMember = isAddMode ? !existingMembers.includes(obj.id) : true;
          return matchesSearch && isNotMember;
        });
      });
      return filteredData;
    };

    if (allContacts) {
      setSearchContacts(filterData(allContacts));
    }
  }, [searchTerm, allContacts, isAddMode, existingMembers]);

  // داخل useEffect الخاص بـ getContacts في ContactsList.jsx
  useEffect(() => {
    const getContacts = async () => {
      try {
        setIsLoading(true);
        const { data: { users } } = await axios.get(GET_ALL_CONTACTS);
        
        // --- [تأمين] فك تشفير About لكل جهة اتصال ---
        const securedUsers = {};
        Object.keys(users).forEach((key) => {
            securedUsers[key] = users[key].map(contact => {
                let decryptedAbout = contact.about;
                try {
                    if (contact.about && contact.about.includes(":")) {
                        decryptedAbout = decryptText(contact.about, contact.id);
                    }
                } catch (e) {
                    decryptedAbout = contact.about;
                }
                return { ...contact, about: decryptedAbout };
            });
        });
        // -------------------------------------------

        setAllContacts(securedUsers);
        setIsLoading(false);
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };
    getContacts();
  }, []);

  // وظيفة اختيار/إلغاء اختيار عضو
  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const addMembersToGroup = async () => {
    if (!selectedUsers.length) return;
    try {
      // 1. نجيب مفتاح الجروب (AES) من الـ LocalStorage أو نولد واحد لو أول مرة
      let groupKey = localStorage.getItem(`group-key-${groupId}`);
      if (!groupKey) {
        // توليد مفتاح AES عشوائي 256-بت (32 بايت)
        groupKey = btoa(String.fromCharCode(...window.crypto.getRandomValues(new Uint8Array(32))));
        localStorage.setItem(`group-key-${groupId}`, groupKey);
      }

      // 2. تحويل الـ Contacts لـ Flat Array عشان نلاقي الـ Public Keys بسهولة
      const flattenedContacts = Object.values(allContacts).flat();

      // 3. تشفير مفتاح الجروب لكل عضو مختار باستخدام الـ RSA Public Key بتاعه
      const membersWithEncryptedKeys = await Promise.all(
        selectedUsers.map(async (userId) => {
          const contact = flattenedContacts.find((c) => c.id === userId);
          
          if (!contact?.publicKey) {
            console.error(`User ${contact?.name} has no public key. Security skip.`);
            return null; // أو تطلع alert لليوزر إن الشخص ده حسابه مش متأمن
          }

          const encryptedKey = await encryptGroupKeyForMember(groupKey, contact.publicKey);
          return { userId, encryptedKey };
        })
      );

      // فلترة الناس اللي ملهمش مفاتيح (عشان متبوظش الريكويست)
      const validMembers = membersWithEncryptedKeys.filter(m => m !== null);

      if (validMembers.length === 0) {
        alert("None of the selected users have security keys. They must log in again to generate them.");
        return;
      }

      // 4. إرسال الطرود المشفرة للباك إند
      const { data } = await axios.post(ADD_GROUP_MEMBERS_ROUTE, {
        groupId,
        members: validMembers, // بعتنا لستة فيها (الـ ID + المفتاح المتشفر ليه)
      });

      dispatch({ type: reducerCases.CHANGE_CURRENT_CHAT_USER, user: data.group });
      onClose(); 
    } catch (err) {
      console.log("Safe Add Member Failed:", err);
    }
  };

  return (
    <div className="h-full flex flex-col relative transition-all duration-300">
      <div className="h-24 flex items-end px-3 py-4">
        <div className="flex items-center gap-12 text-white">
          <BiArrowBack 
            className="cursor-pointer text-xl"
            onClick={() => isAddMode ? onClose() : dispatch({ type: reducerCases.SET_ALL_CONTACTS_PAGE })}
          />
          <span>{isAddMode ? "Add Group Members" : "New Chat"}</span>
        </div>
      </div>
      
      <div className="bg-search-input-container-background h-full flex-auto overflow-auto custom-scrollbar relative">
        <div className="flex py-3 items-center gap-3 h-14">
          <div className="bg-panel-header-background flex items-center gap-5 px-3 py-1 rounded-lg flex-grow mx-4">
            <BiSearchAlt2 className="text-panel-header-icon cursor-pointer text-l" />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              type="text" 
              placeholder="Search Contacts" 
              className="bg-transparent text-sm focus:outline-none text-white w-full" 
            />
          </div>
        </div>

        {isLoading ? (
          Array(10).fill(0).map((_, i) => <ContactSkeleton key={i} />)
        ) : (
          Object.entries(searchContacts).map(([initialLetter, userList]) => (
            <div key={initialLetter}>
              {userList.length > 0 && (
                <div className="text-teal-light pl-10 py-5">{initialLetter}</div>
              )}
              {userList.map(contact => (
                <ChatLIstItem 
                  data={contact}
                  isContactsPage={!isAddMode}
                  isSelectionMode={isAddMode} // تفعيل وضع الاختيار
                  isSelected={selectedUsers.includes(contact.id)} // هل تم اختياره؟
                  onSelect={toggleUserSelection} // الأكشن عند الضغط
                  key={contact.id}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* زرار التأكيد العائم (يظهر فقط لو اخترنا أعضاء) */}
      {isAddMode && selectedUsers.length > 0 && (
        <div 
          onClick={addMembersToGroup}
          className="absolute bottom-10 right-10 bg-icon-green h-14 w-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl animate-fade-in z-50 hover:scale-110 transition-transform"
        >
          <MdDone className="text-white text-3xl" />
        </div>
      )}
    </div>
  );
}

export default ContactsList;