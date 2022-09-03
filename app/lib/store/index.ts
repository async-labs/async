// import isMatch from 'lodash/isMatch';
import { action, configure, makeObservable, observable, runInAction } from 'mobx';

import { io } from 'socket.io-client';

import { Discussion } from './Discussion';
import { Chat } from './Chat';
import { Comment } from './Comment';
import { Message } from './Message';
import { Team } from './Team';
import { User } from './User';

const dev = process.env.NODE_ENV !== 'production';
configure({ enforceActions: 'observed' });

class Store {
  public socket: any;
  public isServer: boolean;

  public currentUser?: User = null;
  public isLoggingIn = true;

  constructor({
    initialState = {},
    socket = null,
    isServer,
  }: {
    initialState?: any;
    socket?: any;
    isServer: boolean;
  }) {
    makeObservable<Store, 'setCurrentUserStoreMethod'>(this, {
      currentUser: observable,
      isLoggingIn: observable,

      setCurrentUserStoreMethod: action,
      handleUnreadCommentRealtimeEvent: action,
    });

    this.socket = socket;
    this.isServer = !!isServer;

    // sets User
    // within User, sets projects, currentProject, discussions, chats, unreadCommentIds, unreadByUserMessageIds
    this.setCurrentUserStoreMethod(initialState.user, initialState);

    if (socket) {
      socket.on('unreadCommentEvent', this.handleUnreadCommentRealtimeEvent);
      socket.on('unreadByUserMessageEvent', this.handleUnreadByUserMessageRealtimeEvent);
      socket.on('unreadBySomeoneMessageEvent', this.handleUnreadBySomeoneMessageRealtimeEvent);

      socket.on('disconnect', () => {
        // console.log('socket: ## disconnected');
      });

      socket.on('connect', () => {
        // console.log('socket: connected!');
      });

      socket.on('error', (err) => {
        console.log(err); // not authorized
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('socket: $$ reconnected', attemptNumber);
        this.setCurrentUserStoreMethod(initialState.user, initialState);
      });
    }
  }

  private async setCurrentUserStoreMethod(user, initialState) {
    const {
      initialTeams,
      selectedTeamId,
      initialMembersForSelectedTeam,
      initialDiscussions,
      selectedDiscussionId,
      initialChats,
      selectedChatId,
    } = initialState;

    if (user) {
      this.currentUser = new User({
        store: this,
        isLoggedIn: true,
        ...user,
        initialTeams,
        selectedTeamId,
        initialMembersForSelectedTeam,
        initialDiscussions,
        selectedDiscussionId,
        initialChats,
        selectedChatId,
      });

      if (this.socket && this.socket.disconnected) {
        this.socket.connect();
      }
    } else {
      this.currentUser = null;
      if (this.socket && this.socket.connected) {
        this.socket.disconnect();
      }
    }

    runInAction(() => {
      this.isLoggingIn = false;
    });
  }

  public handleUnreadCommentRealtimeEvent = (data) => {
    const { actionType, commentId, userId, discussionId, comment } = data;

    const discussionInQuestion = this.currentUser.activeDiscussionsForUser.find(
      (d) => d.discussionId === discussionId,
    );

    if (!this.currentUser) {
      return;
    }

    if (actionType === 'added') {
      if (userId !== this.currentUser._id) {
        return;
      }

      const commentObj = new Comment({ discussion: discussionInQuestion, store: this, ...comment });

      discussionInQuestion.comments.push(commentObj);

      if (!this.currentUser.unreadCommentIds.includes(commentId)) {
        this.currentUser.unreadCommentIds.push(commentId);
      }
    } else if (actionType === 'deleted') {
      if (userId !== this.currentUser._id) {
        return;
      }

      const commentInQuestion = discussionInQuestion.comments.find(
        (c) => c.commentId === commentId,
      );
      discussionInQuestion.comments.remove(commentInQuestion);

      if (this.currentUser.unreadCommentIds.includes(commentId)) {
        this.currentUser.unreadCommentIds.remove(commentId);
      }
    }
  };

  // done: added parentMessageId logic
  public handleUnreadByUserMessageRealtimeEvent = (data) => {
    const { actionType, messageId, userId, parentMessageId, chatId } = data;

    // const chatInQuestion = this.currentUser.chatsForUser.find((c) => c.chatId === chatId);
    // const messageObj = new Message({ chat: chatInQuestion, store: this, ...message });

    if (!this.currentUser) {
      return;
    }

    // if parentMessageId is truthy then message is threadMessage
    runInAction(() => {
      if (actionType === 'added') {
        if (userId !== this.currentUser._id) {
          return;
        }

        // if (parentMessageId) {
        //   const parentMessage = chatInQuestion.messages.find(
        //     (m) => m.messageId === parentMessageId,
        //   );

        //   parentMessage.messagesInsideThread.push(messageObj);

        //   parentMessage.countOfThreadMessages = parentMessage.countOfThreadMessages + 1;
        // } else {
        //   chatInQuestion.messages.push(messageObj);
        // }

        if (parentMessageId) {
          if (!this.currentUser.unreadByUserMessageIds.includes(messageId)) {
            this.currentUser.unreadByUserMessageIds.push(messageId);
          }
          if (!this.currentUser.unreadByUserMessageIds.includes(parentMessageId)) {
            this.currentUser.unreadByUserMessageIds.push(parentMessageId);
          }
        } else {
          if (!this.currentUser.unreadByUserMessageIds.includes(messageId)) {
            this.currentUser.unreadByUserMessageIds.push(messageId);
          }
        }
      } else if (actionType === 'deleted') {
        if (userId !== this.currentUser._id) {
          return;
        }

        // if (parentMessageId) {
        //   const parentMessage = chatInQuestion.messages.find(
        //     (m) => m.messageId === parentMessageId,
        //   );
        //   const messageRemovedViaWebsocket = parentMessage.messagesInsideThread.find(
        //     (m) => m.messageId === messageId,
        //   );
        //   parentMessage.messagesInsideThread.remove(messageRemovedViaWebsocket);

        //   parentMessage.countOfThreadMessages = parentMessage.countOfThreadMessages - 1;
        // } else {
        //   const message = chatInQuestion.messages.find((m) => m.messageId === messageId);
        //   chatInQuestion.messages.remove(message);
        // }

        if (parentMessageId) {
          if (this.currentUser.unreadByUserMessageIds.includes(messageId)) {
            this.currentUser.unreadByUserMessageIds.remove(messageId);
          }

          const chat = this.currentUser.chatsForUser.find((c) => c.chatId === chatId);

          const parentMessage = chat.messages.find((m) => m.messageId === parentMessageId);

          const unreadMessagesLevelTwo = parentMessage.messagesInsideThread.filter((mit) =>
            this.currentUser.unreadByUserMessageIds.includes(mit.messageId),
          );

          if (unreadMessagesLevelTwo.length === 0) {
            if (this.currentUser.unreadByUserMessageIds.includes(parentMessageId)) {
              this.currentUser.unreadByUserMessageIds.remove(parentMessageId);
            }
          }
        } else {
          if (this.currentUser.unreadByUserMessageIds.includes(messageId)) {
            this.currentUser.unreadByUserMessageIds.remove(messageId);
          }
        }
      }
    });
  };

  public handleUnreadBySomeoneMessageRealtimeEvent = (data) => {
    // console.log('unread message realtime event', data);

    const { actionType, messageId, userId } = data;

    // const chatInQuestion = this.currentUser.chatsForUser.find((c) => c.chatId === chatId);

    if (!this.currentUser) {
      return;
    }

    // if parentMessageId is truthy then message is threadMessage
    runInAction(() => {
      if (actionType === 'seen') {
        if (userId === this.currentUser._id) {
          if (this.currentUser.unreadBySomeoneMessageIds.includes(messageId)) {
            this.currentUser.unreadBySomeoneMessageIds.remove(messageId);
          }
        }
      }
    });
  };
}

let store: Store = null;

function initializeStore(initialState) {
  const isServer = typeof window === 'undefined';

  const socket = isServer
    ? null
    : io(
        dev
          ? process.env.NEXT_PUBLIC_API_SERVER_ENDPOINT
          : process.env.NEXT_PUBLIC_PRODUCTION_API_SERVER_ENDPOINT,
        {
          reconnection: true,
          autoConnect: true,
          transports: ['polling', 'websocket'],
          withCredentials: true,
        },
      );

  const _store =
    store !== null && store !== undefined ? store : new Store({ initialState, isServer, socket });

  // For SSG and SSR always create a new store
  if (typeof window === 'undefined') {
    return _store;
  }
  // Create the store once in the client
  if (!store) {
    store = _store;
  }

  return _store;
}

function getStore() {
  return store;
}

export { Discussion, Chat, Comment, Message, User, Store, Team, initializeStore, getStore };
