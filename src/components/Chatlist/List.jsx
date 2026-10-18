import React from "react";
import { useStateProvider } from "@/context/StateContext";
import ChatLIstItem from "./ChatLIstItem";

function List({ filteredContacts }) {
  const [{ userContacts, contactFilter, contactSearch }] = useStateProvider();

  const contactsToDisplay = filteredContacts ?? userContacts ?? [];

  let emptyText = "No chats yet.";
  if (contactSearch) emptyText = "No chats found.";
  else if (contactFilter === "unread") emptyText = "No unread chats.";
  else if (contactFilter === "groups") emptyText = "No groups yet.";

  return (
    <div className="bg-search-input-container-background flex-auto overflow-auto max-h-full custom-scrollbar">
      {contactsToDisplay.map((contact) => (
        <div key={contact.id} className="animate-fade-in">
          <ChatLIstItem data={contact} />
        </div>
      ))}

      {contactsToDisplay.length === 0 && (
        <div className="flex items-center justify-center h-full text-secondary text-sm italic py-6">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export default List;
