import React, { useEffect, useState } from "react";
import ChatListHeader from "./ChatListHeader";
import SearchBar from "./SearchBar";
import List from "./List";
import { useStateProvider } from "@/context/StateContext";
import ContactsList from "./ContactsList";

function ChatList({ setShowSettings }) {
  // 1. سحبنا كل الداتا اللي محتاجينها من الـ Global State
  const [{ contactsPage, userContacts, contactFilter, contactSearch }] = useStateProvider(); 
  const [pageType, setPageType] = useState("default");

  useEffect(() => {
    if(contactsPage) {
      setPageType("all-contacts");
    } else {
      setPageType("default");
    }
  }, [contactsPage]);

  // 2. تطبيق لوجيك الفلترة والفرز
  const filteredContacts = userContacts
    ?.filter((contact) => {
      if (contactFilter === "unread") return contact.totalUnreadMessages > 0;
      if (contactFilter === "groups") return contact.isGroup === true;
      return true; 
    })
    .filter((contact) => {
      return contact.name?.toLowerCase().includes(contactSearch?.toLowerCase() || "");
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="bg-panel-header-background flex flex-col max-h-screen z-20">
      {pageType === "default" && (
        <>
          {/* تمرير الـ setShowSettings للـ Header */}
          <ChatListHeader setShowSettings={setShowSettings} />
          <SearchBar />
          <List filteredContacts={filteredContacts} />
        </>
      )}
      {pageType === "all-contacts" && (
        <ContactsList />
      )}
    </div>
  );
}

export default ChatList;