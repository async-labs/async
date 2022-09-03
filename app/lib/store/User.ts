// import groupBy from 'lodash/groupBy';
import { action, computed, makeObservable, IObservableArray, observable, runInAction } from 'mobx';
import Router from 'next/router';

// import * as NProgress from 'nprogress';
import notify from '../notify';

import {
  createOrUpdateTeamProfileApiMethod,
  deleteCurrentTeamApiMethod,
  getListOfInvoicesForAccountApiMethod,
  cancelSubscriptionForTeamApiMethod,
  reSubscribeTeamApiMethod,
} from '../api/to-api-server-team-leader';

import {
  createOrUpdateUserProfileApiMethod,
  getActiveDiscussionListApiMethod,
  getArchivedDiscussionListApiMethod,
  makeTeamDefaultApiMethod,
  toggleThemeApiMethod,
  searchDiscussionsApiMethod,
  createOrUpdateDiscussionApiMethod,
  deleteDiscussionApiMethod,
  archiveDiscussionApiMethod,
  pinDiscussionApiMethod,
  unpinDiscussionApiMethod,
  readCommentApiMethod,
  unreadCommentApiMethod,
  getChatListApiMethod,
  createOrUpdateChatApiMethod,
  deleteChatApiMethod,
  messagesWereSeenApiMethod,
  searchWithinChatApiMethod,
  sendOnlineStatusToServerApiMethod,
  updateTypingStatusViaServerApiMethod,
  clearChatHistoryApiMethod,
} from '../api/to-api-server-team-member';

import { Chat, Message, Discussion, Store, Team } from './index';

class User {
  public _id: string;
  public isLoggedIn = false;
  public email: string | null;
  public accountCreationDate: Date;
  public userName: string | null;
  public userAvatarUrl: string | null;
  public showDarkTheme: boolean | true;

  public isTeamMemberOnline: boolean | false;
  public isChatParticipantTyping: boolean | false;

  public teamsForUser: IObservableArray<Team> = observable([]);
  public defaultTeamId: string | null;

  public store: Store;

  public currentTeam?: Team = null;
  public teamForTeamMember?: Team = null;

  stripeCustomer: {
    id: string;
    object: string;
    created: number;
    currency: string;
    default_source: string;
    description: string;
  };

  stripeCard: {
    brand: string;
    funding: string;
    country: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };

  public isSubscriptionActiveForAccount: boolean;
  public isPaymentFailedForAccount: boolean;

  public stripeSubscription: {
    id: string;
    object: string;
    application_fee_percent: number;
    billing: string;
    billing_cycle_anchor: number;
    created: number;
    cancel_at_period_end: boolean;
    canceled_at: number;
    cancel_at: number;
  };

  public stripeListOfInvoices: {
    object: string;
    has_more: boolean;
    data: [
      {
        id: string;
        object: string;
        amount_paid: number;
        created: number;
        customer: string;
        subscription: string;
        hosted_invoice_url: string;
        status: string;
        paid: boolean;
        number: string;
        period_end: number;
        period_start: number;
      },
    ];
  };

  public trialPeriodStartDate: Date;
  public numberOfUniqueActiveTeamMembers: number;

  // selected and current are the same

  public activeDiscussionsForUser: IObservableArray<Discussion> = observable([]);
  public archivedDiscussionsForUser: IObservableArray<Discussion> = observable([]);
  public isLoadingDiscussions = false;

  public chatsForUser: IObservableArray<Chat> = observable([]);
  public isLoadingChats = false;

  public pinnedDiscussionIds: IObservableArray<string> = observable([]);

  public unreadCommentIds: IObservableArray<string> = observable([]);
  public unreadByUserMessageIds: IObservableArray<string> = observable([]);
  public unreadBySomeoneMessageIds: IObservableArray<string> = observable([]);

  public isLoadingNotifications = false;

  public onlineStatusByTeam: { teamId: string; status: boolean }[];

  constructor(params) {
    makeObservable<User>(this, {
      email: observable,
      isLoggedIn: observable,
      currentTeam: observable,
      userName: observable,
      userAvatarUrl: observable,
      showDarkTheme: observable,
      defaultTeamId: observable,

      isTeamMemberOnline: observable,
      isChatParticipantTyping: observable,

      teamsForUser: observable,
      teamForTeamMember: observable,

      activeDiscussionsForUser: observable,
      archivedDiscussionsForUser: observable,
      isLoadingDiscussions: observable,

      chatsForUser: observable,
      isLoadingChats: observable,

      pinnedDiscussionIds: observable,

      unreadCommentIds: observable,
      unreadByUserMessageIds: observable,
      unreadBySomeoneMessageIds: observable,

      isLoadingNotifications: observable,

      stripeCustomer: observable,
      stripeCard: observable,

      isSubscriptionActiveForAccount: observable,
      isPaymentFailedForAccount: observable,
      stripeSubscription: observable,
      stripeListOfInvoices: observable,
      numberOfUniqueActiveTeamMembers: observable,

      setInitialDiscussionsStoreMethod: action,
      loadActiveDiscussionsStoreMethod: action,
      loadArchivedDiscussionsStoreMethod: action,

      setInitialChatsStoreMethod: action,
      loadChatsStoreMethod: action,

      createNewTeamStoreMethod: action,
      updateUserProfileStoreMethod: action,
      createOrUpdateTeamStoreMethod: action,
      toggleThemeStoreMethod: action,
      loginStoreMethod: action,
      logoutStoreMethod: action,

      searchDiscussionsStoreMethod: action,

      makeTeamDefaultStoreMethod: action,
      // makePageDefaultStoreMethod

      createOrUpdateDiscussionStoreMethod: action,
      addDiscussionToLocalCacheStoreMethod: action,
      removeDiscussionFromLocalCacheStoreMethod: action,
      deleteDiscussionStoreMethod: action,

      pinDiscussionStoreMethod: action,
      unpinDiscussionStoreMethod: action,
      readCommentStoreMethod: action,
      unreadCommentStoreMethod: action,

      createOrUpdateChatStoreMethod: action,
      addChatToLocalCacheStoreMethod: action,
      removeChatFromLocalCacheStoreMethod: action,
      deleteChatStoreMethod: action,

      messagesWereSeenStoreMethod: action,

      searchWithinChatStoreMethod: action,

      sendOnlineStatusToServerStoreMethod: action,
      updateTypingStatusStoreMethod: action,

      deleteCurrentTeamStoreMethod: action,
      removeTeamFromLocalCacheStoreMethod: action,

      clearChatHistoryStoreMethod: action,

      getListOfInvoicesForAccountStoreMethod: action,
      reSubscribeTeamStoreMethod: action,
      cancelSubscriptionForTeamStoreMethod: action,

      orderedActiveDiscussions: computed,
      orderedArchivedDiscussions: computed,
      orderedChats: computed,
      isChatsLinkUnreadForUser: computed,
    });

    this._id = params._id;
    this.store = params.store;
    this.isLoggedIn = !!params.isLoggedIn;

    // from private-api
    // both TL and TM
    this.email = params.email;
    this.accountCreationDate = params.accountCreationDate;
    this.userName = params.userName;
    this.userAvatarUrl = params.userAvatarUrl;
    this.showDarkTheme = params.showDarkTheme;
    this.defaultTeamId = params.defaultTeamId;

    const selectedTeam =
      params.onlineStatusByTeam &&
      params.onlineStatusByTeam.find((obj) => obj.teamId === params.selectedTeamId);

    this.isTeamMemberOnline = (selectedTeam && selectedTeam.status) || false;

    this.pinnedDiscussionIds = params.pinnedDiscussionIds;

    this.unreadCommentIds = params.unreadCommentIds;
    this.unreadByUserMessageIds = params.unreadByUserMessageIds;
    this.unreadBySomeoneMessageIds = params.unreadBySomeoneMessageIds;

    this.teamForTeamMember = params.teamForTeamMember;

    this.stripeCustomer = params.stripeCustomer;
    this.stripeCard = params.stripeCard;
    this.trialPeriodStartDate = params.trialPeriodStartDate;
    this.isSubscriptionActiveForAccount = params.isSubscriptionActiveForAccount;
    this.isPaymentFailedForAccount = params.isPaymentFailedForAccount;
    this.stripeSubscription = params.stripeSubscription;
    this.stripeListOfInvoices = params.stripeListOfInvoices || null;
    this.numberOfUniqueActiveTeamMembers = params.numberOfUniqueActiveTeamMembers;

    const {
      initialTeams,
      selectedTeamId,
      initialDiscussions,
      // selectedDiscussionId,
      initialChats,
      // selectedChatId,
    } = params;

    if (selectedTeamId && initialTeams && initialTeams.length > 0) {
      this.setInitialTeamsStoreMethod(initialTeams, selectedTeamId);
      this.setCurrentTeamStoreMethod(selectedTeamId);
    }

    if (initialDiscussions) {
      this.setInitialDiscussionsStoreMethod(initialDiscussions);
    }

    if (initialChats) {
      this.setInitialChatsStoreMethod(initialChats);
    }
  }

  // review later
  public async loadCurrentTeamDataStoreMethod() {
    if (this.currentTeam) {
      await this.currentTeam
        .loadTeamMembersStoreMethod()
        .catch((err) => console.error('Error while loading Users', err));

      await this.loadActiveDiscussionsStoreMethod({ teamId: this.currentTeam.teamId }).catch(
        (err) => console.error('Error while loading Discussions', err),
      );

      await this.loadChatsStoreMethod({ teamId: this.currentTeam.teamId }).catch((err) =>
        console.error('Error while loading Chats', err),
      );
    }
  }

  public async setCurrentTeamStoreMethod(teamId: string) {
    if (this.currentTeam) {
      if (this.currentTeam.teamId === teamId) {
        return;
      } else {
        runInAction(() => {
          this.currentTeam.leaveTeamSocketRoomStoreMethod();
        });
      }
    }

    let found = false;

    for (const team of this.teamsForUser) {
      if (team.teamId === teamId) {
        found = true;

        runInAction(() => {
          this.currentTeam = team;
          team.joinTeamSocketRoomStoreMethod();
        });

        // await this.sendOnlineStatusToServerStoreMethod(true, teamId);
        await this.loadCurrentTeamDataStoreMethod();

        break;
      }
    }

    if (!found) {
      this.currentTeam = null;
    }
  }

  private setInitialTeamsStoreMethod(initialTeams: any[], teamId?: string) {
    const teamObjs = initialTeams.map((t) => new Team({ store: this.store, ...t }));

    this.teamsForUser.replace(teamObjs);

    if (teamId) {
      this.setCurrentTeamStoreMethod(teamId);
    }
  }

  public setInitialDiscussionsStoreMethod(initialDiscussions) {
    const discussionObjs = initialDiscussions.map(
      (d) =>
        new Discussion({
          team: this.currentTeam,
          store: this.store,
          ...d,
        }),
    );

    this.activeDiscussionsForUser.replace(discussionObjs.filter((d) => !d.isDiscussionArchived));

    this.archivedDiscussionsForUser.replace(discussionObjs.filter((d) => d.isDiscussionArchived));
  }

  // if user is Team Leader, show all Discussions inside Team
  // review
  public async loadActiveDiscussionsStoreMethod({ teamId }: { teamId: string }) {
    if (this.store.isServer || this.isLoadingDiscussions) {
      return;
    }

    this.isLoadingDiscussions = true;

    try {
      const { discussions = [] } = await getActiveDiscussionListApiMethod({ teamId });

      runInAction(() => {
        this.activeDiscussionsForUser.clear();

        discussions.forEach((d) => {
          const disObj = this.activeDiscussionsForUser.find((obj) => obj.discussionId === d._id);
          if (disObj) {
            disObj.changeLocalCacheStoreMethod(d);
          } else {
            const newD = new Discussion({ team: this.currentTeam, store: this.store, ...d });
            if (newD.discussionMemberIds.includes(this._id)) {
              this.activeDiscussionsForUser.push(newD);
            }
          }
        });
      });
    } finally {
      runInAction(() => {
        this.isLoadingDiscussions = false;
      });
    }
  }

  public async loadArchivedDiscussionsStoreMethod({ teamId }: { teamId: string }) {
    if (this.store.isServer || this.isLoadingDiscussions) {
      return;
    }

    this.isLoadingDiscussions = true;

    try {
      const { discussions = [] } = await getArchivedDiscussionListApiMethod({
        teamId,
      });

      runInAction(() => {
        this.archivedDiscussionsForUser.clear();

        discussions.forEach((d) => {
          const disObj = this.archivedDiscussionsForUser.find((obj) => obj.discussionId === d._id);
          if (disObj) {
            disObj.changeLocalCacheStoreMethod(d);
          } else {
            const newD = new Discussion({ team: this.currentTeam, store: this.store, ...d });
            if (newD.discussionMemberIds.includes(this._id)) {
              this.archivedDiscussionsForUser.push(newD);
            }
          }
        });
      });
    } finally {
      runInAction(() => {
        this.isLoadingDiscussions = false;
      });
    }
  }

  get isChatsLinkUnreadForUser() {
    let isChatsLinkUnread = false;
    for (const chat of this.chatsForUser) {
      if (chat.isChatUnreadForUser) {
        isChatsLinkUnread = true;
        break;
      }
    }

    return isChatsLinkUnread;
  }

  get orderedActiveDiscussions() {
    return this.activeDiscussionsForUser.slice().sort((d1, d2) => {
      const isD1Pinned = this.store.currentUser.pinnedDiscussionIds.indexOf(d1.discussionId);
      const isD2Pinned = this.store.currentUser.pinnedDiscussionIds.indexOf(d2.discussionId);

      if (isD1Pinned === -1 && isD2Pinned === -1) {
        return new Date(d2.lastUpdatedAt).getTime() - new Date(d1.lastUpdatedAt).getTime();
      }

      if (isD1Pinned !== -1 && isD2Pinned !== -1) {
        return isD1Pinned - isD2Pinned;
      }

      if (isD1Pinned !== -1) {
        return -1;
      }

      return 1;
    });
  }

  get orderedArchivedDiscussions() {
    // order by last activity
    return this.archivedDiscussionsForUser.slice().sort((d1, d2) => {
      return new Date(d2.lastUpdatedAt).getTime() - new Date(d1.lastUpdatedAt).getTime(); // test
    });
  }

  public async searchDiscussionsStoreMethod({
    query,
    whichList,
    teamId,
  }: {
    query: string;
    whichList: string;
    teamId: string;
  }) {
    const { discussions = [] } = await searchDiscussionsApiMethod({
      query,
      whichList,
      teamId,
    });

    return discussions.map(
      (d) => new Discussion({ team: this.currentTeam, store: this.store, ...d }),
    );
  }

  get numberOfUnreadComments() {
    return this.unreadCommentIds.length;
  }

  public async updateUserProfileStoreMethod({
    userName,
    userAvatarUrl,
    teamId,
  }: {
    userName: string;
    userAvatarUrl: string;
    teamId: string;
  }) {
    await createOrUpdateUserProfileApiMethod({
      email: this.email,
      userName,
      userAvatarUrl,
      teamId,
    });

    runInAction(() => {
      if (userName) {
        this.userName = userName;
      }

      if (userAvatarUrl) {
        this.userAvatarUrl = userAvatarUrl;
      }
    });
  }

  public async createOrUpdateTeamStoreMethod({
    teamName,
    teamLogoUrl,
    teamId,
  }: {
    teamName: string;
    teamLogoUrl: string;
    teamId: string;
  }) {
    await createOrUpdateTeamProfileApiMethod({
      teamName,
      teamLogoUrl,
      teamId,
    });

    runInAction(() => {
      if (teamId) {
        for (const team of this.teamsForUser) {
          if (team.teamId === teamId) {
            team.teamName = teamName;
            team.teamLogoUrl = teamLogoUrl;
            break;
          }
        }
      }
    });
  }

  public async toggleThemeStoreMethod({
    showDarkTheme,
    teamId,
  }: {
    showDarkTheme: boolean;
    teamId: string;
  }) {
    this.showDarkTheme = showDarkTheme;
    await toggleThemeApiMethod({ showDarkTheme, teamId });
  }

  public async createNewTeamStoreMethod({
    teamName,
    teamLogoUrl,
  }: {
    teamName: string;
    teamLogoUrl: string;
  }) {
    const { team } = await createOrUpdateTeamProfileApiMethod({
      teamName,
      teamLogoUrl,
      teamId: 'new-team',
    });

    // problem: missing idsOfTeamMembersForTeamLeader
    // should return entire team object instead of teamId
    const newTeam = new Team({
      store: this.store,
      ...team,
    });

    runInAction(() => {
      this.teamsForUser.push(newTeam);
      this.setCurrentTeamStoreMethod(newTeam.teamId);
    });

    return newTeam.teamId;
  }

  public async makeTeamDefaultStoreMethod(teamId: string, defaultTeamId: string) {
    await makeTeamDefaultApiMethod(teamId, defaultTeamId);

    runInAction(() => {
      if (teamId) {
        this.defaultTeamId = defaultTeamId;
      }
    });
  }

  // Async Cloud will eventually need Account deletion
  // Async Cloud will eventually need automatic marking of accounts that were inactive for 3 months
  public loginStoreMethod() {
    this.isLoggedIn = true;
  }

  public logoutStoreMethod() {
    this.isLoggedIn = false;
  }

  public async createOrUpdateDiscussionStoreMethod(data): Promise<Discussion> {
    const { discussion, initialComments } = await createOrUpdateDiscussionApiMethod({
      socketId: (this.store.socket && this.store.socket.id) || null,
      ...data,
    });

    if (data.id) {
      const newObj = new Discussion({
        ...discussion,
        initialComments,
        team: this.currentTeam,
        store: this.store,
      });

      runInAction(() => {
        if (
          newObj.discussionMemberIds.includes(this.store.currentUser._id) &&
          newObj.discussionLeaderId === this.store.currentUser._id
        ) {
          const filteredDiscussions = this.activeDiscussionsForUser.filter(
            (d) => d.discussionId !== data.id,
          );
          this.activeDiscussionsForUser.replace(filteredDiscussions);
          this.activeDiscussionsForUser.push(newObj);
        }
      });

      return newObj;
    } else {
      return new Promise<Discussion>((resolve) => {
        runInAction(() => {
          const obj = this.addDiscussionToLocalCacheStoreMethod(discussion, initialComments);
          resolve(obj);
        });
      });
    }
  }

  public addDiscussionToLocalCacheStoreMethod(data, initialComments): Discussion {
    const obj = new Discussion({
      ...data,
      initialComments,
      team: this.currentTeam,
      store: this.store,
    });

    if (obj.discussionMemberIds.includes(this.store.currentUser._id)) {
      this.activeDiscussionsForUser.push(obj);
    }

    return obj;
  }

  // update this.unreadCommentIds, this is implemented on server
  public removeDiscussionFromLocalCacheStoreMethod(discussionId: string, whichList: string) {
    if (whichList === 'active') {
      const discussion = this.activeDiscussionsForUser.find((d) => d.discussionId === discussionId);
      this.activeDiscussionsForUser.remove(discussion);
      notify(`The discussion '${discussion.discussionName}' was deleted from active discussions.`);
      Router.push(
        `/discussion?discussionId=${
          (this.orderedActiveDiscussions[0] && this.orderedActiveDiscussions[0].discussionId) ||
          null
        }&teamId=${discussion.teamId}`,
        `/teams/${discussion.teamId}/discussions/${
          (this.orderedActiveDiscussions[0] && this.orderedActiveDiscussions[0].discussionId) ||
          null
        }`,
      );
    } else if (whichList === 'archived') {
      const discussion = this.archivedDiscussionsForUser.find(
        (d) => d.discussionId === discussionId,
      );
      this.archivedDiscussionsForUser.remove(discussion);
      notify(`The discussion '${discussion.discussionName}' was deleted from archive discussions.`);
      Router.push(
        `/discussion?discussionId=${
          (this.orderedArchivedDiscussions[0] && this.orderedArchivedDiscussions[0].discussionId) ||
          null
        }&teamId=${discussion.teamId}`,
        `/teams/${discussion.teamId}/discussions/${
          (this.orderedArchivedDiscussions[0] && this.orderedArchivedDiscussions[0].discussionId) ||
          null
        }`,
      );
    }

    // what else to update?
  }

  public async deleteDiscussionStoreMethod({
    discussionId,
    teamId,
    whichList,
  }: {
    discussionId: string;
    teamId: string;
    whichList: string;
  }) {
    await deleteDiscussionApiMethod({
      discussionId,
      socketId: (this.store.socket && this.store.socket.id) || null,
      teamId,
      whichList,
    });

    runInAction(() => {
      this.removeDiscussionFromLocalCacheStoreMethod(discussionId, whichList);
    });
  }

  public async archiveDiscussionStoreMethod({
    discussionId,
    teamId,
    action,
  }: {
    discussionId: string;
    teamId: string;
    action: string;
  }) {
    await archiveDiscussionApiMethod({
      discussionId,
      socketId: (this.store.socket && this.store.socket.id) || null,
      teamId,
      action,
    });

    if (action === 'archive') {
      const discussion = this.activeDiscussionsForUser.find((d) => d.discussionId === discussionId);
      runInAction(() => {
        this.activeDiscussionsForUser.remove(discussion);
        discussion.isDiscussionArchived = true;
        this.archivedDiscussionsForUser.push(discussion);
      });
      notify(`The discussion '${discussion.discussionName}' was archived.`);
      Router.push(
        `/discussion?discussionId=${
          (this.orderedActiveDiscussions[0] && this.orderedActiveDiscussions[0].discussionId) ||
          null
        }&teamId=${discussion.teamId}`,
        `/teams/${discussion.teamId}/discussions/${
          (this.orderedActiveDiscussions[0] && this.orderedActiveDiscussions[0].discussionId) ||
          null
        }`,
      );
    } else if (action === 'unarchive') {
      const discussion = this.archivedDiscussionsForUser.find(
        (d) => d.discussionId === discussionId,
      );
      runInAction(() => {
        this.archivedDiscussionsForUser.remove(discussion);
        discussion.isDiscussionArchived = false;
        this.activeDiscussionsForUser.push(discussion);
      });
      notify(`The discussion '${discussion.discussionName}' was unarchived.`);
      Router.push(
        `/discussion?discussionId=${
          (this.orderedArchivedDiscussions[0] && this.orderedArchivedDiscussions[0].discussionId) ||
          null
        }&teamId=${discussion.teamId}`,
        `/teams/${discussion.teamId}/discussions/${
          (this.orderedArchivedDiscussions[0] && this.orderedArchivedDiscussions[0].discussionId) ||
          null
        }`,
      );
    }
  }

  public async pinDiscussionStoreMethod(discussionId: string, teamId: string) {
    await pinDiscussionApiMethod({
      discussionId,
      teamId,
    });

    runInAction(() => {
      this.pinnedDiscussionIds.push(discussionId);
    });
  }

  public async unpinDiscussionStoreMethod(discussionId: string, teamId: string) {
    await unpinDiscussionApiMethod({
      discussionId,
      teamId,
    });

    runInAction(() => {
      this.pinnedDiscussionIds.remove(discussionId);
    });
  }

  public async readCommentStoreMethod(commentId: string, teamId: string) {
    await readCommentApiMethod({
      commentId,
      teamId,
    });

    runInAction(() => {
      this.unreadCommentIds.remove(commentId);
    });
  }

  public async unreadCommentStoreMethod(commentId: string, teamId: string) {
    await unreadCommentApiMethod({
      commentId,
      teamId,
    });

    runInAction(() => {
      this.unreadCommentIds.push(commentId);
    });
  }

  // Chats -------------------------------

  public setInitialChatsStoreMethod(initialChats) {
    const chatObjs = initialChats.map(
      (c) => new Chat({ team: this.currentTeam, store: this.store, ...c }),
    );

    this.chatsForUser.replace(chatObjs);
  }

  public async loadChatsStoreMethod({ teamId }: { teamId: string }) {
    if (this.store.isServer || this.isLoadingChats) {
      return;
    }

    this.isLoadingChats = true;

    try {
      const { chats = [] } = await getChatListApiMethod({ teamId });

      runInAction(() => {
        this.chatsForUser.clear();

        chats.forEach((c) => {
          const chatObj = this.chatsForUser.find((obj) => obj.chatId === c._id);
          if (chatObj) {
            chatObj.changeLocalCacheStoreMethod(c);
          } else {
            const newC = new Chat({ team: this.currentTeam, store: this.store, ...c });
            if (newC.chatParticipantIds.includes(this._id)) {
              this.chatsForUser.push(newC);
            }
          }
        });
      });
    } finally {
      runInAction(() => {
        this.isLoadingChats = false;
      });
    }
  }

  get orderedChats() {
    return this.chatsForUser.slice().sort((c1, c2) => {
      const isC1 = this.store.currentUser.chatsForUser.indexOf(c1);
      const isC2 = this.store.currentUser.chatsForUser.indexOf(c2);

      if (isC1 === -1 && isC2 === -1) {
        return new Date(c2.lastUpdatedAt).getTime() - new Date(c1.lastUpdatedAt).getTime();
      }

      if (isC1 !== -1 && isC2 !== -1) {
        return isC1 - isC2;
      }

      if (isC1 !== -1) {
        return -1;
      }

      return 1;
    });
  }

  public async createOrUpdateChatStoreMethod(data): Promise<Chat> {
    const { chat, initialMessages } = await createOrUpdateChatApiMethod({
      socketId: (this.store.socket && this.store.socket.id) || null,
      ...data,
    });

    if (!chat) {
      return null;
    }

    if (data.id) {
      const newObj = new Chat({
        ...chat,
        initialMessages,
        team: this.currentTeam,
        store: this.store,
      });

      runInAction(() => {
        if (
          newObj.chatParticipantIds.includes(this.store.currentUser._id) &&
          newObj.chatCreatorId === this.store.currentUser._id
        ) {
          const filteredChats = this.chatsForUser.filter((c) => c.chatId !== data.id);
          this.chatsForUser.replace(filteredChats);
          this.chatsForUser.push(newObj);
        }
      });

      return newObj;
    } else {
      return new Promise<Chat>((resolve) => {
        runInAction(() => {
          const obj = this.addChatToLocalCacheStoreMethod(chat, initialMessages);
          resolve(obj);
        });
      });
    }
  }

  public addChatToLocalCacheStoreMethod(data, initialMessages): Chat {
    const obj = new Chat({
      ...data,
      initialMessages,
      team: this.currentTeam,
      store: this.store,
    });

    if (obj.chatParticipantIds.includes(this.store.currentUser._id)) {
      this.chatsForUser.push(obj);
    }

    return obj;
  }

  // update this.unreadByUserMessageIds, this is implemented on server
  public removeChatFromLocalCacheStoreMethod(chatId: string) {
    const chat = this.chatsForUser.find((c) => c.chatId === chatId);
    this.chatsForUser.remove(chat);
    notify(`The chat was deleted.`);
    Router.push(
      `/chat?chatId=${(this.orderedChats[0] && this.orderedChats[0].chatId) || null}&teamId=${
        chat.teamId
      }`,
      `/teams/${chat.teamId}/chats/${
        (this.orderedChats[0] && this.orderedChats[0].chatId) || null
      }`,
    );
  }

  public async deleteChatStoreMethod({ chatId, teamId }: { chatId: string; teamId: string }) {
    await deleteChatApiMethod({
      chatId,
      socketId: (this.store.socket && this.store.socket.id) || null,
      teamId,
    });

    runInAction(() => {
      this.removeChatFromLocalCacheStoreMethod(chatId);
    });
  }

  public async clearChatHistoryStoreMethod({ chatId, teamId }: { chatId: string; teamId: string }) {
    await clearChatHistoryApiMethod({
      chatId,
      socketId: (this.store.socket && this.store.socket.id) || null,
      teamId,
    });

    runInAction(() => {
      const chat = this.chatsForUser.find((c) => c.chatId === chatId);
      chat.messages.clear();
    });
  }

  public async messagesWereSeenStoreMethod(messageIds: string[], teamId: string, chatId: string) {
    await messagesWereSeenApiMethod({
      messageIds,
      teamId,
      chatId,
      socketId: (this.store.socket && this.store.socket.id) || null,
    });

    runInAction(() => {
      messageIds.forEach((messageId) => this.unreadByUserMessageIds.remove(messageId));
    });
  }

  public async searchWithinChatStoreMethod({
    query,
    teamId,
    chatId,
  }: {
    query: string;
    teamId: string;
    chatId: string;
  }) {
    const { foundMessages = [] } = await searchWithinChatApiMethod({
      query,
      teamId,
      chatId,
    });

    const chatObj = this.chatsForUser.find((obj) => obj.chatId === chatId);

    const messageObjsFound = foundMessages.map(
      (m) => new Message({ chat: chatObj, team: this.currentTeam, store: this.store, ...m }),
    );

    // const messageObjsContext = contextMessages.map(
    //   (m) => new Message({ chat: chatObj, team: this.currentTeam, store: this.store, ...m }),
    // );

    // if (messageObjsContext.length > chatObj.messages.length) {
    //   chatObj.messages.replace(messageObjsContext);
    // }

    return messageObjsFound;
  }

  public async sendOnlineStatusToServerStoreMethod(status: boolean, teamId: string) {
    await sendOnlineStatusToServerApiMethod({
      status,
      teamId,
      socketId: (this.store.socket && this.store.socket.id) || null,
    });

    runInAction(() => {
      this.isTeamMemberOnline = status;
      const teamMember = this.currentTeam.teamMembers.get(this._id);
      teamMember.isTeamMemberOnline = status;
    });
  }

  public async updateTypingStatusStoreMethod(status: boolean, chatId: string, teamId: string) {
    await updateTypingStatusViaServerApiMethod({
      status,
      teamId,
      chatId,
      socketId: (this.store.socket && this.store.socket.id) || null,
    });

    this.isChatParticipantTyping = status;
  }

  public removeTeamFromLocalCacheStoreMethod(teamId: string, defaultTeamId: string) {
    const teamToDelete = this.teamsForUser.find((t) => t.teamId === teamId);
    this.teamsForUser.remove(teamToDelete);

    Router.push(
      `/settings/team-settings?teamId=${defaultTeamId}`,
      `/teams/${defaultTeamId}/settings/team-settings`,
    );
  }

  public async deleteCurrentTeamStoreMethod({ teamId }: { teamId: string }) {
    await deleteCurrentTeamApiMethod({
      socketId: (this.store.socket && this.store.socket.id) || null,
      teamId,
    });

    const defaultTeam = this.teamsForUser.find((t) => t.teamId === this.defaultTeamId);

    runInAction(() => {
      this.setCurrentTeamStoreMethod(defaultTeam.teamId);
      this.removeTeamFromLocalCacheStoreMethod(teamId, defaultTeam.teamId);
    });
  }

  public async getListOfInvoicesForAccountStoreMethod(teamId: string) {
    try {
      const { stripeListOfInvoices } = await getListOfInvoicesForAccountApiMethod(teamId);

      runInAction(() => {
        this.stripeListOfInvoices = stripeListOfInvoices || null;
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async cancelSubscriptionForTeamStoreMethod(teamId: string) {
    try {
      const { isSubscriptionActiveForAccount, stripeSubscription } =
        await cancelSubscriptionForTeamApiMethod(teamId);

      runInAction(() => {
        this.isSubscriptionActiveForAccount = isSubscriptionActiveForAccount;
        this.stripeSubscription = stripeSubscription;
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async reSubscribeTeamStoreMethod(teamId: string) {
    try {
      const { isSubscriptionActiveForAccount, stripeSubscription } = await reSubscribeTeamApiMethod(
        teamId,
      );

      runInAction(() => {
        this.isSubscriptionActiveForAccount = isSubscriptionActiveForAccount;
        this.stripeSubscription = stripeSubscription;
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export { User };
