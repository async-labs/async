import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { inject, observer } from 'mobx-react';
import Router from 'next/router';
import NProgress from 'nprogress';
import React from 'react';

import notify from '../../lib/notify';
import { Store } from '../../lib/store';

import { getSignedRequestForPutApiMethod } from '../../lib/api/to-api-server-team-member';
import { uploadFileUsingSignedPutRequestApiMethod } from '../../lib/api/to-external-services';
import { resizeImage } from '../../lib/resizeImage';

type Props = {
  store: Store;
  onClose: () => void;
  open: boolean;
};
type State = { teamName: string; teamLogoUrl: string; disabled: boolean };

class CreateTeamModal extends React.Component<Props, State> {
  public state = { teamName: '', teamLogoUrl: '', disabled: false };

  public render() {
    const { open, store } = this.props;

    return (
      <Dialog
        onClose={this.handleClose}
        aria-labelledby="create-team-dialog-title"
        open={open}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent
          style={{
            padding: '0',
          }}
        >
          <DialogTitle id="create-team-dialog-title">Create new team</DialogTitle>
          <form onSubmit={this.onSubmit} style={{ padding: '20px' }}>
            <TextField
              autoComplete="off"
              variant="outlined"
              value={this.state.teamName}
              placeholder=""
              label="Provide team name"
              fullWidth
              onChange={(event) => {
                this.setState({ teamName: event.target.value });
              }}
            />
            <p />
            <br />
            <Avatar
              src={this.state.teamLogoUrl}
              sx={{
                display: 'inline-flex',
                verticalAlign: 'middle',
                marginRight: '20px',
              }}
            />
            <label htmlFor="upload-file-create-team">
              <Button
                variant="contained"
                color="primary"
                component="span"
                disabled={this.state.disabled}
              >
                Add logo
              </Button>
            </label>
            <input
              accept="image/*"
              id="upload-file-create-team"
              type="file"
              style={{ display: 'none' }}
              onChange={this.previewSelectedLogo}
            />
            <p />
            <br />
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
              Create new team
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  public handleClose = () => {
    this.setState({ teamName: '', disabled: false });
    this.props.onClose();
  };

  private previewSelectedLogo = async () => {
    const fileElm = document.getElementById('upload-file-create-team') as HTMLFormElement;
    const file: File = fileElm.files[0];

    if (file == null) {
      notify('No file selected for upload.');
      return;
    }

    const src = URL.createObjectURL(file);

    this.setState({ teamLogoUrl: src });
  };

  public onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { store } = this.props;
    const { currentUser } = store;

    const { teamName, teamLogoUrl } = this.state;

    if (!teamName || !teamLogoUrl) {
      notify('Team name and team logo is required');
      return;
    }

    if (teamName.length > 20) {
      notify('Team name should not exceed 20 characters.');
      return;
    }

    const fileElm = document.getElementById('upload-file-create-team') as HTMLFormElement;
    const file: File = fileElm.files[0];

    if (file == null) {
      notify('No file selected for upload.');
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      const teamId = await currentUser.createNewTeamStoreMethod({
        teamName,
        teamLogoUrl: '',
      });

      const { returnedDataFromS3 } = await getSignedRequestForPutApiMethod({
        file,
        teamId,
        discussionId: null,
        commentId: null,
        chatId: null,
        messageId: null,
        socketId: null,
      });

      const resizedFile = await resizeImage(file, 128, 128);

      await uploadFileUsingSignedPutRequestApiMethod(
        resizedFile,
        returnedDataFromS3.signedRequest,
        { 'Cache-Control': 'max-age=2592000' }, // review number
      );

      await currentUser.createOrUpdateTeamStoreMethod({
        teamName,
        teamLogoUrl: returnedDataFromS3.url,
        teamId,
      });

      this.props.onClose();

      Router.push(
        `/settings/team-settings?teamId=${teamId}`,
        `/teams/${teamId}/settings/team-settings`,
      );
      notify(`You created a new team.`);
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.setState({ disabled: false, teamName: '', teamLogoUrl: '' });
      NProgress.done();
    }
  };
}

export default inject('store')(observer(CreateTeamModal));
