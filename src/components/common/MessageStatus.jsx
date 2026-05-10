import React from "react";
import { BiTime } from "react-icons/bi";
import { BsCheck, BsCheckAll } from "react-icons/bs";

function MessageStatus({ messageStatus, isGroup, seenCount, totalMembers }) {
  // المنطق: لو جروب، تبقى زرقاء لما عدد اللي شافوا يوصل لعدد الأعضاء (ناقص الراسل)
  const isReadByAll = isGroup 
    ? (seenCount >= (totalMembers - 1)) 
    : (messageStatus === "read");

  return (
    <>
      {messageStatus === "sending" && (
        <BiTime className="text-panel-header-icon text-[12px]" />
      )}
      
      {/* علامة صح واحدة */}
      {messageStatus === "sent" && !isReadByAll && (
        <BsCheck className="text-lg text-icon-lighter" />
      )}

      {/* علامتين صح رمادي (وصلت بس لسه مكملتش في الجروب) */}
      {(messageStatus === "delivered" || (isGroup && !isReadByAll && seenCount > 0)) && (
        <BsCheckAll className="text-lg text-icon-lighter" />
      )}

      {/* علامتين صح زرقاء (اتقرأت فردي أو الكل شافها في الجروب) */}
      {isReadByAll && (
        <BsCheckAll className="text-lg text-icon-ack" />
      )}
    </>
  );
}

export default MessageStatus;