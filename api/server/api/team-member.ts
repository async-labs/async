import * as express from 'express';

import { signRequestForUpload, deleteFiles } from '../aws-s3';

import Discussion from '../models/Discussion';
import Comment from '../models/Comment';

import Chat from '../models/Chat';
import Message from '../models/Message';

import User from '../models/User';

import {
  discussionAdded,
  discussionArchived,
  discussionDeleted,
  discussionEdited,
  commentAdded,
  commentEdited,
  commentDeleted,
  fileAddedInsideComment,
  fileDeletedInsideComment,
  unreadCommentAdded,
  unreadCommentDeleted,
  chatAdded,
  chatEdited,
  chatDeleted,
  messageAdded,
  messageEdited,
  messageDeleted,
  fileAddedInsideMessage,
  fileDeletedInsideMessage,
  unreadMessageAdded,
  unreadMessageDeleted,
  onlineStatus,
  typingStatus,
  chatHistoryCleared,
  unreadBySomeoneMessagesWereSeen,
} from '../sockets';

import logger from '../logs';

const router = express.Router();

// edit middleware
router.use(async (req: any, res, next) => {
  if (!req.user) {
    res.status(201).json({ error: 'You are logged out. Please log in or register or sign up.' });
    return;
  }

  const user = await User.findById(req.user.id).setOptions({ lean: true });

  if (!user) {
    res.status(201).json({ error: 'Unauthorized: Team Member 1' });
    return;
  }

  let teamId;
  let teamLeader;
  let team;

  if (req.get('x-async-t') === 'null' || req.get('x-async-t') === null) {
    teamId = null;
  } else {
    teamId = req.get('x-async-t');
  }

  if (teamId && teamId !== 'new-team') {
    teamLeader = await User.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    team =
      teamLeader &&
      teamLeader.teamsForTeamLeader.find((team) => {
        return team.teamId === teamId;
      });

    if (!teamLeader) {
      res.status(401).json({ error: 'Unauthorized: Team Member 2' });
      return;
    }

    // Team Leader: (false && true) => (false)
    // Team Member: (true && false) => (false)
    // some user: (true && true) => (true)

    if (teamLeader._id.toString() !== req.user.id && !team.idsOfTeamMembers.includes(req.user.id)) {
      res.status(401).json({ error: 'Unauthorized: Team Member 3' });
      return;
    }
  }

  req.teamLeader = teamLeader;
  req.team = team;

  next();
});

router.get('/user/get-team-members', async (req: any, res, next) => {
  try {
    const users = await User.find({
      _id: { $in: req.team.idsOfTeamMembers },
    }).setOptions({ lean: true });

    const { teamId } = req.team;

    const teamLeader = await User.findOne({
      'teamsForTeamLeader.teamId': teamId,
    }).setOptions({
      lean: true,
    });

    const teamFromTeamLeader = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    // test
    for (const user of users) {
      const teamForTeamMember = user.teamsForTeamMember.find((team) => {
        return team.teamId === teamId;
      });

      delete user.teamsForTeamLeader;
      delete user.teamsForTeamMember;

      (user as any).teamForTeamMember = teamForTeamMember;
    }

    delete teamLeader.teamsForTeamLeader;
    delete teamLeader.teamsForTeamMember;
    (teamLeader as any).teamForTeamMember = teamFromTeamLeader;

    users.unshift(teamLeader);

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

async function loadDiscussionsData({
  teamId,
  userId,
  discussionId,
}: {
  teamId: string;
  userId: string;
  discussionId: string;
}) {
  const discussions = (await Discussion.getActiveList({ userId, teamId })).concat(
    await Discussion.getArchivedList({ userId, teamId }),
  );

  const selectedDiscussion = discussionId
    ? discussions && discussions.find((d) => d._id.toString() === discussionId)
    : discussions[0];

  return {
    initialDiscussions: discussions,
    selectedDiscussionId: discussionId,
    isSelectedDiscussionArchived: selectedDiscussion
      ? selectedDiscussion.isDiscussionArchived
      : false,
  };
}

async function loadChatsData({
  teamId,
  userId,
  chatId,
}: {
  teamId: string;
  userId: string;
  chatId: string;
}) {
  const chats = await Chat.getChatList({ userId, teamId });

  return {
    initialChats: chats,
    selectedChatId: chatId,
  };
}

async function loadTeamData(teamId: string, req: any) {
  const data: any = {};

  if (req && req.body) {
    Object.assign(
      data,
      await loadDiscussionsData({
        teamId,
        userId: req.user.id,
        discussionId: req.body.discussionId,
      }),
    );

    Object.assign(
      data,
      await loadChatsData({
        teamId,
        userId: req.user.id,
        chatId: req.body.chatId,
      }),
    );
  }

  return data;
}

router.post('/user/get-initial-data', async (req: any, res, next) => {
  const selectedTeamId = (req.team && req.team.teamId) || null;

  logger.debug(`/user/get-initial-data: `, selectedTeamId);

  const sortedTeamsForTeamLeader = req.user.teamsForTeamLeader.sort((team1, team2) => {
    return team1.createdAt.getTime() - team2.createdAt.getTime();
  });

  // re-define
  const sortedTeamsForTeamMember = req.user.teamsForTeamMember.sort((team1, team2) => {
    return team1.joinedAt.getTime() - team2.joinedAt.getTime(); // test
  });

  // test
  const filteredAndSortedTeamsForTeamMember = sortedTeamsForTeamMember.filter(
    (team) => team.status !== 'removed',
  );

  const initialTeams = sortedTeamsForTeamLeader.concat(filteredAndSortedTeamsForTeamMember);

  try {
    // put `defaultTeamId` team on top of array
    // done, test
    initialTeams.unshift(
      initialTeams.splice(
        initialTeams.findIndex((team) => team.teamId === req.user.defaultTeamId),
        1,
      )[0],
    );

    for (const teamItem of initialTeams) {
      // test
      const teamLeader = await User.findOne({
        'teamsForTeamLeader.teamId': teamItem.teamId,
      }).setOptions({
        lean: true,
      });

      const teamFromTeamLeader: any = teamLeader.teamsForTeamLeader.find((team) => {
        return team.teamId === teamItem.teamId;
      });

      const initialMembers = await User.find({
        _id: { $in: teamFromTeamLeader.idsOfTeamMembers },
      }).setOptions({ lean: true });

      for (const member of initialMembers) {
        const teamForTeamMember = member.teamsForTeamMember.find((team) => {
          return team.teamId === teamItem.teamId;
        });

        if (member) {
          delete member.teamsForTeamLeader;
          delete member.teamsForTeamMember;
        }

        (teamForTeamMember as any).removedTeamMembers = teamFromTeamLeader.removedTeamMember;

        (member as any).teamForTeamMember = teamForTeamMember;
      }

      delete teamLeader.teamsForTeamLeader;
      delete teamLeader.teamsForTeamMember;

      teamFromTeamLeader.trialPeriodStartDate = teamLeader.trialPeriodStartDate;
      teamFromTeamLeader.isSubscriptionActiveForTeam = teamLeader.isSubscriptionActiveForAccount;
      teamFromTeamLeader.isPaymentFailedForTeam = teamLeader.isPaymentFailedForAccount;
      (teamLeader as any).teamForTeamMember = teamFromTeamLeader;

      initialMembers.unshift(teamLeader);
      teamItem.initialMembers = initialMembers;

      if (teamLeader._id.toString() === req.user.id) {
        teamItem.trialPeriodStartDate = teamLeader.trialPeriodStartDate;
        teamItem.isSubscriptionActiveForTeam = teamLeader.isSubscriptionActiveForAccount;
        teamItem.isPaymentFailedForTeam = teamLeader.isPaymentFailedForAccount;
      }
    }

    let data;

    if (selectedTeamId) {
      data = await loadTeamData(selectedTeamId, req);
    } else {
      data = {};
    }

    res.json({
      initialTeams,
      selectedTeamId: selectedTeamId || req.user.defaultTeamId || null,
      ...data,
    });
  } catch (err) {
    next(err);
  }
});

// signed request for upload
// browser uses this signed request to directly send file to S3 bucket
router.post('/aws/s3/get-signed-request-for-put-to-s3', async (req: any, res, next) => {
  try {
    const { fileName, fileType, discussionId, commentId, chatId, messageId, socketId } = req.body;

    const returnedDataFromS3: any = await signRequestForUpload({
      fileName,
      fileType,
      teamId: req.team.teamId,
      userId: req.user.id,
      discussionId,
      commentId,
      chatId,
      messageId,
    });

    let addedFile;

    if (!chatId && !messageId && discussionId && commentId) {
      if (discussionId !== 'new-discussion' && commentId !== 'new-comment') {
        addedFile = await Comment.addFile({
          userId: req.user.id,
          commentId,
          fileName: fileName,
          fileUrl: returnedDataFromS3.url,
        });

        fileAddedInsideComment({ socketId, discussionId, commentId, addedFile });
      } else if (discussionId === 'new-discussion' || commentId === 'new-comment') {
        addedFile = { fileName, fileUrl: returnedDataFromS3.url, addedAt: new Date() };
      }
    } else {
      if (chatId && chatId !== 'new-chat' && messageId && messageId !== 'new-message') {
        addedFile = await Message.addFile({
          userId: req.user.id,
          messageId,
          fileName: fileName,
          fileUrl: returnedDataFromS3.url,
        });

        fileAddedInsideMessage({ socketId, chatId, messageId, addedFile });
      } else if (chatId && messageId && (chatId === 'new-chat' || messageId === 'new-message')) {
        addedFile = { fileName, fileUrl: returnedDataFromS3.url, addedAt: new Date() };
      }
    }

    res.json({ returnedDataFromS3, addedFile });
  } catch (err) {
    next(err);
  }
});

// signed request for getting file
// user on browser clicks "open file in a new tab with signed request"
// `authenticated-read` acl: https://docs.aws.amazon.com/AmazonS3/latest/dev-retired/acl-overview.html
// router.post('/aws/s3/get-signed-request-for-get-from-s3', async (req: any, res, next) => {
//   try {
//     const { keyForFile } = req.body;

//     const returnedDataFromS3 = await signRequestForGet({
//       userId: req.user.id,
//       keyForFile,
//     });

//     res.json(returnedDataFromS3);
//   } catch (err) {
//     next(err);
//   }
// });

// User-related
router.post('/user/create-or-update-user-profile', async (req: any, res, next) => {
  try {
    const { email, userName, userAvatarUrl } = req.body;

    await User.updateUserProfile({
      email,
      userName,
      userAvatarUrl,
    });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/user/make-team-default', async (req: any, res, next) => {
  try {
    const { defaultTeamId } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      defaultTeamId,
    });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/user/toggle-theme', async (req: any, res, next) => {
  try {
    const { showDarkTheme } = req.body;

    await User.toggleTheme({ userId: req.user.id, showDarkTheme });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

// makePageDefault

// Discussion
router.get('/discussions/list-active', async (req: any, res, next) => {
  try {
    const discussions = await Discussion.getActiveList({
      userId: req.user.id,
      teamId: req.team.teamId,
    });

    res.json({ discussions });
  } catch (err) {
    next(err);
  }
});

router.get('/discussions/list-archived', async (req: any, res, next) => {
  try {
    const discussions = await Discussion.getArchivedList({
      userId: req.user.id,
      teamId: req.team.teamId,
    });

    res.json({ discussions });
  } catch (err) {
    next(err);
  }
});

router.post('/discussions/create-or-update', async (req: any, res, next) => {
  try {
    const { discussionName, discussionMemberIds = [], socketId, id, content, files } = req.body;

    const { newOrUpdatedDiscussion, initialComments } = await Discussion.createOrUpdate({
      userId: req.user.id,
      teamId: req.team.teamId,
      discussionName,
      discussionMemberIds,
      id,
      content,
      files,
    });

    if (id) {
      discussionEdited({ socketId, discussion: newOrUpdatedDiscussion, initialComments });
    } else {
      discussionAdded({ socketId, discussion: newOrUpdatedDiscussion, initialComments });
      unreadCommentAdded({
        socketId,
        userIdsToNotify: newOrUpdatedDiscussion.discussionMemberIds.filter(
          (id) => id !== req.user.id,
        ),
        commentId: newOrUpdatedDiscussion.firstCommentId,
        discussionId: newOrUpdatedDiscussion._id.toString(),
        comment: initialComments[0],
      });
    }

    res.json({ discussion: newOrUpdatedDiscussion, initialComments });
  } catch (err) {
    next(err);
  }
});

router.post('/discussions/delete', async (req: any, res, next) => {
  try {
    const { discussionId, socketId, whichList } = req.body;

    const { teamId } = await Discussion.delete({ userId: req.user.id, discussionId });

    discussionDeleted({ socketId, teamId, discussionId, whichList });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/discussions/archive-unarchive', async (req: any, res, next) => {
  try {
    const { discussionId, socketId, action } = req.body;

    const { teamId } = await Discussion.archive({ userId: req.user.id, discussionId, action });

    discussionArchived({ socketId, teamId, discussionId, action });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.get('/discussions/search-discussions-by-content', async (req: any, res, next) => {
  try {
    const { whichList, query } = req.query;

    const discussions = await Discussion.searchByContent({
      userId: req.user.id,
      teamId: req.team.teamId,
      whichList,
      query,
    });

    res.json({ discussions });
  } catch (err) {
    next(err);
  }
});

router.post('/discussions/pin', async (req: any, res, next) => {
  try {
    const { discussionId } = req.body;

    await User.pinDiscussion({ userId: req.user.id, discussionId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/discussions/unpin', async (req: any, res, next) => {
  try {
    const { discussionId } = req.body;

    await User.unpinDiscussion({ userId: req.user.id, discussionId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

// Comment

router.post('/comments/read-comment', async (req: any, res, next) => {
  try {
    const { commentId } = req.body;

    await User.readComment({ userId: req.user.id, commentId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/comments/unread-comment', async (req: any, res, next) => {
  try {
    const { commentId } = req.body;

    await User.unreadComment({ userId: req.user.id, commentId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.get('/comments/list', async (req: any, res, next) => {
  const { discussionId } = req.query;

  try {
    const comments = await Comment.getList({ userId: req.user.id, discussionId });

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

router.post('/comments/add-or-edit', async (req: any, res, next) => {
  try {
    const { content, discussionId, id, socketId, files } = req.body;

    const { comment, userIdsToNotify } = await Comment.addOrEdit({
      userId: req.user.id,
      teamId: req.team.teamId,
      content,
      discussionId,
      id,
      files,
    });

    if (!id) {
      commentAdded({ socketId, comment });
      unreadCommentAdded({
        socketId,
        userIdsToNotify,
        commentId: comment._id.toString(),
        discussionId,
        comment,
      });
    } else {
      commentEdited({ socketId, comment });
    }

    res.json({ comment });
  } catch (err) {
    next(err);
  }
});

router.post('/comments/delete', async (req: any, res, next) => {
  try {
    const { id, discussionId, socketId } = req.body;

    const { userIdsToNotify } = await Comment.delete({
      userId: req.user.id,
      id,
      isDiscussionBeingDeleted: false,
    });

    commentDeleted({ socketId, discussionId, commentId: id });
    unreadCommentDeleted({ socketId, userIdsToNotify, commentId: id, discussionId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/comments/delete-file', async (req: any, res, next) => {
  try {
    const { commentId, fileUrl, discussionId, socketId } = req.body;

    await Comment.deleteFile({ userId: req.user.id, commentId, fileUrl });

    fileDeletedInsideComment({ socketId, commentId, discussionId, fileUrl });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/comments/delete-file-no-comment', async (req: any, res, next) => {
  try {
    const { fileUrl } = req.body;

    if (fileUrl.includes('/comment-new-comment/')) {
      const filesToDeleteFromS3 = [fileUrl];

      deleteFiles(filesToDeleteFromS3).catch((err) => console.log(err));

      res.json({ done: 1 });
    } else {
      // logger.info('Unauthorized');
      res.status(201).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    next(err);
  }
});

// Chats

router.get('/chats/list', async (req: any, res, next) => {
  try {
    const chats = await Chat.getChatList({
      userId: req.user.id,
      teamId: req.team.teamId,
    });

    res.json({ chats });
  } catch (err) {
    next(err);
  }
});

router.post('/chats/create-or-update', async (req: any, res, next) => {
  try {
    const { chatParticipantIds = [], socketId, id, content } = req.body;

    const { newOrUpdatedChat, initialMessages } = await Chat.createOrUpdate({
      userId: req.user.id,
      teamId: req.team.teamId,
      chatParticipantIds,
      id,
      content,
    });

    if (newOrUpdatedChat) {
      if (id) {
        chatEdited({ socketId, chat: newOrUpdatedChat, initialMessages });
      } else {
        chatAdded({ socketId, chat: newOrUpdatedChat, initialMessages });
      }

      logger.debug('initialMessages', initialMessages);

      res.json({ chat: newOrUpdatedChat, initialMessages });
    } else {
      res.json({ chat: null, initialMessages: [] });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/chats/delete', async (req: any, res, next) => {
  try {
    const { chatId, socketId } = req.body;

    const { teamId } = await Chat.delete({ userId: req.user.id, chatId });

    chatDeleted({ socketId, teamId, chatId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/chats/clear-history', async (req: any, res, next) => {
  try {
    const { chatId, socketId } = req.body;

    const { teamId } = await Chat.clearHistory({ userId: req.user.id, chatId });

    chatHistoryCleared({ socketId, teamId, chatId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.get('/chats/search-within-chat', async (req: any, res, next) => {
  try {
    const { chatId, query } = req.query;

    const { foundMessages, contextMessages } = await Chat.searchWithinChat({
      userId: req.user.id,
      teamId: req.team.teamId,
      chatId,
      query,
    });

    res.json({ foundMessages, contextMessages: contextMessages.reverse() });
  } catch (err) {
    next(err);
  }
});

router.post('/chats/pin', async (req: any, res, next) => {
  try {
    const { chatId } = req.body;

    await User.pinChat({ userId: req.user.id, chatId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/chats/unpin', async (req: any, res, next) => {
  try {
    const { chatId } = req.body;

    await User.unpinChat({ userId: req.user.id, chatId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

// Messages

router.post('/messages/messages-were-seen', async (req: any, res, next) => {
  try {
    const { messageIds, socketId, chatId } = req.body;

    const affectedUserIdsAndMessageIds = await User.messagesWereSeen({
      userId: req.user.id,
      messageIds,
    });

    unreadBySomeoneMessagesWereSeen({
      socketId,
      affectedUserIdsAndMessageIds,
      chatId,
    });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.get('/messages/list', async (req: any, res, next) => {
  const { chatId, batchNumberForMessages } = req.query;

  try {
    const messages = await Message.getList({
      userId: req.user.id,
      chatId,
      batchNumberForMessages,
      limit: 25,
    });

    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/add-or-edit', async (req: any, res, next) => {
  try {
    const { content, chatId, id, socketId, files, parentMessageId } = req.body;

    const { message, userIdsToNotify } = await Message.addOrEdit({
      userId: req.user.id,
      teamId: req.team.teamId,
      content,
      chatId,
      id,
      files,
      parentMessageId,
    });

    if (!id) {
      messageAdded({ socketId, message });
      unreadMessageAdded({
        socketId,
        userIdsToNotify,
        messageId: message._id.toString(),
        parentMessageId,
        chatId,
        message,
      });
    } else {
      messageEdited({ socketId, message });
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/delete', async (req: any, res, next) => {
  try {
    const { id, chatId, socketId } = req.body;

    const { userIdsToNotify, parentMessageId } = await Message.delete({ userId: req.user.id, id });

    messageDeleted({ socketId, chatId, messageId: id, parentMessageId });
    unreadMessageDeleted({ socketId, userIdsToNotify, messageId: id, parentMessageId, chatId });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/delete-file', async (req: any, res, next) => {
  try {
    const { chatId, messageId, fileUrl, socketId } = req.body;

    await Message.deleteFile({ userId: req.user.id, messageId, fileUrl });

    fileDeletedInsideMessage({ socketId, chatId, messageId, fileUrl });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/delete-file-no-message', async (req: any, res, next) => {
  try {
    const { fileUrl } = req.body;

    if (fileUrl.includes('/comment-new-message/')) {
      const filesToDeleteFromS3 = [fileUrl];

      deleteFiles(filesToDeleteFromS3).catch((err) => console.log(err));

      res.json({ done: 1 });
    } else {
      // logger.info('Unauthorized');
      res.status(201).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/user/change-online-status', async (req: any, res, next) => {
  try {
    const { status, socketId, teamId } = req.body;

    await User.changeOnlineStatusForTeam({ userId: req.user.id, status, teamId });

    onlineStatus({
      socketId,
      status,
      teamId,
      userId: req.user.id,
    });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/user/update-typing-status', async (req: any, res, next) => {
  try {
    const { status, chatId, socketId } = req.body;

    typingStatus({ socketId, status, chatId, userId: req.user.id });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.get('/messages/messages-inside-thread', async (req: any, res, next) => {
  const { chatId, messageId } = req.query;

  try {
    const messages = await Message.getListForThread({
      userId: req.user.id,
      chatId,
      messageId,
    });

    res.json({ messagesInsideThread: messages });
  } catch (err) {
    next(err);
  }
});

export default router;
