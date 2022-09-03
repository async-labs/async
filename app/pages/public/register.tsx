import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { observer } from 'mobx-react';
import Head from 'next/head';
import Link from 'next/link';
import NProgress from 'nprogress';
import React from 'react';

import notify from '../../lib/notify';
import { registerOrLogInApiMethod } from '../../lib/api/to-api-server-public';

type Props = {
  error?: string;
  showDarkTheme: boolean;
  isMobile: boolean;
};

type State = {
  disabled: boolean;
  email: string;
};

class RegisterPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      disabled: false,
      email: '',
    };
  }

  public render() {
    const { isMobile } = this.props;

    return (
      <div style={{ textAlign: 'center', margin: '0 20px' }}>
        <Head>
          <title>Register at Async</title>
          <meta name="description" content="Signup page for Async." />
        </Head>
        <br />
        <h1
          style={{
            margin: isMobile ? '20px auto 40px auto' : '80px auto 40px auto',
            fontWeight: 400,
          }}
        >
          Register at Async
        </h1>
        <Avatar
          src="https://private-api-bucket-for-async.s3.amazonaws.com/team-fjn8q2oftfxpfqhk65lsn4v6uyjbzayt/avatars/user-6116878196f2ac7b58b5f778/z7c3tm4mmpin5xbg1smo/async.png"
          sx={{
            display: 'block',
            margin: '20px auto 40px auto',
            width: '60px',
            height: '60px',
          }}
        />
        <p />

        <form
          onSubmit={this.handleRegistration}
          autoComplete="off"
          style={{ width: isMobile ? '100%' : '400px', margin: '0 auto' }}
        >
          <p />
          <p style={{ textAlign: 'left', fontSize: '14px' }}>Email address</p>
          <TextField
            autoComplete="off"
            value={this.state.email}
            onChange={(event) => this.setState({ email: event.target.value })}
            label="Email address"
            variant="outlined"
            style={{
              width: isMobile ? '100%' : '400px',
              fontFamily: 'Roboto, sans-serif',
              marginBottom: '10px',
            }}
          />
          <p />
          <br />
          <ul style={{ display: 'table', margin: isMobile ? '20px' : '20px auto', padding: 0 }}>
            <li
              style={{
                textAlign: 'left',
                opacity: 0.75,
              }}
            >
              Only use this page if you do not have an Async account and would like to create your
              own team.
            </li>
            <li
              style={{
                textAlign: 'left',
                opacity: 0.75,
                margin: '10px 0px',
              }}
            >
              If you are an existing user, please use the <Link href="/login">Login page</Link> to
              log in. After logging in, you can create a new team if you like.
            </li>
            <li
              style={{
                textAlign: 'left',
                opacity: 0.75,
                marginBottom: '10px',
              }}
            >
              If you were invited to join a team at Async, please use the invitation link from the
              invitation email you received.
            </li>
            <li
              style={{
                textAlign: 'left',
                opacity: 0.75,
                margin: '10px 0px',
              }}
            >
              After successful registration, you will be logged-in for 14 days unless you log out
              manually.
            </li>
          </ul>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={this.state.disabled}
            style={{ margin: '10px' }}
          >
            Register at Async
          </Button>
        </form>
        <p />
        <br />
      </div>
    );
  }

  private handleRegistration = async (event) => {
    event.preventDefault();
    const { email } = this.state;

    if (!email) {
      notify('Please provide email address to register.');
    } else {
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
        notify('Invalid email address');
        return;
      }

      NProgress.start();
      this.setState({ disabled: true });

      try {
        await registerOrLogInApiMethod({
          email,
          invitationToken: '',
          isLoginEvent: false,
        });

        notify('To complete registration, check your email and click on the registration link.');
      } catch (error) {
        notify(error);
      } finally {
        this.setState({ disabled: false });
        NProgress.done();
      }
    }
  };
}

export default observer(RegisterPage);
