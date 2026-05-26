import React from "react";
import { BiTime } from "react-icons/bi";
import { BsCheck, BsCheckAll } from "react-icons/bs";

function MessageStatus({ messageStatus, isGroup, seenCount, totalMembers }) {
  const isReadByAll = isGroup 
    ? ((seenCount > 0 && seenCount >= (totalMembers - 1)) || messageStatus === "read") 
    : (messageStatus === "read");

  const isDeliveredToSome = isGroup && !isReadByAll && (seenCount > 0 || messageStatus === "delivered");
  return (
    <>
      {messageStatus === "sending" && (
        <BiTime className="text-panel-header-icon text-[12px]" />
      )}
      
      {messageStatus === "sent" && !isReadByAll && !isDeliveredToSome && (
        <BsCheck className="text-lg text-icon-lighter" />
      )}

      {(messageStatus === "delivered" || isDeliveredToSome) && !isReadByAll && (
        <BsCheckAll className="text-lg text-icon-lighter" />
      )}

      {isReadByAll && (
        <BsCheckAll className="text-lg text-icon-ack" />
      )}
    </>
  );
}

export default MessageStatus;