import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

import { inject, observer } from 'mobx-react';
import moment from 'moment';
import NProgress from 'nprogress';
import React from 'react';

import notify from '../../lib/notify';
import { Store } from '../../lib/store';

type Props = {
  store: Store;
  onClose: () => void;
  open: boolean;
  teamId: string;
};
type State = { email: string; disabled: boolean };

class InviteMemberModal extends React.Component<Props, State> {
  public state = { email: '', disabled: false };

  public render() {
    const { open, store } = this.props;

    return (
      <Dialog
        onClose={this.handleClose}
        aria-labelledby="invite-member-dialog-title"
        open={open}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent
          style={{
            padding: '0',
          }}
        >
          <DialogTitle id="invite-member-dialog-title">Invite new member</DialogTitle>
          <form onSubmit={this.onSubmit} style={{ padding: '20px' }}>
            <TextField
              autoComplete="off"
              variant="outlined"
              value={this.state.email}
              placeholder="Provide email of invitee"
              label="Email of invitee"
              fullWidth
              onChange={(event) => {
                this.setState({ email: event.target.value });
              }}
            />
            <p />
            <br />
            <Button
              variant="outlined"
              onClick={this.handleClose}
              disabled={this.state.disabled}
              style={{
                color: store.currentUser.showDarkTheme ? '#fff' : '#000',
                border: store.currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
              }}
            >
              Cancel
            </Button>{' '}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={this.state.disabled}
            >
              Invite
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  public handleClose = () => {
    this.setState({ email: '', disabled: false });
    this.props.onClose();
  };

  public onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { store, teamId } = this.props;
    const { currentTeam } = store.currentUser;

    const { email } = this.state;

    if (!email) {
      notify('Email is required');
      return;
    }

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
      notify('Invalid email address');
      return;
    }

    if (
      currentTeam &&
      moment(new Date()).isBefore(moment(currentTeam.trialPeriodStartDate).add(30, 'days')) &&
      !currentTeam.isSubscriptionActiveForTeam
    ) {
      // notify(
      //   `Free trial period expires ${moment(currentTeam.trialPeriodStartDate)
      //     .add(30, 'days')
      //     .from(moment(new Date()))} for this team.`,
      // );
    } else if (
      currentTeam &&
      moment(new Date()).isAfter(moment(currentTeam.trialPeriodStartDate).add(30, 'days')) &&
      !currentTeam.isSubscriptionActiveForTeam
    ) {
      notify(
        'This action cannot be performed. Free trial period has expired for the account that owns this team. And that account is not subscribed to a paid plan.',
      );
      return;
    }

    const matchingTeamMember = currentTeam.members.find((m) => {
      return m.email === email;
    });

    if (matchingTeamMember || store.currentUser.email === email) {
      notify('Your team already has team member with this email.');
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentTeam.inviteMemberStoreMethod({ email, teamId });

      notify(`You sent invitation to ${email}`);
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.props.onClose();
      this.setState({ disabled: false, email: '' });
      NProgress.done();
    }
  };
}

export default inject('store')(observer(InviteMemberModal));
