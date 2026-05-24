export const HOST = process.env.NEXT_PUBLIC_HOST;

const AUTH_ROUTE = `${HOST}/api/auth`;
const MESSAGES_ROUTE = `${HOST}/api/messages`;
const GROUP_ROUTES = `${HOST}/api/groups`;

export const CHECK_USER_ROUTE = `${AUTH_ROUTE}/check-user`;
export const ONBOARD_USER_ROUTE = `${AUTH_ROUTE}/onboard-user`;
export const GET_ALL_CONTACTS = `${AUTH_ROUTE}/get-contacts`;
export const GET_CALL_TOKEN = `${AUTH_ROUTE}/generate-token`;
export const TOGGLE_BLOCK_USER_ROUTE = `${AUTH_ROUTE}/toggle-block`;
export const UPDATE_USER_ROUTE = `${AUTH_ROUTE}/update-user`;

export const ADD_MESSAGE_ROUTE = `${MESSAGES_ROUTE}/add-message`;
export const GET_MESSAGES_ROUTE = `${MESSAGES_ROUTE}/get-messages`;
export const ADD_IMAGE_MESSAGE_ROUTE = `${MESSAGES_ROUTE}/add-image-message`;
export const ADD_AUDIO_MESSAGE_ROUTE = `${MESSAGES_ROUTE}/add-audio-message`;
export const GET_INITIAL_CONTACTS_ROUTE = `${MESSAGES_ROUTE}/get-initial-contacts`;
export const EDIT_MESSAGE_ROUTE = `${MESSAGES_ROUTE}/edit-message`;
export const DELETE_MESSAGE_ROUTE = `${MESSAGES_ROUTE}/delete-message`;
export const GET_GROUP_MEDIA_ROUTE = `${MESSAGES_ROUTE}/get-group-media`;
export const DELETE_CHAT_ROUTE = `${MESSAGES_ROUTE}/delete-chat`;

export const CREATE_GROUP_ROUTE = `${GROUP_ROUTES}/create-group`;
export const TOGGLE_GROUP_LOCK_ROUTE = `${GROUP_ROUTES}/toggle-lock`;
export const TOGGLE_ADMIN_ROLE_ROUTE = `${GROUP_ROUTES}/toggle-admin`;
export const REMOVE_MEMBER_ROUTE = `${GROUP_ROUTES}/remove-member`;
export const ADD_GROUP_MEMBERS_ROUTE = `${GROUP_ROUTES}/add-members`;
export const UPDATE_GROUP_ROUTE = `${GROUP_ROUTES}/update`;