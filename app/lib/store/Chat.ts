import { action, computed, makeObservable, IObservableArray, observable, runInAction } from 'mobx';
import NProgress from 'nprogress';

// update import section
import {
  addOrEditMessageApiMethod,
  deleteMessageApiMethod,
  getMessageListApiMethod,
} from '../api/to-api-server-team-member';
import { Message, Store, Team, User } from './index';

class Chat {
  public chatId: string;
  public chatCreatorId: string;

  public chatParticipantIds: IObservableArray<string>;
  public teamId: string;
  public lastUpdatedAt: Date;

  numberOfMessagesPerChat: number;

  public messages: IObservableArray<Message> = observable([]);
  public isLoadingMessages = false;

  public store: Store;
  public team: Team;

  constructor(params) {
    makeObservable<Chat, 'handleChatRealtimeEventStoreMethod'>(this, {
      chatId: observable,
      chatParticipantIds: observable,
      messages: observable,
      isLoadingMessages: observable,
      lastUpdatedAt: observable,

      numberOfMessagesPerChat: observable,

      changeLocalCacheStoreMethod: action,
      setInitialMessagesStoreMethod: action,
      loadMessagesStoreMethod: action,

      handleMessageRealtimeEventStoreMethod: action,
      addMessageToLocalCacheStoreMethod: action,
      editMessageFromLocalCacheStoreMethod: action,
      removeMessageFromLocalCacheStoreMethod: action,
      addFileInsideMessageFromLocalCacheStoreMethod: action,
      removeFileInsideMessageFromLocalCacheStoreMethod: action,

      addOrEditMessageStoreMethod: action,
      deleteMessageStoreMethod: action,

      editChatFromLocalCacheStoreMethod: action,
      leaveChatSocketRoomStoreMethod: action,
      joinChatSocketRoomStoreMethod: action,
      handleChatRealtimeEventStoreMethod: action,

      handleTypingStatusRealtimeEventStoreMethod: action,

      members: computed,
      user: computed,
      isChatUnreadForUser: computed,
      creator: computed,
      typingChatParticipants: computed,
    });

    this.chatCreatorId = params.chatCreatorId;
    this.chatId = params._id;
    this.chatParticipantIds = params.chatParticipantIds;
    this.lastUpdatedAt = params.lastUpdatedAt;
    this.teamId = params.teamId;

    this.numberOfMessagesPerChat = params.numberOfMessagesPerChat;

    this.store = params.store;
    this.team = params.team;

    this.changeLocalCacheStoreMethod(params);

    if (params.initialMessages) {
      this.setInitialMessagesStoreMethod(params.initialMessages);
    }
  }

  // must be public
  public changeLocalCacheStoreMethod(data) {
    if (data.chatParticipantIds) {
      this.chatParticipantIds.replace(data.chatParticipantIds || []);
    }

    if (data.lastUpdatedAt) {
      this.lastUpdatedAt = new Date(data.lastUpdatedAt);
    }
  }

  get user(): User {
    return this.team.teamMembers.get(this.chatCreatorId) || null;
  }

  get members() {
    return this.team.members.filter((member) => this.chatParticipantIds.includes(member._id));
  }

  get typingChatParticipants() {
    return this.members
      .filter((m) => {
        return m._id !== this.store.currentUser._id;
      })
      .filter((m) => {
        return m.isChatParticipantTyping && m.isChatParticipantTyping === true;
      });
  }

  //
  public setInitialMessagesStoreMethod(initialMessages) {
    const messageObjs = initialMessages.map(
      (m) => new Message({ chat: this, store: this.store, team: this.team, ...m }),
    );
    this.messages.replace(messageObjs);
  }

  //
  public async loadMessagesStoreMethod(batchNumberForMessages) {
    if (this.isLoadingMessages || this.store.isServer) {
      return;
    }

    NProgress.start();
    this.isLoadingMessages = true;

    try {
      const { messages = [] } = await getMessageListApiMethod({
        chatId: this.chatId,
        teamId: this.team.teamId,
        batchNumberForMessages,
      });

      runInAction(() => {
        const messageObjs = messages.map(
          (m) => new Message({ chat: this, store: this.store, team: this.team, ...m }),
        );
        if (batchNumberForMessages === 1) {
          this.messages.replace(messageObjs);
        } else if (batchNumberForMessages > 1) {
          const arrayOfMessageStoreObjects = messageObjs.concat(this.messages);
          this.messages.replace(arrayOfMessageStoreObjects);
        }
      });
    } catch (err) {
    } finally {
      runInAction(() => {
        this.isLoadingMessages = false;
        NProgress.done();
      });
    }
  }

  public handleMessageRealtimeEventStoreMethod(data) {
    const { actionType } = data;

    if (actionType === 'added') {
      this.addMessageToLocalCacheStoreMethod(data.message, data.message.parentMessageId || null);
    } else if (actionType === 'edited') {
      this.editMessageFromLocalCacheStoreMethod(data.message);
    } else if (actionType === 'deleted') {
      this.removeMessageFromLocalCacheStoreMethod(data.messageId, data.parentMessageId || null);
    } else if (actionType === 'addedFileInsideMessage') {
      this.addFileInsideMessageFromLocalCacheStoreMethod(data.messageId, data.addedFile);
    } else if (actionType === 'deletedFileInsideMessage') {
      this.removeFileInsideMessageFromLocalCacheStoreMethod(data.messageId, data.fileUrl);
    }
  }

  public addFileInsideMessageFromLocalCacheStoreMethod(messageId, addedFile) {
    const messageWithFile = this.messages.find((m) => m.messageId === messageId);

    messageWithFile.files.push(addedFile);
  }

  public removeFileInsideMessageFromLocalCacheStoreMethod(messageId, fileUrl) {
    const messageWithFile = this.messages.find((m) => m.messageId === messageId);

    const removedFile = messageWithFile.files.find((f) => f.fileUrl === fileUrl);

    messageWithFile.files.remove(removedFile);
  }

  public addMessageToLocalCacheStoreMethod(data, parentMessageId) {
    const messageObj = new Message({ chat: this, store: this.store, ...data });

    if (parentMessageId) {
      const parentMessage = this.messages.find((m) => m.messageId === parentMessageId);

      parentMessage.messagesInsideThread.push(messageObj);
      parentMessage.countOfThreadMessages = parentMessage.countOfThreadMessages + 1;
    } else {
      this.messages.push(messageObj);
      this.numberOfMessagesPerChat = this.numberOfMessagesPerChat + 1;
    }

    if (
      this.store.currentUser._id === messageObj.createdUserId &&
      !this.store.currentUser.unreadBySomeoneMessageIds.includes(messageObj.messageId) &&
      this.chatParticipantIds.length > 1
    ) {
      runInAction(() => {
        this.store.currentUser.unreadBySomeoneMessageIds.push(messageObj.messageId);
      });
    }

    return messageObj;
  }

  public editMessageFromLocalCacheStoreMethod(data) {
    const message = this.messages.find((m) => m.messageId === data._id);
    if (message) {
      message.changeLocalCacheStoreMethod(data);
    }
  }

  public removeMessageFromLocalCacheStoreMethod(messageId, parentMessageId) {
    if (parentMessageId) {
      const parentMessage = this.messages.find((m) => m.messageId === parentMessageId);
      const messageRemovedViaWebsocket = parentMessage.messagesInsideThread.find(
        (m) => m.messageId === messageId,
      );
      parentMessage.messagesInsideThread.remove(messageRemovedViaWebsocket);

      parentMessage.countOfThreadMessages = parentMessage.countOfThreadMessages - 1;
    } else {
      const message = this.messages.find((m) => m.messageId === messageId);
      this.messages.remove(message);
      this.numberOfMessagesPerChat = this.numberOfMessagesPerChat - 1;
    }
  }

  public async addOrEditMessageStoreMethod({
    content,
    teamId,
    chatId,
    id,
    files,
    parentMessageId,
  }: {
    content: string;
    teamId: string;
    chatId: string;
    id: string;
    files?: { fileName: string; fileUrl: string; addedAt: Date }[];
    parentMessageId: string;
  }): Promise<Message> {
    const { message } = await addOrEditMessageApiMethod({
      chatId,
      socketId: (this.store.socket && this.store.socket.id) || null,
      content,
      teamId,
      id,
      files,
      parentMessageId,
    });

    if (id) {
      const editedDataObj = new Message({
        ...message,
        chat: this,
        team: this.team,
        store: this.store,
      });

      if (parentMessageId) {
        runInAction(() => {
          if (editedDataObj.chat.chatParticipantIds.includes(this.store.currentUser._id)) {
            const parentMessage = this.messages.find((m) => m.messageId === parentMessageId);

            const oldMessage = parentMessage.messagesInsideThread.find(
              (m) => m.messageId === editedDataObj.messageId,
            );
            oldMessage.changeLocalCacheStoreMethod(editedDataObj);
          }
        });
      } else {
        runInAction(() => {
          if (editedDataObj.chat.chatParticipantIds.includes(this.store.currentUser._id)) {
            const oldMessage = this.messages.find((m) => m.messageId === id);
            oldMessage.changeLocalCacheStoreMethod(editedDataObj);
          }
        });
      }

      return editedDataObj;
    } else {
      return new Promise<Message>((resolve) => {
        runInAction(() => {
          const obj = this.addMessageToLocalCacheStoreMethod(message, parentMessageId);
          resolve(obj);
        });
      });
    }
  }

  // done: add parentMessageId
  public async deleteMessageStoreMethod({ message, teamId }: { message: Message; teamId: string }) {
    await deleteMessageApiMethod({
      id: message.messageId,
      chatId: this.chatId,
      teamId,
      socketId: (this.store.socket && this.store.socket.id) || null,
    });

    if (this.store.currentUser.unreadBySomeoneMessageIds.includes(message.messageId)) {
      runInAction(() => {
        this.store.currentUser.unreadBySomeoneMessageIds.remove(message.messageId);
      });
    }

    if (message.parentMessageId) {
      runInAction(() => {
        const parentMessage = this.messages.find((m) => m.messageId === message.parentMessageId);
        parentMessage.messagesInsideThread.remove(message);
        parentMessage.countOfThreadMessages = parentMessage.countOfThreadMessages - 1;
      });
    } else {
      runInAction(() => {
        this.messages.remove(message);
        this.numberOfMessagesPerChat = this.numberOfMessagesPerChat - 1;
      });
    }

    // update User.unreadBySomeoneMessageIds
  }

  get creator() {
    const creator: any = this.members.find((m) => {
      return m._id === this.chatCreatorId;
    });

    return creator;
  }

  get isChatUnreadForUser() {
    let isChatUnreadForUser = false;
    for (const message of this.messages) {
      if (message.isMessageUnreadByUser && message.createdUserId !== this.store.currentUser._id) {
        isChatUnreadForUser = true;
        break;
      }
    }
    return isChatUnreadForUser;
  }

  // realtime update for active discussions
  // no realtime update for archived discussions

  public editChatFromLocalCacheStoreMethod(chat, initialMessages) {
    const editedDiscussion = this.store.currentUser.chatsForUser.find((c) => c.chatId === chat._id);

    if (editedDiscussion) {
      if (
        chat &&
        chat.chatParticipantIds &&
        chat.chatParticipantIds.includes(this.store.currentUser._id)
      ) {
        editedDiscussion.changeLocalCacheStoreMethod(chat);
        editedDiscussion.setInitialMessagesStoreMethod(initialMessages);
      } else {
        this.store.currentUser.removeChatFromLocalCacheStoreMethod(chat._id);
      }
    } else if (
      chat &&
      chat.chatParticipantIds &&
      chat.chatParticipantIds.includes(this.store.currentUser._id)
    ) {
      this.store.currentUser.addChatToLocalCacheStoreMethod(chat, initialMessages);
    }
  }

  public leaveChatSocketRoomStoreMethod() {
    if (this.store.socket) {
      this.store.socket.emit('leaveChatRoom', this.chatId);
      this.store.socket.off('chatEvent', this.handleChatRealtimeEventStoreMethod);
      this.store.socket.off('typingStatus', this.handleTypingStatusRealtimeEventStoreMethod);
    }
  }

  public joinChatSocketRoomStoreMethod() {
    if (this.store.socket) {
      this.store.socket.emit('joinChatRoom', this.chatId);
      this.store.socket.on('chatEvent', this.handleChatRealtimeEventStoreMethod);
      this.store.socket.on('typingStatus', this.handleTypingStatusRealtimeEventStoreMethod);
    }
  }

  public handleChatRealtimeEventStoreMethod = (data) => {
    const { actionType } = data;

    if (actionType === 'added') {
      this.store.currentUser.addChatToLocalCacheStoreMethod(data.chat, data.initialMessages);
    } else if (actionType === 'edited') {
      this.editChatFromLocalCacheStoreMethod(data.chat, data.initialMessages);
    } else if (actionType === 'deleted') {
      this.store.currentUser.removeChatFromLocalCacheStoreMethod(data.chatId);
    } else if (actionType === 'cleared') {
      this.messages.clear();
    }
  };

  public handleTypingStatusRealtimeEventStoreMethod = (data) => {
    const { actionType, userId } = data;

    if (actionType === 'edited') {
      // const chatParticipant = this.members.find((m) => m._id === userId);
      // chatParticipant.isChatParticipantTyping = status;

      const teamMember = this.team.teamMembers.get(userId);
      runInAction(() => {
        teamMember.isChatParticipantTyping = true;
      });

      setTimeout(() => {
        runInAction(() => {
          teamMember.isChatParticipantTyping = false;
        });
      }, 2000);
    }
  };
}

export { Chat };
