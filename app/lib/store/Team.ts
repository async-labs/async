// in progress

import { action, computed, makeObservable, IObservableArray, observable, runInAction } from 'mobx';
import Router from 'next/router';
import notify from '../notify';

import {
  inviteMemberApiMethod,
  removeTeamMemberApiMethod,
  revokeInvitationApiMethod,
} from '../api/to-api-server-team-leader';

import { getTeamMembersApiMethod } from '../api/to-api-server-team-member';

import { Store, User } from './index';

const dev = process.env.NODE_ENV !== 'production';

const API_SERVER_ENDPOINT = dev
  ? process.env.NEXT_PUBLIC_API_SERVER_ENDPOINT
  : process.env.NEXT_PUBLIC_PRODUCTION_API_SERVER_ENDPOINT;

class Team {
  public teamId: string;
  public teamName: string;
  public teamLogoUrl: string;
  public status: string;

  public teamLeaderEmail: string;

  public idsOfTeamMembersForTeamLeader: IObservableArray<string>;
  public teamMembers: Map<string, User> = new Map();
  private isLoadingTeamMembers = false;

  public trialPeriodStartDate: Date;
  public isSubscriptionActiveForTeam: boolean;
  public isPaymentFailedForTeam: boolean;

  public removedTeamMembers: IObservableArray<{
    userName: string;
    userAvatarUrl: string;
    email: string;
    removalDate: Date;
    userId: string;
  }>;

  public store: Store;

  // check what is included into initial data on the server
  constructor(params) {
    makeObservable<Team, 'setInitialMembersStoreMethod'>(this, {
      teamId: observable,
      teamName: observable,
      teamLogoUrl: observable,
      status: observable,
      idsOfTeamMembersForTeamLeader: observable,
      teamMembers: observable,

      isSubscriptionActiveForTeam: observable,
      isPaymentFailedForTeam: observable,

      setInitialMembersStoreMethod: action,

      loadTeamMembersStoreMethod: action,
      removeTeamMemberStoreMethod: action,
      revokeInvitationStoreMethod: action,

      leaveTeamSocketRoomStoreMethod: action,
      joinTeamSocketRoomStoreMethod: action,

      handleOnlineStatusRealtimeEventStoreMethod: action,
      handleTeamDeletedRealtimeEventStoreMethod: action,

      members: computed,
    });
    this.teamId = params.teamId;
    this.teamName = params.teamName;
    this.teamLogoUrl = params.teamLogoUrl;
    this.status = params.status;

    this.teamLeaderEmail = params.teamLeaderEmail;
    this.idsOfTeamMembersForTeamLeader = params.idsOfTeamMembers;

    this.trialPeriodStartDate = params.trialPeriodStartDate;
    this.isSubscriptionActiveForTeam = params.isSubscriptionActiveForTeam;
    this.isPaymentFailedForTeam = params.isPaymentFailedForTeam;

    this.removedTeamMembers = params.removedTeamMembers;

    if (params.initialMembers) {
      this.setInitialMembersStoreMethod(params.initialMembers);
    }

    this.store = params.store;
  }

  private setInitialMembersStoreMethod(initialTeamMembers) {
    this.teamMembers.clear();

    for (const teamMember of initialTeamMembers) {
      if (this.store && this.store.currentUser && this.store.currentUser._id === teamMember._id) {
        runInAction(() => {
          this.teamMembers.set(teamMember._id, this.store.currentUser);
        });
      } else {
        runInAction(() => {
          this.teamMembers.set(
            teamMember._id,
            new User({
              store: this.store,
              ...teamMember,
              selectedTeamId: this.teamId,
            }),
          );
        });
      }
    }
  }

  public async loadTeamMembersStoreMethod() {
    if (this.store.isServer || this.isLoadingTeamMembers) {
      return;
    }

    this.isLoadingTeamMembers = true;

    try {
      const { users = [] } = await getTeamMembersApiMethod(this.teamId);

      runInAction(() => {
        if (
          users.length === 0 &&
          this.store.currentUser &&
          this.store.currentUser.email === this.teamLeaderEmail
        ) {
          this.teamMembers.clear();
          this.teamMembers.set(this.store.currentUser._id, this.store.currentUser);
        } else {
          for (const user of users) {
            this.teamMembers.set(
              user._id,
              new User({ store: this.store, ...user, selectedTeamId: this.teamId }),
            );
          }
        }

        this.isLoadingTeamMembers = false;
      });
    } catch (error) {
      runInAction(() => {
        this.isLoadingTeamMembers = false;
      });

      throw error;
    }
  }

  get members() {
    return [...this.teamMembers].map(([, value]) => ({ ...value }));
  }

  public async inviteMemberStoreMethod({ email, teamId }: { email: string; teamId: string }) {
    const { invitedUser } = await inviteMemberApiMethod({
      emailOfInvitee: email,
      teamId,
    });

    runInAction(() => {
      this.teamMembers.set(
        invitedUser._id,
        new User({
          store: this.store,
          email,
          accountCreationDate: invitedUser.accountCreationDate,
          userName: invitedUser.userName,
          userAvatarUrl: invitedUser.userAvatarUrl,
          teamForTeamMember: { status: 'invited' },
          selectedTeamId: teamId,
        }),
      ); // test
    });
  }

  public async revokeInvitationStoreMethod({ email, teamId }: { email: string; teamId: string }) {
    const { userId } = await revokeInvitationApiMethod({ revokedInvitationEmail: email, teamId });

    runInAction(() => {
      this.teamMembers.delete(userId); // fixed setInitialMembersStoreMethod
    });
  }

  public async removeTeamMemberStoreMethod({ email, teamId }: { email: string; teamId: string }) {
    const { removedTeamMember } = await removeTeamMemberApiMethod({
      removedUserEmail: email,
      teamId,
    });

    runInAction(() => {
      this.teamMembers.delete(removedTeamMember.userId); // fixed setInitialMembersStoreMethod
      this.removedTeamMembers.push(removedTeamMember);
    });
  }

  public leaveTeamSocketRoomStoreMethod() {
    if (this.store.socket) {
      this.store.socket.emit('leaveTeamRoom', this.teamId);
      this.store.socket.off('onlineStatusEvent', this.handleOnlineStatusRealtimeEventStoreMethod);
      this.store.socket.off('teamEvent', this.handleTeamDeletedRealtimeEventStoreMethod);
    }
  }

  public joinTeamSocketRoomStoreMethod() {
    if (this.store.socket) {
      this.store.socket.emit('joinTeamRoom', this.teamId);
      this.store.socket.on('onlineStatusEvent', this.handleOnlineStatusRealtimeEventStoreMethod);
      this.store.socket.on('teamEvent', this.handleTeamDeletedRealtimeEventStoreMethod);
    }
  }

  public handleOnlineStatusRealtimeEventStoreMethod = (data) => {
    const { actionType, status, userId } = data;

    if (actionType === 'edited') {
      if (this.store.currentUser._id !== userId) {
        runInAction(() => {
          const teamMember = this.teamMembers.get(userId);
          teamMember.isTeamMemberOnline = status;
        });
      }
    }
  };

  public handleTeamDeletedRealtimeEventStoreMethod = (data) => {
    const { actionType, teamId, userId } = data;

    if (actionType === 'deleted') {
      const { currentUser } = this.store;
      if (currentUser._id !== userId) {
        runInAction(() => {
          const teamToDelete = currentUser.teamsForUser.find((t) => t.teamId === teamId);
          currentUser.teamsForUser.remove(teamToDelete);

          if (currentUser.defaultTeamId !== teamId && currentUser.teamsForUser.length > 1) {
            currentUser.setCurrentTeamStoreMethod(currentUser.defaultTeamId);

            notify(
              `The current team '${teamToDelete.teamName}' was deleted by its team leader. Redirecting to your default team...`,
            );

            Router.push(
              `/settings/team-settings?teamId=${currentUser.defaultTeamId}`,
              `/teams/${currentUser.defaultTeamId}/settings/team-settings`,
            );
          } else {
            notify(
              `The current team '${teamToDelete.teamName}' was deleted by its team leader. Logging out of Async...`,
            );

            Router.push(`${API_SERVER_ENDPOINT}/logout`, `${API_SERVER_ENDPOINT}/logout`);
          }
        });
      }
    }
  };
}

export { Team };
