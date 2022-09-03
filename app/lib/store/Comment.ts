import { action, computed, makeObservable, IObservableArray, observable, runInAction } from 'mobx';

import { deleteFileForCommentApiMethod } from '../api/to-api-server-team-member';

import { Discussion, Store, Team } from './index';

class Comment {
  public commentId: string;
  public createdUserId: string;
  public createdAt: Date;
  public discussionId: string;

  public isEdited: boolean;

  public content: string;
  public htmlContent: string;

  public lastEditedAt: Date;

  public discussion: Discussion;
  public store: Store;
  private team: Team;

  public files: IObservableArray<{ fileName: string; fileUrl: string; addedAt: Date }> = observable(
    [],
  );

  constructor(params) {
    makeObservable(this, {
      discussion: observable,
      isEdited: observable,
      content: observable,
      htmlContent: observable,
      lastEditedAt: observable,

      files: observable,

      changeLocalCacheStoreMethod: action,
      deleteFileStoreMethod: action,

      creator: computed,
      isCommentUnreadForUser: computed,
    });
    this.commentId = params._id;
    this.createdUserId = params.createdUserId;
    this.discussionId = params.discussionId;
    this.isEdited = params.isEdited;

    if (params.createdAt) {
      this.createdAt = new Date(params.createdAt);
    }

    if (params.lastEditedAt) {
      this.lastEditedAt = new Date(params.lastEditedAt);
    }

    this.store = params.store;
    this.team = params.discussion.team;
    this.discussion = params.discussion;

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

  get isCommentUnreadForUser() {
    if (
      this.store &&
      this.store.currentUser &&
      this.store.currentUser.unreadCommentIds.includes(this.commentId)
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
    commentId,
    fileUrl,
    teamId,
  }: {
    commentId: string;
    fileUrl: string;
    teamId: string;
  }) {
    try {
      await deleteFileForCommentApiMethod({
        commentId,
        fileUrl,
        teamId,
        socketId: (this.store.socket && this.store.socket.id) || null,
        discussionId: this.discussionId,
      });

      runInAction(() => {
        const filteredFiles = this.files.filter((f) => f.fileUrl !== fileUrl);
        this.files.replace(filteredFiles);
      });
    } catch (error) {
      console.log(error);
    }
  }
}

export { Comment };
