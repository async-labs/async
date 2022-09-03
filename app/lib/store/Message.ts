import { action, computed, makeObservable, IObservableArray, observable, runInAction } from 'mobx';
// import NProgress from 'nprogress';

import {
  deleteFileForMessageApiMethod,
  getThreadMessagesApiMethod,
} from '../api/to-api-server-team-member';
import { getRegEx, highlightSearchResult } from '../highlightSearchResult';

import { Chat, Store, Team } from './index';

class Message {
  public messageId: string;
  public createdUserId: string;
  public createdAt: Date;
  public chatId: string;

  public isEdited: boolean;

  public content: string;
  public htmlContent: string;

  public lastEditedAt: Date;

  public parentMessageId: string;
  public isLoadingThreadMessages = false;
  public messagesInsideThread: IObservableArray<Message> = observable([]);
  public countOfThreadMessages: number;

  public chat: Chat;
  public store: Store;
  private team: Team;

  public files: IObservableArray<{ fileName: string; fileUrl: string; addedAt: Date }> = observable(
    [],
  );

  constructor(params) {
    makeObservable(this, {
      chat: observable,
      isEdited: observable,
      content: observable,
      htmlContent: observable,
      lastEditedAt: observable,

      parentMessageId: observable,
      isLoadingThreadMessages: observable,
      countOfThreadMessages: observable,

      files: observable,

      changeLocalCacheStoreMethod: action,
      deleteFileStoreMethod: action,

      getHighlightedSearchResultsStoreMethod: action,

      loadThreadMessagesStoreMethod: action,

      creator: computed,
      isMessageUnreadByUser: computed,
      isMessageUnreadBySomeone: computed,
    });
    this.messageId = params._id;
    this.createdUserId = params.createdUserId;
    this.chatId = params.chatId;
    this.isEdited = params.isEdited;

    if (params.createdAt) {
      this.createdAt = new Date(params.createdAt);
    }

    if (params.lastEditedAt) {
      this.lastEditedAt = new Date(params.lastEditedAt);
    }

    this.parentMessageId = params.parentMessageId || null;
    this.countOfThreadMessages = params.countOfThreadMessages || null;

    this.store = params.store;
    this.team = params.chat.team;
    this.chat = params.chat;

    this.files = params.files;

    this.changeLocalCacheStoreMethod(params);
  }

  // add team leader to members on server
  // edit
  get creator() {
    const creator: any =
      this.team.members.find((m) => {
        return m._id === this.createdUserId;
      }) ||
      this.team.removedTeamMembers.find((rm) => rm.userId === this.createdUserId) ||
      null;

    if (creator && creator.userId && creator.userId === this.createdUserId) {
      creator.status = 'removed';
    }
    return creator;
  }

  // modify with messagesInsideThread
  get isMessageUnreadByUser() {
    if (
      this.store &&
      this.store.currentUser &&
      this.store.currentUser.unreadByUserMessageIds.includes(this.messageId)
    ) {
      return true;
    } else {
      return false;
    }
  }

  get isMessageUnreadBySomeone() {
    if (
      this.store &&
      this.store.currentUser &&
      this.store.currentUser.unreadBySomeoneMessageIds.includes(this.messageId)
    ) {
      return true;
    } else {
      return false;
    }
  }

  // must be public
  public changeLocalCacheStoreMethod(data) {
    this.content = data.content;
    this.htmlContent = data.htmlContent;

    if (data.isEdited !== undefined) {
      this.isEdited = !!data.isEdited;
    }

    if (data.lastEditedAt) {
      this.lastEditedAt = new Date(data.lastEditedAt);
    }
  }

  public async deleteFileStoreMethod({
    messageId,
    fileUrl,
    teamId,
  }: {
    messageId: string;
    fileUrl: string;
    teamId: string;
  }) {
    try {
      await deleteFileForMessageApiMethod({
        messageId,
        fileUrl,
        teamId,
        socketId: (this.store.socket && this.store.socket.id) || null,
        chatId: this.chatId,
      });

      runInAction(() => {
        const filteredFiles = this.files.filter((f) => f.fileUrl !== fileUrl);
        this.files.replace(filteredFiles);
      });
    } catch (error) {
      console.log(error);
    }
  }

  public getHighlightedSearchResultsStoreMethod(query: string) {
    const regEx = getRegEx(query);
    if (!regEx) {
      return 'Wrong query';
    }

    let matchStr = '';

    const excerpt = highlightSearchResult({
      regEx,
      content: this.htmlContent,
      query,
      isDiscussion: false,
    });

    if (excerpt) {
      matchStr += excerpt;
    }

    if (!matchStr) {
      return '<ul style="list-style: none"><li>No matches<li></ul>';
    }

    return `<ul style="list-style: none">${matchStr}</ul>`;
  }

  public async loadThreadMessagesStoreMethod(chatId: string, messageId: string, teamId: string) {
    if (this.isLoadingThreadMessages || this.store.isServer) {
      return;
    }

    this.isLoadingThreadMessages = true;

    try {
      const { messagesInsideThread = [] } = await getThreadMessagesApiMethod({
        chatId,
        messageId,
        teamId,
      });

      runInAction(() => {
        const messageObjs = messagesInsideThread.map(
          (m) => new Message({ chat: this, store: this.store, team: this.team, ...m }),
        );
        this.messagesInsideThread.replace(messageObjs);
      });
    } catch (err) {
      console.log(err);
    } finally {
      runInAction(() => {
        this.isLoadingThreadMessages = false;
      });
    }
  }
}

export { Message };
