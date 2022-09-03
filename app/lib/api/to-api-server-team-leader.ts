import sendRequestAndGetResponse from './sendRequestAndGetResponse';
// import { isTrialPeriodOverApiMethod } from './to-external-services';

const API_ENDPOINT = '/api/v1/to-api-server/team-leader';

const type = 'apiServer';

// returns done: 1
export const createOrUpdateTeamProfileApiMethod = ({
  teamName,
  teamLogoUrl,
  teamId,
}: {
  teamName: string;
  teamLogoUrl: string;
  teamId?: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/create-or-update-team`, {
    type,
    teamId,
    body: JSON.stringify({ teamName, teamLogoUrl }),
  });

// when user logs in, change status: invited -> status: team-member
export const inviteMemberApiMethod = ({
  emailOfInvitee,
  teamId,
}: {
  emailOfInvitee: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/invite-member`, {
    type,
    teamId,
    body: JSON.stringify({ emailOfInvitee }),
  });

// returns done: 1
// remove User MongoDB document
export const removeTeamMemberApiMethod = ({
  removedUserEmail,
  teamId,
}: {
  removedUserEmail: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/remove-team-member`, {
    type,
    teamId,
    body: JSON.stringify({ removedUserEmail }),
  });

// returns done: 1
// remove User MongoDB document
export const revokeInvitationApiMethod = ({
  revokedInvitationEmail,
  teamId,
}: {
  revokedInvitationEmail: string;
  teamId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/revoke-invitation`, {
    type,
    teamId,
    body: JSON.stringify({ revokedInvitationEmail }),
  });

export const fetchCheckoutSessionApiMethod = ({ teamId, mode }: { teamId: string; mode: string }) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/stripe/fetch-checkout-session`, {
    type,
    teamId,
    body: JSON.stringify({ mode }),
  });

export const getListOfInvoicesForAccountApiMethod = (teamId: string) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/stripe/get-list-of-invoices-for-account`, {
    type,
    teamId,
    method: 'GET',
  });

export const cancelSubscriptionForTeamApiMethod = (teamId: string) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/stripe/cancel-subscription-for-account`, {
    type,
    teamId,
  });

export const reSubscribeTeamApiMethod = (teamId: string) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/stripe/re-subscribe-account`, {
    type,
    teamId,
  });

// returns done: 1
export const deleteCurrentTeamApiMethod = ({
  teamId,
  socketId,
}: {
  teamId: string;
  socketId: string;
}) =>
  sendRequestAndGetResponse(`${API_ENDPOINT}/user/delete-team`, {
    type,
    teamId,
    body: JSON.stringify({ socketId }),
  });
