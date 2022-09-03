import { action, computed, makeObservable, IObservableArray, observable, runInAction } from 'mobx';
import NProgress from 'nprogress';

// update import section
import {
  addOrEditCommentApiMethod,
  deleteCommentApiMethod,
  getCommentListApiMethod,
} from '../api/to-api-server-team-member';
import { getRegEx, highlightSearchResult } from '../highlightSearchResult';
import { Comment, Store, Team, User } from './index';

class Discussion {
  public discussionId: string;
  public discussionLeaderId: string;
  public discussionName: string;

  public isDiscussionArchived: boolean;

  public discussionMemberIds: IObservableArray<string>;
  public teamId: string;
  public lastUpdatedAt: Date;

  public firstCommentId: string;

  public comments: IObservableArray<Comment> = observable([]);
  public isLoadingComments = false;

  public store: Store;
  public team: Team;

  constructor(params) {
    makeObservable<Discussion, 'handleDiscussionRealtimeEventStoreMethod'>(this, {
      isDiscussionArchived: observable,
      discussionName: observable,
      discussionId: observable,
      discussionMemberIds: observable,
      comments: observable,
      isLoadingComments: observable,
      lastUpdatedAt: observable,

      changeLocalCacheStoreMethod: action,
      setInitialCommentsStoreMethod: action,
      loadCommentsStoreMethod: action,

      handleCommentRealtimeEventStoreMethod: action,
      addCommentToLocalCacheStoreMethod: action,
      editCommentFromLocalCacheStoreMethod: action,
      removeCommentFromLocalCacheStoreMethod: action,
      addFileInsideCommentFromLocalCacheStoreMethod: action,
      removeFileInsideCommentFromLocalCacheStoreMethod: action,

      addOrEditCommentStoreMethod: action,
      deleteCommentStoreMethod: action,

      editDiscussionFromLocalCacheStoreMethod: action,
      leaveDiscussionSocketRoomStoreMethod: action,
      joinDiscussionSocketRoomStoreMethod: action,
      handleDiscussionRealtimeEventStoreMethod: action,

      getHighlightedDiscussionNameStoreMethod: action,
      getSearchExcerptForCommentStoreMethod: action,

      members: computed,
      user: computed,
      firstComment: computed,
      isDiscussionPinnedForUser: computed,
      isDiscussionUnreadForUser: computed,
      leader: computed,
    });

    this.discussionLeaderId = params.discussionLeaderId;
    this.discussionId = params._id;
    this.discussionMemberIds = params.discussionMemberIds;
    this.isDiscussionArchived = params.isDiscussionArchived;
    this.lastUpdatedAt = params.lastUpdatedAt;
    this.firstCommentId = params.firstCommentId;
    this.teamId = params.teamId;

    this.store = params.store;
    this.team = params.team;

    this.changeLocalCacheStoreMethod(params);

    if (params.initialComments) {
      this.setInitialCommentsStoreMethod(params.initialComments);
    }
  }

  // must be public
  public changeLocalCacheStoreMethod(data) {
    if (data.discussionName) {
      this.discussionName = data.discussionName;
    }

    if (data.discussionMemberIds) {
      this.discussionMemberIds.replace(data.discussionMemberIds || []);
    }

    if (data.lastUpdatedAt) {
      this.lastUpdatedAt = new Date(data.lastUpdatedAt);
    }
  }

  public getHighlightedDiscussionNameStoreMethod(query: string) {
    const regEx = getRegEx(query);
    if (!regEx) {
      return 'Wrong query';
    }

    const highlightedDiscussionName = highlightSearchResult({
      regEx,
      content: this.discussionName,
      query,
      isDiscussion: true,
    });

    if (!highlightedDiscussionName) {
      return;
    }

    return highlightedDiscussionName;
  }

  public getSearchExcerptForCommentStoreMethod(query: string) {
    const regEx = getRegEx(query);
    if (!regEx) {
      return 'Wrong query';
    }

    let matchStr = '';

    this.comments.forEach((c) => {
      const excerpt = highlightSearchResult({
        regEx,
        content: c.htmlContent,
        query,
        isDiscussion: false,
      });
      if (excerpt) {
        matchStr += excerpt;
      }
    });

    if (!matchStr) {
      return '<ul style="list-style: none"><li>No matches<li></ul>';
    }

    return `<ul style="list-style: none">${matchStr}</ul>`;
  }

  get user(): User {
    return this.team.teamMembers.get(this.discussionLeaderId) || null;
  }

  get members() {
    return this.team.members.filter((member) => this.discussionMemberIds.includes(member._id));
  }

  // review
  public setInitialCommentsStoreMethod(initialComments) {
    const commentObjs = initialComments.map(
      (c) => new Comment({ discussion: this, store: this.store, team: this.team, ...c }),
    );
    this.comments.replace(commentObjs);
  }

  // review
  public async loadCommentsStoreMethod() {
    if (this.isLoadingComments || this.store.isServer) {
      return;
    }

    NProgress.start();
    this.isLoadingComments = true;

    try {
      const { comments = [] } = await getCommentListApiMethod({
        discussionId: this.discussionId,
        teamId: this.team.teamId,
      });

      runInAction(() => {
        const commentObjs = comments.map(
          (c) => new Comment({ discussion: this, store: this.store, team: this.team, ...c }),
        );
        this.comments.replace(commentObjs);
      });
    } catch (err) {
      console.log(err);
    } finally {
      runInAction(() => {
        this.isLoadingComments = false;
        NProgress.done();
      });
    }
  }

  public handleCommentRealtimeEventStoreMethod(data) {
    const { actionType } = data;

    if (actionType === 'added') {
      // this.addCommentToLocalCacheStoreMethod(data.comment);
    } else if (actionType === 'edited') {
      this.editCommentFromLocalCacheStoreMethod(data.comment);
    } else if (actionType === 'deleted') {
      this.removeCommentFromLocalCacheStoreMethod(data.commentId);
    } else if (actionType === 'addedFileInsideComment') {
      this.addFileInsideCommentFromLocalCacheStoreMethod(data.commentId, data.addedFile);
    } else if (actionType === 'deletedFileInsideComment') {
      this.removeFileInsideCommentFromLocalCacheStoreMethod(data.commentId, data.fileUrl);
    }
  }

  public addFileInsideCommentFromLocalCacheStoreMethod(commentId, addedFile) {
    const commentWithFile = this.comments.find((c) => c.commentId === commentId);

    commentWithFile.files.push(addedFile);
  }

  public removeFileInsideCommentFromLocalCacheStoreMethod(commentId, fileUrl) {
    const commentWithFile = this.comments.find((c) => c.commentId === commentId);

    const removedFile = commentWithFile.files.find((f) => f.fileUrl === fileUrl);

    commentWithFile.files.remove(removedFile);
  }

  public addCommentToLocalCacheStoreMethod(data) {
    const commentObj = new Comment({ discussion: this, store: this.store, ...data });

    this.comments.push(commentObj);

    return commentObj;
  }

  public editCommentFromLocalCacheStoreMethod(data) {
    const comment = this.comments.find((c) => c.commentId === data._id);
    if (comment) {
      comment.changeLocalCacheStoreMethod(data);
    }
  }

  public removeCommentFromLocalCacheStoreMethod(commentId) {
    const comment = this.comments.find((c) => c.commentId === commentId);
    this.comments.remove(comment);
  }

  public async addOrEditCommentStoreMethod({
    content,
    teamId,
    discussionId,
    id,
    files,
  }: {
    content: string;
    teamId: string;
    discussionId: string;
    id: string;
    files?: { fileName: string; fileUrl: string; addedAt: Date }[];
  }): Promise<Comment> {
    const { comment } = await addOrEditCommentApiMethod({
      discussionId,
      socketId: (this.store.socket && this.store.socket.id) || null,
      content,
      teamId,
      id,
      files,
    });

    if (id) {
      const editedDataObj = new Comment({
        ...comment,
        discussion: this,
        team: this.team,
        store: this.store,
      });

      runInAction(() => {
        if (editedDataObj.discussion.discussionMemberIds.includes(this.store.currentUser._id)) {
          const oldComment = this.comments.find((c) => c.commentId === id);
          oldComment.changeLocalCacheStoreMethod(editedDataObj);
        }
      });

      return editedDataObj;
    } else {
      return new Promise<Comment>((resolve) => {
        runInAction(() => {
          const obj = this.addCommentToLocalCacheStoreMethod(comment);
          resolve(obj);
        });
      });
    }
  }

  public async deleteCommentStoreMethod({ comment, teamId }: { comment: Comment; teamId: string }) {
    await deleteCommentApiMethod({
      id: comment.commentId,
      discussionId: this.discussionId,
      teamId,
      socketId: (this.store.socket && this.store.socket.id) || null,
    });

    runInAction(() => {
      this.comments.remove(comment);
    });
  }

  // think how to improve
  get leader() {
    const leader: any = this.team.members.find((m) => {
      return m._id === this.discussionLeaderId;
    });

    return leader;
  }

  get firstComment() {
    const firstComment: Comment = this.comments.find((c) => {
      return c.commentId === this.firstCommentId;
    });

    return firstComment;
  }

  get isDiscussionPinnedForUser() {
    if (
      this.store &&
      this.store.currentUser &&
      this.store.currentUser.pinnedDiscussionIds.includes(this.discussionId)
    ) {
      return true;
    } else {
      return false;
    }
  }

  get isDiscussionUnreadForUser() {
    let isDiscussionUnreadForUser = false;
    for (const comment of this.comments) {
      if (comment.isCommentUnreadForUser && comment.createdUserId !== this.store.currentUser._id) {
        isDiscussionUnreadForUser = true;
        break;
      }
    }
    return isDiscussionUnreadForUser;
  }

  // realtime update for active discussions
  // no realtime update for archived discussions

  public editDiscussionFromLocalCacheStoreMethod(discussion, initialComments) {
    const editedDiscussion = this.store.currentUser.activeDiscussionsForUser.find(
      (d) => d.discussionId === discussion._id,
    );

    if (editedDiscussion) {
      if (
        discussion &&
        discussion.discussionMemberIds &&
        discussion.discussionMemberIds.includes(this.store.currentUser._id)
      ) {
        editedDiscussion.changeLocalCacheStoreMethod(discussion);
        editedDiscussion.setInitialCommentsStoreMethod(initialComments);
      } else {
        const whichList = discussion && discussion.isDiscussionArchived ? 'archived' : 'active';

        this.store.currentUser.removeDiscussionFromLocalCacheStoreMethod(discussion._id, whichList);
      }
    } else if (
      discussion &&
      discussion.discussionMemberIds &&
      discussion.discussionMemberIds.includes(this.store.currentUser._id)
    ) {
      this.store.currentUser.addDiscussionToLocalCacheStoreMethod(discussion, initialComments);
    }
  }

  // not used, should be used in User store
  public leaveDiscussionSocketRoomStoreMethod() {
    if (this.store.socket) {
      this.store.socket.emit('leaveDiscussionRoom', this.discussionId);
      this.store.socket.off('discussionEvent', this.handleDiscussionRealtimeEventStoreMethod);
    }
  }

  // not used, should be used in User store
  public joinDiscussionSocketRoomStoreMethod() {
    if (this.store.socket) {
      this.store.socket.emit('joinDiscussionRoom', this.discussionId);
      this.store.socket.on('discussionEvent', this.handleDiscussionRealtimeEventStoreMethod);
    }
  }

  public handleDiscussionRealtimeEventStoreMethod = (data) => {
    const { actionType } = data;

    if (actionType === 'added') {
      this.store.currentUser.addDiscussionToLocalCacheStoreMethod(
        data.discussion,
        data.initialComments,
      );
    } else if (actionType === 'edited') {
      this.editDiscussionFromLocalCacheStoreMethod(data.discussion, data.initialComments);
    } else if (actionType === 'deleted') {
      this.store.currentUser.removeDiscussionFromLocalCacheStoreMethod(
        data.discussionId,
        data.whichList,
      );
    } else if (actionType === 'archived') {
      this.store.currentUser.archiveDiscussionStoreMethod({
        teamId: data.teamId,
        discussionId: data.discussionId,
        action: data.action,
      });
    }
  };
}

export { Discussion };
