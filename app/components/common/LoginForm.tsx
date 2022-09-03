import React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import NProgress from 'nprogress';

import { registerOrLogInApiMethod } from '../../lib/api/to-api-server-public';

import notify from '../../lib/notify';

// pass disabled prop from Register page

type Props = {
  disabled: boolean;
  buttonText: string;
  isMobile: boolean;
  teamId: string;
};

type State = { email: string; disabled: boolean };

class LoginForm extends React.PureComponent<Props, State> {
  constructor(props) {
    super(props);

    this.state = { email: '', disabled: this.props.disabled };
  }

  public render() {
    const { teamId, isMobile } = this.props;

    return (
      <form
        autoComplete="off"
        onSubmit={this.onSubmit}
        style={{ width: this.props.isMobile ? '100%' : '400px', margin: '0 auto' }}
      >
        <p />
        <TextField
          autoComplete="off"
          type="email"
          label="Email address"
          variant="outlined"
          value={this.state.email}
          disabled={teamId ? this.state.disabled : false}
          onChange={(event) => {
            this.setState({ email: event.target.value });
          }}
          style={{
            width: this.props.isMobile ? '95%' : '400px',
            fontFamily: 'Roboto, sans-serif',
            marginTop: '10px',
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
            Only existing users of Async can use this page.
          </li>
          <li
            style={{
              textAlign: 'left',
              opacity: 0.75,
              margin: '10px 0px',
            }}
          >
            If you do not have an Async account and you would like to create your own team, please
            use the <Link href="/register">Register page</Link>.
          </li>
          <li
            style={{
              textAlign: 'left',
              opacity: 0.75,
              marginBottom: '10px',
            }}
          >
            If you are invited to join a team at Async, please use the invitation link from your
            invitation email.
          </li>
          <li
            style={{
              textAlign: 'left',
              opacity: 0.75,
              margin: '10px 0px',
            }}
          >
            After successful login, you will be logged-in for 14 days unless you log out manually.
          </li>
        </ul>
        <Button variant="contained" color="primary" type="submit" disabled={this.state.disabled}>
          {this.props.buttonText}
        </Button>
        <p />
        <br />
      </form>
    );
  }

  private onSubmit = async (event) => {
    event.preventDefault();
    const { email } = this.state;
    const { teamId } = this.props;

    if (!email) {
      notify('Please provide email address to log in.');
      return;
    } else {
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
        notify('Invalid email address');
        return;
      }

      NProgress.start();
      this.setState({ disabled: true });

      try {
        const response = await registerOrLogInApiMethod({
          email,
          teamId,
          isLoginEvent: true,
        });

        if (response.error) {
          notify(response.error);
          return;
        }

        notify('Success. Please check your email inbox for login link.');
      } catch (error) {
        console.log(error);
        notify(error);
      } finally {
        this.setState({ email: '', disabled: false });
        NProgress.done();
      }
    }
  };
}

export default LoginForm;
