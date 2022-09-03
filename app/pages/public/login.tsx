// should show error when Team does not exist (or was deleted)
// see Express route `/login/teams/:teamSlug`

import Avatar from '@mui/material/Avatar';
import { observer } from 'mobx-react';
// import localForage from 'localforage';
import Head from 'next/head';
import React from 'react';

import LoginForm from '../../components/common/LoginForm';
// import { Store } from '../../lib/store';
import notify from '../../lib/notify';
import { getTeamDataApiMethod } from '../../lib/api/to-api-server-public';

type Props = {
  errorProp?: string;
  showDarkTheme: boolean;
  isMobile: boolean;
  teamId: string;
  teamName: string;
  teamLogoUrl: string;
  // store: Store;
};

class Login extends React.Component<Props> {
  public static async getInitialProps(ctx) {
    const { teamId, error } = ctx.query;

    const { teamName, teamLogoUrl, errorFromServer } = await getTeamDataApiMethod(teamId);

    return { teamId, teamName, teamLogoUrl, errorProp: teamId ? errorFromServer : error };
  }

  public async componentDidMount() {
    const { errorProp } = this.props;

    console.log(errorProp);

    if (errorProp && errorProp === 'no-team') {
      notify(
        'Team or team profile does not exist.  Please ask Team Leader to send you a new invitation link.',
      );
    }

    if (errorProp && errorProp === 'Invitation link has expired.') {
      notify('Invitation link has expired.');
    }
  }

  public render() {
    const { teamId, teamName, teamLogoUrl, errorProp, isMobile } = this.props;

    let isButtonDisabled = true;

    if (teamId && teamName && teamLogoUrl) {
      isButtonDisabled = false;
    } else if (!teamId) {
      isButtonDisabled = false;
    }

    return (
      <div style={{ textAlign: 'center', margin: '0 20px' }}>
        <Head>
          <title>Log in to Async</title>
        </Head>
        <br />
        {teamId && teamName && teamLogoUrl ? (
          <>
            <h1
              style={{
                margin: isMobile ? '20px auto 60px auto' : '80px auto 60px auto',
                fontWeight: 400,
              }}
            >
              Accept invitation to {teamName ? teamName : ''}
            </h1>
            <Avatar
              src={teamLogoUrl}
              alt={teamName}
              sx={{
                display: 'block',
                margin: '20px auto 40px auto',
                width: '60px',
                height: '60px',
              }}
            />
          </>
        ) : (
          <>
            {errorProp && errorProp === 'no-team' ? (
              <h1
                style={{
                  margin: isMobile ? '20px auto 60px auto' : '80px auto 60px auto',
                  fontWeight: 400,
                }}
              >
                Accept invitation: team or team profile does not exist.
              </h1>
            ) : (
              <h1
                style={{
                  margin: isMobile ? '20px auto 60px auto' : '80px auto 60px auto',
                  fontWeight: 400,
                }}
              >
                Log in to Async
              </h1>
            )}
          </>
        )}

        <p />
        <br />

        <LoginForm
          buttonText={teamId ? `Log in or sign up to accept invitation` : 'Log in'}
          disabled={isButtonDisabled}
          isMobile={this.props.isMobile}
          teamId={this.props.teamId}
        />
        <p />
      </div>
    );
  }
}

export default observer(Login);
