import { Response } from 'express';
import * as express from 'express';
import { Server } from 'socket.io';
import * as httpModule from 'http';

import logger from './logs';

import { IDiscussionDocument } from './models/Discussion';
import { ICommentDocument } from './models/Comment';

import { IChatDocument } from './models/Chat';
import { IMessageDocument } from './models/Message';

import User from './models/User';

const dev = process.env.NODE_ENV !== 'production';

let io: Server = null;

function setupSockets({
  httpServer,
  origin,
  sessionMiddleware,
}: {
  httpServer: httpModule.Server;
  origin: string | boolean | RegExp | (string | RegExp)[];
  sessionMiddleware: express.RequestHandler;
}) {
  if (io === null) {
    io = new Server(httpServer, {
      cors: {
        origin,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
      },
      cookie: {
        name: 'async-socket-cookie',
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000, // expires in 14 days
        domain: dev ? 'localhost' : '.async-await.com',
        secure: dev ? false : true,
      },
      serveClient: false,
      transports: ['polling', 'websocket'],
    });

    const wrap = (middleware) => (socket, next) => middleware(socket.request, {} as Response, next);

    io.use(wrap(sessionMiddleware));

    io.on('connection', (socket: any) => {
      if (
        !socket.request.session ||
        ((!socket.request.session.passport || !socket.request.session.passport.user) &&
          !socket.request.session.passwordless)
      ) {
        socket.disconnect(true);
        return;
      }

      const userId = socket.request.session.passwordless;

      socket.join(`user-${userId}`);

      logger.debug(`connected, id: ${userId}`);

      // TODO: check permissions when enter room

      let globalTeamId;

      socket.on('joinTeamRoom', async (teamId) => {
        logger.debug(`joinTeamRoom ${teamId}, ${userId}`);
        globalTeamId = teamId;
        socket.join(`team-${teamId}`);
      });

      socket.on('leaveTeamRoom', async (teamId) => {
        logger.debug(`** leaveTeamRoom ${teamId}, ${userId}`);
        socket.leave(`team-${teamId}`);
      });

      socket.on('joinDiscussionRoom', (discussionId) => {
        logger.debug(`joinDiscussionRoom ${discussionId}`);
        socket.join(`discussion-${discussionId}`);
      });

      socket.on('leaveDiscussionRoom', (discussionId) => {
        logger.debug(`** leaveDiscussionRoom ${discussionId}`);
        socket.leave(`discussion-${discussionId}`);
      });

      socket.on('joinChatRoom', (chatId) => {
        logger.debug(`joinChatRoom ${chatId}`);
        socket.join(`chat-${chatId}`);
      });

      socket.on('leaveChatRoom', (chatId) => {
        logger.debug(`** leaveChatRoom ${chatId}`);
        socket.leave(`chat-${chatId}`);
      });

      socket.on('disconnect', async () => {
        if (globalTeamId) {
          await User.changeOnlineStatusForTeam({ userId, status: false, teamId: globalTeamId });

          onlineStatus({
            socketId: socket.id,
            status: false,
            teamId: globalTeamId,
            userId,
          });
        }

        logger.debug(`disconnected, id: ${userId}`);
      });
    });
  }
}

function getSocket(socketId?: string) {
  if (!io) {
    return null;
  }

  if (socketId && io.sockets.sockets.get(socketId)) {
    // if client connected to socket broadcast to other connected sockets
    return io.sockets.sockets.get(socketId).broadcast;
  } else {
    // if client NOT connected to socket sent to all sockets
    return io;
  }
}

function discussionAdded({
  socketId,
  discussion,
  initialComments,
}: {
  socketId?: string;
  discussion: IDiscussionDocument;
  initialComments: ICommentDocument[];
}) {
  const roomName = `team-${discussion.teamId}`;

  const socket = getSocket(socketId);

  if (socket) {
    socket
      .to(roomName)
      .emit('discussionEvent', { actionType: 'added', discussion, initialComments });
  }
}

function discussionEdited({
  socketId,
  discussion,
  initialComments,
}: {
  socketId?: string;
  discussion: IDiscussionDocument;
  initialComments: ICommentDocument[];
}) {
  const roomName = `team-${discussion.teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('discussionEvent', {
      actionType: 'edited',
      discussion,
      initialComments,
    });
  }
}

function discussionDeleted({
  socketId,
  teamId,
  discussionId,
  whichList,
}: {
  socketId?: string;
  teamId: string;
  discussionId: string;
  whichList: string;
}) {
  const roomName = `team-${teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket
      .to(roomName)
      .emit('discussionEvent', { actionType: 'deleted', discussionId, teamId, whichList });
  }
}

function discussionArchived({
  socketId,
  teamId,
  discussionId,
  action,
}: {
  socketId?: string;
  teamId: string;
  discussionId: string;
  action: string;
}) {
  const roomName = `team-${teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket
      .to(roomName)
      .emit('discussionEvent', { actionType: 'archived', discussionId, teamId, action });
  }
}

function commentAdded({ socketId, comment }: { socketId?: string; comment: ICommentDocument }) {
  const roomName = `discussion-${comment.discussionId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket.to(roomName).emit('commentEvent', { actionType: 'added', comment });
  }
}

function commentEdited({ socketId, comment }: { socketId?: string; comment: ICommentDocument }) {
  const roomName = `discussion-${comment.discussionId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket.to(roomName).emit('commentEvent', { actionType: 'edited', comment });
  }
}

function commentDeleted({
  socketId,
  commentId,
  discussionId,
}: {
  socketId?: string;
  commentId: string;
  discussionId: string;
}) {
  const roomName = `discussion-${discussionId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket.to(roomName).emit('commentEvent', { actionType: 'deleted', commentId });
  }
}

function fileAddedInsideComment({
  socketId,
  commentId,
  discussionId,
  addedFile,
}: {
  socketId?: string;
  commentId: string;
  discussionId: string;
  addedFile: any;
}) {
  const roomName = `discussion-${discussionId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket
      .to(roomName)
      .emit('commentEvent', { actionType: 'addedFileInsideComment', commentId, addedFile });
  }
}

function fileDeletedInsideComment({
  socketId,
  commentId,
  discussionId,
  fileUrl,
}: {
  socketId?: string;
  commentId: string;
  discussionId: string;
  fileUrl: string;
}) {
  const roomName = `discussion-${discussionId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket
      .to(roomName)
      .emit('commentEvent', { actionType: 'deletedFileInsideComment', commentId, fileUrl });
  }
}

function unreadCommentAdded({
  socketId,
  userIdsToNotify,
  commentId,
  discussionId,
  comment,
}: {
  socketId?: string;
  userIdsToNotify: string[];
  commentId: string;
  discussionId: string;
  comment: ICommentDocument;
}) {
  const socket = getSocket(socketId);
  if (socket) {
    userIdsToNotify.forEach((userId) => {
      const roomName = `user-${userId}`;
      socket.to(roomName).emit('unreadCommentEvent', {
        actionType: 'added',
        commentId,
        userId,
        discussionId,
        comment,
      });
    });
  }
}

function unreadCommentDeleted({
  socketId,
  userIdsToNotify,
  commentId,
  discussionId,
}: {
  socketId?: string;
  userIdsToNotify: string[];
  commentId: string;
  discussionId: string;
}) {
  const socket = getSocket(socketId);
  if (socket) {
    userIdsToNotify.forEach((userId) => {
      const roomName = `user-${userId}`;
      socket
        .to(roomName)
        .emit('unreadCommentEvent', { actionType: 'deleted', commentId, userId, discussionId });
    });
  }
}

// ---

function chatAdded({
  socketId,
  chat,
  initialMessages,
}: {
  socketId?: string;
  chat: IChatDocument;
  initialMessages: IMessageDocument[];
}) {
  const roomName = `team-${chat.teamId}`;

  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('chatEvent', { actionType: 'added', chat, initialMessages });
  }
}

function chatEdited({
  socketId,
  chat,
  initialMessages,
}: {
  socketId?: string;
  chat: IChatDocument;
  initialMessages: IMessageDocument[];
}) {
  const roomName = `team-${chat.teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('chatEvent', {
      actionType: 'edited',
      chat,
      initialMessages,
    });
  }
}

function chatDeleted({
  socketId,
  teamId,
  chatId,
}: {
  socketId?: string;
  teamId: string;
  chatId: string;
}) {
  const roomName = `team-${teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('chatEvent', { actionType: 'deleted', chatId, teamId });
  }
}

function chatHistoryCleared({
  socketId,
  teamId,
  chatId,
}: {
  socketId?: string;
  teamId: string;
  chatId: string;
}) {
  const roomName = `team-${teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('chatEvent', { actionType: 'cleared', chatId, teamId });
  }
}

function messageAdded({ socketId, message }: { socketId?: string; message: IMessageDocument }) {
  const roomName = `chat-${message.chatId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket.to(roomName).emit('messageEvent', { actionType: 'added', message });
  }
}

function messageEdited({ socketId, message }: { socketId?: string; message: IMessageDocument }) {
  const roomName = `chat-${message.chatId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket.to(roomName).emit('messageEvent', { actionType: 'edited', message });
  }
}

function messageDeleted({
  socketId,
  messageId,
  chatId,
  parentMessageId,
}: {
  socketId?: string;
  messageId: string;
  chatId: string;
  parentMessageId: string;
}) {
  const roomName = `chat-${chatId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket.to(roomName).emit('messageEvent', { actionType: 'deleted', messageId, parentMessageId });
  }
}

function fileAddedInsideMessage({
  socketId,
  messageId,
  chatId,
  addedFile,
}: {
  socketId?: string;
  messageId: string;
  chatId: string;
  addedFile: any;
}) {
  const roomName = `chat-${chatId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket
      .to(roomName)
      .emit('messageEvent', { actionType: 'addedFileInsideMessage', messageId, addedFile });
  }
}

function fileDeletedInsideMessage({
  socketId,
  messageId,
  chatId,
  fileUrl,
}: {
  socketId?: string;
  messageId: string;
  chatId: string;
  fileUrl: string;
}) {
  const roomName = `chat-${chatId}`;

  const socket = getSocket(socketId);
  if (socket) {
    socket
      .to(roomName)
      .emit('messageEvent', { actionType: 'deletedFileInsideMessage', messageId, fileUrl });
  }
}

function unreadMessageAdded({
  socketId,
  userIdsToNotify,
  messageId,
  parentMessageId,
  chatId,
  message,
}: {
  socketId?: string;
  userIdsToNotify: string[];
  messageId: string;
  parentMessageId: string;
  chatId: string;
  message: IMessageDocument;
}) {
  const socket = getSocket(socketId);
  if (socket) {
    userIdsToNotify.forEach((userId) => {
      const roomName = `user-${userId}`;
      socket.to(roomName).emit('unreadByUserMessageEvent', {
        actionType: 'added',
        messageId,
        userId,
        parentMessageId,
        chatId,
        message,
      });
    });
  }
}

function unreadMessageDeleted({
  socketId,
  userIdsToNotify,
  messageId,
  parentMessageId,
  chatId,
}: {
  socketId?: string;
  userIdsToNotify: string[];
  messageId: string;
  parentMessageId: string;
  chatId: string;
}) {
  const socket = getSocket(socketId);
  if (socket) {
    userIdsToNotify.forEach((userId) => {
      const roomName = `user-${userId}`;
      socket.to(roomName).emit('unreadByUserMessageEvent', {
        actionType: 'deleted',
        messageId,
        userId,
        parentMessageId,
        chatId,
      });
    });
  }
}

function onlineStatus({
  socketId,
  status,
  teamId,
  userId,
}: {
  socketId?: string;
  status: boolean;
  teamId: string;
  userId: string;
}) {
  const socket = getSocket(socketId);

  const roomName = `team-${teamId}`;

  if (socket) {
    socket.to(roomName).emit('onlineStatusEvent', {
      actionType: 'edited',
      status,
      userId,
      teamId,
    });
  }
}

function typingStatus({
  socketId,
  status,
  chatId,
  userId,
}: {
  socketId?: string;
  status: boolean;
  chatId: string;
  userId: string;
}) {
  const roomName = `chat-${chatId}`;

  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('typingStatus', { actionType: 'edited', status, userId });
  }
}

function teamDeleted({
  socketId,
  teamId,
  userId,
}: {
  socketId?: string;
  teamId: string;
  userId: string;
}) {
  const roomName = `team-${teamId}`;
  const socket = getSocket(socketId);

  if (socket) {
    socket.to(roomName).emit('teamEvent', { actionType: 'deleted', teamId, userId });
  }
}

function unreadBySomeoneMessagesWereSeen({
  socketId,
  affectedUserIdsAndMessageIds,
  chatId,
}: {
  socketId?: string;
  affectedUserIdsAndMessageIds: { userId: string; messageId: string }[];
  chatId: string;
}) {
  const socket = getSocket(socketId);
  if (socket) {
    affectedUserIdsAndMessageIds.forEach((obj) => {
      const roomName = `user-${obj.userId}`;
      socket.to(roomName).emit('unreadBySomeoneMessageEvent', {
        actionType: 'seen',
        chatId,
        messageId: obj.messageId,
        userId: obj.userId,
      });
    });
  }
}

export {
  setupSockets,
  discussionAdded,
  discussionArchived,
  discussionEdited,
  discussionDeleted,
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
  chatHistoryCleared,
  messageAdded,
  messageEdited,
  messageDeleted,
  fileAddedInsideMessage,
  fileDeletedInsideMessage,
  unreadMessageAdded,
  unreadMessageDeleted,
  onlineStatus,
  typingStatus,
  teamDeleted,
  unreadBySomeoneMessagesWereSeen,
};
