import sendRequestAndGetResponse from './sendRequestAndGetResponse';

const BASE_PATH = '/api/v1/to-api-server/public';
const type = 'apiServer';

// private-api/server/passwordless.ts
// returns done: 1
// add emailOfTL
export const registerOrLogInApiMethod = ({
  email,
  invitationToken,
  isLoginEvent,
  teamId,
}: {
  email: string;
  invitationToken?: string;
  isLoginEvent: boolean;
  teamId?: string;
}) =>
  sendRequestAndGetResponse('/auth/send-token', {
    type,
    teamId,
    body: JSON.stringify({
      user: email,
      invitationToken,
      isLoginEvent,
    }),
  });

// returns { user }
export const getUserFromApiServerApiMethod = (request) =>
  sendRequestAndGetResponse(`${BASE_PATH}/get-user`, {
    request,
    teamId: null,
    method: 'GET',
    type,
  });

// private-api/server/api/public.ts
// returns allEmails
export const getTeamDataApiMethod = (teamId: string) =>
  sendRequestAndGetResponse(`${BASE_PATH}/get-team-data-for-invitation-page`, {
    type,
    teamId,
    method: 'GET',
  });

// private-api/server/api/public.ts
// returns team
export const acceptAndGetTeamByTokenApiMethod = (token: string, req: any) =>
  sendRequestAndGetResponse(`${BASE_PATH}/invitations/accept-and-get-team-by-token`, {
    type,
    method: 'GET',
    qs: { token },
    request: req,
  });

// private-api/server/api/public.ts
// returns done: 1
export const removeInvitationIfMemberAddedApiMethod = (token: string) =>
  sendRequestAndGetResponse(`${BASE_PATH}/invitations/remove-invitation-if-team-member-added`, {
    type,
    body: JSON.stringify({ token }),
  });
