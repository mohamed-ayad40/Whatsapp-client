import { reducerCases } from "@/context/constants";
import { useStateProvider } from "@/context/StateContext";
import { GET_INITIAL_CONTACTS_ROUTE } from "@/utils/ApiRoutes";
import axios from "axios";
import React, { useEffect } from "react";
import ChatLIstItem from "./ChatLIstItem";

function List({ filteredContacts }) { // استلمناها هنا كـ Prop
  const [{ userInfo, userContacts }, dispatch] = useStateProvider();

  const getContacts = async () => {
    try {
      const { data: { users, onlineUsers } } = await axios.get(`${GET_INITIAL_CONTACTS_ROUTE}/${userInfo.id}`);
      dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers });
      dispatch({ type: reducerCases.SET_USER_CONTACTS, userContacts: users });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!userContacts.length && userInfo?.id) {
      getContacts();
    }
  }, [userInfo]);

  // بنعرض الـ filteredContacts لو موجودة، غير كدة بنعرض الـ userContacts الأصلية
  const contactsToDisplay = (filteredContacts && filteredContacts.length > 0) 
    ? filteredContacts 
    : userContacts;

  return (
    <div className="bg-search-input-container-background flex-auto overflow-auto max-h-full custom-scrollbar">
      {contactsToDisplay.map((contact) => (
        <div key={contact.id} className="animate-fade-in"> 
          <ChatLIstItem data={contact} />
        </div>
      ))}
      
      {/* لو مفيش نتايج خالص تظهر رسالة بسيطة */}
      {contactsToDisplay.length === 0 && (
        <div className="flex items-center justify-center h-full text-secondary text-sm italic">
          No chats found.
        </div>
      )}
    </div>
  );
}

export default List;