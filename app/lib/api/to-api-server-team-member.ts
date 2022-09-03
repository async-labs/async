import sendRequestAndGetResponse from './sendRequestAndGetResponse';

const API_ENDPOINT = '/api/v1/to-api-server/team-member';
const type = 'apiServer';

// returns users
export const getTeamMembersApiMethod = (teamId: string) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/get-team-members`, {
    type,
    teamId,
    method: 'GET',
  });

// returns done: 1
export const leaveTeamApiMethod = ({
  teamIdOfTeamInQuestion,
}: {
  teamIdOfTeamInQuestion: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/leave-team`, {
    type: 'api',
    body: JSON.stringify({ teamIdOfTeamInQuestion }),
  });

// returns:
// initialData =
// { initialTeams, selectedTeamId, initialDiscussions, selectedDiscussionId, isSelectedDiscussionArchived, initialChats, selectedChatId }
export const getInitialDataApiMethod = ({
  request,
  discussionId,
  chatId,
  teamId,
}: {
  request: any;
  discussionId?: string;
  chatId?: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/get-initial-data`, {
    type,
    request,
    teamId,
    body: JSON.stringify({
      discussionId,
      chatId,
    }),
  });

// returns done: 1
export const createOrUpdateUserProfileApiMethod = ({
  email,
  userName,
  userAvatarUrl,
  teamId,
}: {
  email: string;
  userName: string;
  userAvatarUrl: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/create-or-update-user-profile`, {
    type,
    teamId,
    body: JSON.stringify({ email, userName, userAvatarUrl }),
  });

// returns done: 1
export const makeTeamDefaultApiMethod = (teamId: string, defaultTeamId: string) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/make-team-default`, {
    type,
    teamId,
    body: JSON.stringify({ defaultTeamId }),
  });

// returns returnedDataFromS3
export const getSignedRequestForPutApiMethod = ({
  file,
  teamId,
  discussionId,
  commentId,
  chatId,
  messageId,
  socketId,
}: {
  file: File;
  teamId: string;
  discussionId?: string;
  commentId?: string;
  chatId?: string;
  messageId?: string;
  socketId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/aws/s3/get-signed-request-for-put-to-s3`, {
    type,
    teamId,
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      discussionId,
      commentId,
      chatId,
      messageId,
      socketId,
    }),
  });

// returns done: 1
export const toggleThemeApiMethod = ({
  showDarkTheme,
  teamId,
}: {
  showDarkTheme: boolean;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/toggle-theme`, {
    type,
    teamId,
    body: JSON.stringify({ showDarkTheme }),
  });

// Discussion

// returns discussions
export const getActiveDiscussionListApiMethod = ({ teamId }: { teamId: string }) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/list-active`, {
    type,
    teamId,
    method: 'GET',
  });

// returns discussions
export const getArchivedDiscussionListApiMethod = ({ teamId }: { teamId: string }) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/list-archived`, {
    type,
    teamId,
    method: 'GET',
  });

// returns { discussion, initialComments }
export const createOrUpdateDiscussionApiMethod = ({
  discussionName,
  discussionMemberIds,
  socketId,
  teamId,
  id,
  content,
  files,
}: {
  discussionName: string;
  discussionMemberIds: string[];
  socketId: string;
  teamId: string;
  id: string;
  content: string;
  files?: { fileName: string; fileUrl: string; addedAt: Date }[];
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/create-or-update`, {
    type,
    teamId,
    body: JSON.stringify({
      discussionName,
      discussionMemberIds,
      socketId,
      id,
      content,
      files,
    }),
  });

// returns done: 1
export const deleteDiscussionApiMethod = ({
  discussionId,
  socketId,
  teamId,
  whichList,
}: {
  discussionId: string;
  socketId: string;
  teamId: string;
  whichList: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/delete`, {
    type,
    teamId,
    body: JSON.stringify({ discussionId, socketId, whichList }),
  });

// returns done: 1
export const archiveDiscussionApiMethod = ({
  discussionId,
  socketId,
  teamId,
  action,
}: {
  discussionId: string;
  socketId: string;
  teamId: string;
  action: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/archive-unarchive`, {
    type,
    teamId,
    body: JSON.stringify({ discussionId, socketId, action }),
  });

// return discussions
export const searchDiscussionsApiMethod = ({
  query,
  whichList,
  teamId,
}: {
  query: string;
  whichList: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/search-discussions-by-content`, {
    type,
    teamId,
    method: 'GET',
    qs: { query, whichList },
  });

// returns done: 1
export const pinDiscussionApiMethod = ({
  discussionId,
  teamId,
}: {
  discussionId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/pin`, {
    type,
    teamId,
    body: JSON.stringify({ discussionId }),
  });

// returns done: 1
export const unpinDiscussionApiMethod = ({
  discussionId,
  teamId,
}: {
  discussionId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/discussions/unpin`, {
    type,
    teamId,
    body: JSON.stringify({ discussionId }),
  });

// Comment

// returns done: 1
export const readCommentApiMethod = ({
  commentId,
  teamId,
}: {
  commentId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/read-comment`, {
    type,
    teamId,
    body: JSON.stringify({ commentId }),
  });

// returns done: 1
export const unreadCommentApiMethod = ({
  commentId,
  teamId,
}: {
  commentId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/unread-comment`, {
    type,
    teamId,
    body: JSON.stringify({ commentId }),
  });

// returns comments
export const getCommentListApiMethod = ({
  discussionId,
  teamId,
}: {
  discussionId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/list`, {
    type,
    teamId,
    method: 'GET',
    qs: { discussionId },
  });

// returns comment
export const addOrEditCommentApiMethod = ({
  content,
  discussionId,
  socketId,
  teamId,
  id,
  files,
}: {
  content: string;
  discussionId: string;
  socketId: string;
  teamId: string;
  id: string;
  files?: { fileName: string; fileUrl: string; addedAt: Date }[];
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/add-or-edit`, {
    type,
    teamId,
    body: JSON.stringify({ content, discussionId, socketId, id, files }),
  });

// returns done: 1
export const deleteCommentApiMethod = ({
  id,
  discussionId,
  socketId,
  teamId,
}: {
  id: string;
  discussionId: string;
  socketId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/delete`, {
    type,
    teamId,
    body: JSON.stringify({ id, discussionId, socketId }),
  });

// returns done: 1
// consider adding socketId
export const deleteFileForCommentApiMethod = ({
  commentId,
  fileUrl,
  teamId,
  socketId,
  discussionId,
}: {
  commentId: string;
  fileUrl: string;
  teamId: string;
  socketId: string;
  discussionId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/delete-file`, {
    type,
    teamId,
    body: JSON.stringify({ commentId, fileUrl, socketId, discussionId }),
  });

// returns done: 1
export const deleteFileThatHasNoCommentApiMethod = ({
  fileUrl,
  teamId,
}: {
  fileUrl: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/comments/delete-file-no-comment`, {
    type,
    teamId,
    body: JSON.stringify({ fileUrl }),
  });

// Chat

// returns chats
export const getChatListApiMethod = ({ teamId }: { teamId: string }) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/list`, {
    type,
    teamId,
    method: 'GET',
  });

// returns { chat, initialMessages }
export const createOrUpdateChatApiMethod = ({
  chatParticipantIds,
  socketId,
  teamId,
  id,
  content,
}: {
  chatParticipantIds: string[];
  socketId: string;
  teamId: string;
  id: string;
  content: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/create-or-update`, {
    type,
    teamId,
    body: JSON.stringify({
      chatParticipantIds,
      socketId,
      id,
      content,
    }),
  });

// returns done: 1
export const deleteChatApiMethod = ({
  chatId,
  socketId,
  teamId,
}: {
  chatId: string;
  socketId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/delete`, {
    type,
    teamId,
    body: JSON.stringify({ chatId, socketId }),
  });

// returns done: 1
export const clearChatHistoryApiMethod = ({
  chatId,
  socketId,
  teamId,
}: {
  chatId: string;
  socketId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/clear-history`, {
    type,
    teamId,
    body: JSON.stringify({ chatId, socketId }),
  });

// return messages (not chats)
export const searchWithinChatApiMethod = ({
  query,
  chatId,
  teamId,
}: {
  query: string;
  chatId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/search-within-chat`, {
    type,
    teamId,
    method: 'GET',
    qs: { query, chatId },
  });

// returns done: 1
export const pinChatApiMethod = ({ chatId, teamId }: { chatId: string; teamId: string }) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/pin`, {
    type,
    teamId,
    body: JSON.stringify({ chatId }),
  });

// returns done: 1
export const unpinChatApiMethod = ({ chatId, teamId }: { chatId: string; teamId: string }) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/chats/unpin`, {
    type,
    teamId,
    body: JSON.stringify({ chatId }),
  });

// Message

// returns done: 1
export const messagesWereSeenApiMethod = ({
  messageIds,
  teamId,
  chatId,
  socketId,
}: {
  messageIds: string[];
  teamId: string;
  chatId: string;
  socketId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/messages-were-seen`, {
    type,
    teamId,
    body: JSON.stringify({ messageIds, chatId, socketId }),
  });

// returns message
export const getMessageListApiMethod = ({
  chatId,
  teamId,
  batchNumberForMessages,
}: {
  chatId: string;
  teamId: string;
  batchNumberForMessages: number;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/list`, {
    type,
    teamId,
    method: 'GET',
    qs: { chatId, batchNumberForMessages },
  });

// returns message
export const addOrEditMessageApiMethod = ({
  content,
  chatId,
  socketId,
  teamId,
  id,
  files,
  parentMessageId,
}: {
  content: string;
  chatId: string;
  socketId: string;
  teamId: string;
  id: string;
  files?: { fileName: string; fileUrl: string; addedAt: Date }[];
  parentMessageId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/add-or-edit`, {
    type,
    teamId,
    body: JSON.stringify({ content, chatId, socketId, id, files, parentMessageId }),
  });

// returns done: 1
export const deleteMessageApiMethod = ({
  id,
  chatId,
  socketId,
  teamId,
}: {
  id: string;
  chatId: string;
  socketId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/delete`, {
    type,
    teamId,
    body: JSON.stringify({ id, chatId, socketId }),
  });

// returns done: 1
// consider adding socketId
export const deleteFileForMessageApiMethod = ({
  fileUrl,
  teamId,
  socketId,
  messageId,
  chatId,
}: {
  fileUrl: string;
  teamId: string;
  socketId: string;
  messageId: string;
  chatId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/delete-file`, {
    type,
    teamId,
    body: JSON.stringify({ fileUrl, socketId, messageId, chatId }),
  });

// returns done: 1
export const deleteFileThatHasNoMessageApiMethod = ({
  fileUrl,
  teamId,
}: {
  fileUrl: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/delete-file-no-message`, {
    type,
    teamId,
    body: JSON.stringify({ fileUrl }),
  });

// returns done: 1
export const sendOnlineStatusToServerApiMethod = ({
  status,
  teamId,
  socketId,
}: {
  status: boolean;
  teamId: string;
  socketId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/change-online-status`, {
    type,
    teamId,
    body: JSON.stringify({ status, socketId, teamId }),
  });

// returns done: 1
export const updateTypingStatusViaServerApiMethod = ({
  status,
  teamId,
  chatId,
  socketId,
}: {
  status: boolean;
  teamId: string;
  chatId: string;
  socketId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/update-typing-status`, {
    type,
    teamId,
    body: JSON.stringify({ status, chatId, socketId }),
  });

// returns messagesInsideThread
export const getThreadMessagesApiMethod = ({
  chatId,
  messageId,
  teamId,
}: {
  chatId: string;
  messageId: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/messages/messages-inside-thread`, {
    type,
    teamId,
    method: 'GET',
    qs: { chatId, messageId },
  });
