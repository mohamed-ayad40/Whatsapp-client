import React from "react";
import { BiTime } from "react-icons/bi";
import { BsCheck, BsCheckAll } from "react-icons/bs";

function MessageStatus({messageStatus}) {
  return (<>
    {messageStatus === "sending" && <BiTime className="text-panel-header-icon text-[12px]" />}
    {messageStatus === "sent" && <BsCheck className="text-lg" />}
    {messageStatus === "delivered" && <BsCheckAll className="text-lg" />}
    {messageStatus === "read" && <BsCheckAll className="text-lg text-icon-ack" />}
  </>);
}

export default MessageStatus;
