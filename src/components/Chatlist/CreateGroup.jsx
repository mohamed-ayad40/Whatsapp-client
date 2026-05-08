import React, { useState } from "react";
import { MdOutlineClose, MdSearch } from "react-icons/md";
import { useStateProvider } from "@/context/StateContext";
import axios from "axios";
import { CREATE_GROUP_ROUTE } from "@/utils/ApiRoutes";
import Avatar from "../common/Avatar";

function CreateGroup({ onClose }) {
    const [{ userInfo, userContacts }] = useStateProvider();
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false); // State شريط التحميل

    // 1. استبعاد اليوزر الحالي + استبعاد الجروبات من القائمة
    const contactsToShow = userContacts.filter(
        (contact) =>
            contact.id !== userInfo?.id &&
            !contact.isGroup && // <-- دي بتمنع ظهور الجروبات في القائمة
            contact.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMemberSelect = (id) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter((memberId) => memberId !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    const createGroupHandler = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) {
            alert("Please enter a group name and select at least one member.");
            return;
        }

        setIsCreating(true); // نشغل شريط التحميل

        try {
            const { data } = await axios.post(CREATE_GROUP_ROUTE, {
                groupName,
                users: selectedMembers,
                adminId: userInfo.id
            });

            if (data.group) {
                onClose(); // نقفل المودال بعد ما يخلص براحته
            }
        } catch (error) {
            console.error("Error creating group:", error);
            setIsCreating(false); // لو حصل إيرور نوقف التحميل
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            
            <div className="bg-panel-header-background w-[400px] h-[600px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* 2. شريط التحميل الأنيق (بيظهر بس وقت الإنشاء) */}
                {isCreating && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-conversation-border z-50 overflow-hidden">
                        <div className="h-full bg-teal-light w-1/3 relative" style={{ animation: "moveRight 1s linear infinite" }}>
                            <style>{`
                                @keyframes moveRight {
                                    0% { left: -30%; }
                                    100% { left: 100%; }
                                }
                            `}</style>
                        </div>
                    </div>
                )}

                <div className="h-16 px-4 flex items-center justify-between bg-panel-header-background border-b border-conversation-border">
                    <span className="text-white font-semibold text-lg">Create New Group</span>
                    <MdOutlineClose
                        className={`text-icon-lighter text-2xl transition-colors ${isCreating ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:text-white"}`}
                        onClick={!isCreating ? onClose : null}
                    />
                </div>

                <div className="p-6 flex flex-col items-center border-b border-conversation-border">
                    <input
                        type="text"
                        placeholder="Group Subject"
                        disabled={isCreating}
                        className="bg-transparent text-2xl text-center focus:outline-none text-white w-full placeholder:text-icon-lighter mb-2"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                    />
                    <div className={`w-full h-[2px] transition-colors duration-300 ${groupName.length > 0 ? "bg-teal-light" : "bg-icon-lighter/30"}`}></div>
                </div>

                <div className="px-4 py-3 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-secondary">Contacts</span>
                        <span className="text-teal-light font-medium">{selectedMembers.length} Selected</span>
                    </div>
                    <div className="bg-search-input-container-background flex items-center h-10 px-3 rounded-lg">
                        <MdSearch className="text-icon-lighter text-xl mr-2" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            disabled={isCreating}
                            className="bg-transparent text-sm focus:outline-none text-white w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {contactsToShow.length > 0 ? (
                        contactsToShow.map((contact) => (
                            <div
                                key={contact.id}
                                className={`flex items-center px-4 py-3 transition-colors ${isCreating ? "opacity-50" : "cursor-pointer hover:bg-background-default-hover"}`}
                                onClick={() => !isCreating && handleMemberSelect(contact.id)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(contact.id)}
                                    readOnly
                                    className="mr-4 w-4 h-4 accent-teal-light cursor-pointer rounded-sm"
                                />
                                <Avatar type="sm" image={contact.profilePicture} />
                                <div className="flex flex-col ml-4">
                                    <span className="text-white font-medium">{contact.name}</span>
                                    <span className="text-icon-lighter text-xs truncate max-w-[200px]">
                                        {contact.about || "Available"}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-icon-lighter mt-10 text-sm">No contacts found</div>
                    )}
                </div>

                <div className="p-4 bg-panel-header-background border-t border-conversation-border">
                    <button
                        onClick={createGroupHandler}
                        disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
                        className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
                            groupName.trim() && selectedMembers.length > 0 && !isCreating
                            ? "bg-teal-light text-white hover:bg-teal-dark shadow-lg" 
                            : "bg-search-input-container-background text-icon-lighter cursor-not-allowed"
                        }`}
                    >
                        Create Group
                    </button>
                </div>

            </div>
        </div>
    );
}

export default CreateGroup;