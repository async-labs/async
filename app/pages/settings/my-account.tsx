import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { observer } from 'mobx-react';
import Head from 'next/head';
import NProgress from 'nprogress';
import * as React from 'react';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import moment from 'moment';

import Layout from '../../components/layout';
import SettingsMenu from '../../components/settings/SettingsMenu';
import notify from '../../lib/notify';
import { Store } from '../../lib/store';
import { getSignedRequestForPutApiMethod } from '../../lib/api/to-api-server-team-member';
import { uploadFileUsingSignedPutRequestApiMethod } from '../../lib/api/to-external-services';
import { resizeImage } from '../../lib/resizeImage';

// const dev = process.env.NODE_ENV !== 'production';

type MyProps = {
  store: Store;
  message?: string;
  isMobile: boolean;
  apiEndpoint: string;
  teamId: string;
};

type MyState = {
  newUserName: string;
  newUserAvatarUrl: string;
  disabled: boolean;
  showData: boolean;
  data: string;
  disabledForDefaultTeam: boolean;
  disabledForUserName: boolean;
  disabledForUserAvatar: boolean;
  disabledForTheme: boolean;
  selectedTeamId: string;
  selectedTheme: string;
  disabledForCard: boolean;
};

class MyAccountPage extends React.Component<MyProps, MyState> {
  public static getInitialProps({ query }) {
    const { message } = query;

    return { message };
  }

  constructor(props: MyProps) {
    super(props);

    this.state = {
      newUserName: this.props.store.currentUser.userName || '',
      newUserAvatarUrl: this.props.store.currentUser.userAvatarUrl || '',
      showData: false,
      data: '',
      disabled: false,
      disabledForDefaultTeam: false,
      disabledForUserName: false,
      disabledForUserAvatar: false,
      disabledForTheme: false,
      selectedTeamId: this.props.store.currentUser.defaultTeamId || null,
      selectedTheme: this.props.store.currentUser.showDarkTheme ? 'dark' : 'light',
      disabledForCard: false,
    };
  }

  public componentDidMount() {
    const { message } = this.props;

    if (message) {
      notify(message);
    }
  }

  public render() {
    const { isMobile, store } = this.props;
    const { currentUser } = store;
    const { newUserName, newUserAvatarUrl } = this.state;

    const arrayOfMenuItems = [
      {
        text: 'My Account',
        href: `/settings/my-account`,
        as: `/settings/my-account`,
      },
      {
        text: `My Billing`,
        href: `/settings/my-billing`,
        as: `/settings/my-billing`,
      },
    ];

    return (
      <Layout {...this.props}>
        <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
          <Head>
            <title>My Account</title>
            <meta name="description" content="description" />
          </Head>
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
            }}
          >
            <Grid item sm={2} xs={12} style={{ padding: '10px', borderRight: '1px solid #828282' }}>
              <SettingsMenu
                store={store}
                isMobile={isMobile}
                teamId={this.props.teamId}
                arrayOfMenuItems={arrayOfMenuItems}
              />
            </Grid>
            <Grid
              item
              sm={10}
              xs={12}
              style={{
                padding: '20px',
                marginTop: isMobile ? '20px' : 'none',
                borderTop: isMobile ? '1px solid #828282' : 'none',
                borderRight: isMobile ? 'none' : '1px solid #828282',
              }}
            >
              <div
                style={{
                  padding: isMobile ? '0px' : '0px 10px',
                }}
              >
                <h1>Settings {'>'} My Account</h1>
                <div style={{ padding: '20px 10px' }}>
                  You created your account at Async on{' '}
                  <b>{moment(currentUser.accountCreationDate).format('MMM Do YYYY')}</b> using email
                  address <b>{currentUser.email}</b>. <p /> You cannot change your email address but
                  you can request us to delete your account.
                </div>
                <p />
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell variant="head">Default team</TableCell>
                      <TableCell variant="head" align="center" style={{ display: 'none' }}>
                        Edit/Save button
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    <TableRow>
                      <TableCell
                        style={{
                          display: isMobile ? 'block' : null,
                          alignItems: 'center',
                        }}
                      >
                        <FormControl
                          variant="outlined"
                          style={{
                            margin: isMobile ? '0px' : '10px 20px',
                            minWidth: '320px',
                          }}
                          disabled={!this.state.disabledForDefaultTeam}
                        >
                          <InputLabel id="default-team-select-outlined-label">
                            Default team
                          </InputLabel>

                          <Select
                            labelId="default-team-select-outlined-label"
                            label="Default team"
                            id="default-team-select-outlined"
                            value={this.state.selectedTeamId}
                            onChange={(event) =>
                              this.setState({ selectedTeamId: event.target.value as string })
                            }
                          >
                            {currentUser &&
                              currentUser.teamsForUser.map((team) => (
                                <MenuItem key={team.teamId} value={team.teamId}>
                                  <Avatar
                                    src={team.teamLogoUrl}
                                    sx={{
                                      margin: '5px 10px 5px 0px',
                                      verticalAlign: 'middle',
                                    }}
                                  />{' '}
                                  {team.teamName}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                        <div
                          style={{
                            width: '100%',
                            marginTop: isMobile ? '20px' : '10px',
                          }}
                        >
                          <InfoOutlinedIcon
                            style={{
                              opacity: '60%',
                              marginRight: '5px',
                              fontSize: '20px',
                              verticalAlign: 'middle',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '13px',
                              opacity: '75%',
                            }}
                          >
                            Select team to be default. Default team is automatically loaded when you
                            log in to your Async account.
                          </span>
                        </div>
                      </TableCell>
                      <TableCell style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: isMobile ? 'block' : 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Button
                            variant="outlined"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={() => this.setState({ disabledForDefaultTeam: false })}
                            style={{
                              display: this.state.disabledForDefaultTeam ? 'inherit' : 'none',
                              marginRight: '20px',
                              color: currentUser.showDarkTheme ? '#fff' : '#000',
                              border: currentUser.showDarkTheme
                                ? '1px solid #fff'
                                : '1px solid #000',
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={
                              this.state.disabledForDefaultTeam
                                ? this.makeTeamDefault
                                : () => this.setState({ disabledForDefaultTeam: true })
                            }
                          >
                            {this.state.disabledForDefaultTeam ? 'Make default' : 'Edit'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p />
                <br />
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell variant="head">Account profile</TableCell>
                      <TableCell variant="head" align="center" style={{ display: 'none' }}>
                        Edit/Save button
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    <TableRow>
                      <TableCell
                        style={{
                          display: isMobile ? 'block' : null,
                          alignItems: 'center',
                        }}
                      >
                        <TextField
                          disabled={!this.state.disabledForUserName}
                          autoComplete="off"
                          value={newUserName}
                          onChange={(event) => this.setState({ newUserName: event.target.value })}
                          label="Username"
                          placeholder="Provide username"
                          variant="outlined"
                          style={{
                            fontFamily: 'Roboto, sans-serif',
                            margin: isMobile ? '0px' : '10px 20px',
                          }}
                        />
                      </TableCell>
                      <TableCell
                        style={{
                          width: isMobile ? '25%' : '300px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            display: isMobile ? 'block' : 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Button
                            variant="outlined"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={() => this.setState({ disabledForUserName: false })}
                            style={{
                              display: this.state.disabledForUserName ? 'inherit' : 'none',
                              marginRight: '20px',
                              color: currentUser.showDarkTheme ? '#fff' : '#000',
                              border: currentUser.showDarkTheme
                                ? '1px solid #fff'
                                : '1px solid #000',
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={
                              this.state.disabledForUserName
                                ? this.updateUserProfile
                                : () => this.setState({ disabledForUserName: true })
                            }
                          >
                            {this.state.disabledForUserName ? 'Save' : 'Edit'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{
                          display: isMobile ? 'block' : null,
                          alignItems: 'center',
                        }}
                      >
                        <Avatar
                          src={newUserAvatarUrl}
                          sx={{
                            display: 'inline-flex',
                            verticalAlign: 'middle',
                            margin: isMobile ? '0px' : '10px 20px 10px 20px',
                          }}
                        />
                        {/* <TextField
                          disabled
                          value={this.state.newUserAvatarUrl}
                          label="User avatar URL"
                          placeholder="Upload image"
                          variant="outlined"
                          style={{
                            fontFamily: 'Roboto, sans-serif',
                            margin: isMobile ? '0px' : '10px 20px 10px 16px',
                            width: isMobile ? '100%' : 'calc(100% - 70px)',
                          }}
                        /> */}
                      </TableCell>
                      <TableCell style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: isMobile ? 'block' : 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Button
                            variant="outlined"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={() => this.setState({ disabledForUserAvatar: false })}
                            style={{
                              display: this.state.disabledForUserAvatar ? 'inherit' : 'none',
                              marginRight: '20px',
                              color: currentUser.showDarkTheme ? '#fff' : '#000',
                              border: currentUser.showDarkTheme
                                ? '1px solid #fff'
                                : '1px solid #000',
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            component="span"
                            disabled={this.state.disabled}
                            onClick={() => this.setState({ disabledForUserAvatar: true })}
                            style={{
                              display: this.state.disabledForUserAvatar ? 'none' : 'inherit',
                            }}
                          >
                            Edit
                          </Button>
                          <label htmlFor="upload-file-user-avatar">
                            <Button
                              variant="contained"
                              color="primary"
                              component="span"
                              disabled={this.state.disabled}
                              style={{
                                display: this.state.disabledForUserAvatar ? 'inherit' : 'none',
                              }}
                            >
                              Upload image
                            </Button>
                          </label>
                          <input
                            accept="image/*"
                            id="upload-file-user-avatar"
                            type="file"
                            style={{ display: 'none' }}
                            onChange={
                              this.state.disabledForUserAvatar
                                ? this.uploadFile
                                : () => this.setState({ disabledForUserAvatar: true })
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{
                          display: isMobile ? 'block' : null,
                          alignItems: 'center',
                        }}
                      >
                        <FormControl
                          variant="outlined"
                          style={{
                            margin: isMobile ? '0px' : '10px 20px',
                          }}
                          disabled={!this.state.disabledForTheme}
                        >
                          <InputLabel id="theme-select-outlined-label">Theme</InputLabel>
                          <Select
                            labelId="theme-select-outlined-label"
                            label="theme"
                            id="theme-select-outlined"
                            value={this.state.selectedTheme}
                            onChange={(event) =>
                              this.setState({ selectedTheme: event.target.value as string })
                            }
                          >
                            <MenuItem value="dark">Dark</MenuItem>
                            <MenuItem value="light">Light</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: isMobile ? 'block' : 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Button
                            variant="outlined"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={() => this.setState({ disabledForTheme: false })}
                            style={{
                              display: this.state.disabledForTheme ? 'inherit' : 'none',
                              marginRight: '20px',
                              color: currentUser.showDarkTheme ? '#fff' : '#000',
                              border: currentUser.showDarkTheme
                                ? '1px solid #fff'
                                : '1px solid #000',
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={this.state.disabled}
                            onClick={
                              this.state.disabledForTheme
                                ? this.toggleTheme
                                : () => this.setState({ disabledForTheme: true })
                            }
                          >
                            {' '}
                            {this.state.disabledForTheme ? 'Save' : 'Edit'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <p />
                <br />
              </div>
              <br />
            </Grid>
          </Grid>
        </div>
      </Layout>
    );
  }

  // private handleCopyUrl = async (value) => {
  //   try {
  //     if (window.navigator) {
  //       await window.navigator.clipboard.writeText(value);
  //       notify('You copied value to your clipboard.');
  //     }
  //   } catch (err) {
  //     notify(err);
  //   }
  // };

  private makeTeamDefault = async () => {
    const { teamId, store } = this.props;
    const { currentUser } = store;

    const { selectedTeamId } = this.state;

    if (!selectedTeamId) {
      notify('No team is selected.');
      return;
    }

    if (selectedTeamId === currentUser.defaultTeamId) {
      notify('Selected team is already default.');
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentUser.makeTeamDefaultStoreMethod(teamId, selectedTeamId);

      notify('You set default team.');
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false, disabledForDefaultTeam: false });
      NProgress.done();
    }
  };

  private updateUserProfile = async () => {
    const { currentUser } = this.props.store;

    const { newUserName, newUserAvatarUrl } = this.state;

    if (!newUserName) {
      notify('Name is required');
      return;
    }

    NProgress.start();

    try {
      this.setState({ disabled: true });

      await currentUser.updateUserProfileStoreMethod({
        userName: newUserName,
        userAvatarUrl: newUserAvatarUrl,
        teamId: this.props.teamId,
      });
      NProgress.done();
      notify('You updated user profile.');
    } catch (error) {
      NProgress.done();
      notify(error);
    } finally {
      this.setState({ disabled: false, disabledForUserName: false });
    }
  };

  private uploadFile = async () => {
    const { store } = this.props;
    const { currentUser } = store;

    const fileElm = document.getElementById('upload-file-user-avatar') as HTMLFormElement;
    const file: File = fileElm.files[0];

    if (file == null) {
      notify('No file selected for upload.');
      return;
    }

    if (!file.type) {
      notify('This file has no type.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      notify('This file is not image type.');
      return;
    }

    if (file.size / 1000000 > 5) {
      notify('This file size is over 5MB.');
      return;
    }

    NProgress.start();
    fileElm.value = '';
    this.setState({ disabled: true });

    try {
      const { returnedDataFromS3 } = await getSignedRequestForPutApiMethod({
        file,
        teamId: this.props.teamId,
        discussionId: null,
        commentId: null,
        chatId: null,
        messageId: null,
        socketId: (store.socket && store.socket.id) || null,
      });

      const resizedFile = await resizeImage(file, 128, 128);

      await uploadFileUsingSignedPutRequestApiMethod(
        resizedFile,
        returnedDataFromS3.signedRequest,
        { 'Cache-Control': 'max-age=2592000' },
      );

      this.setState({ newUserAvatarUrl: returnedDataFromS3.url });

      await currentUser.updateUserProfileStoreMethod({
        userName: this.state.newUserName,
        userAvatarUrl: this.state.newUserAvatarUrl,
        teamId: this.props.teamId,
      });

      notify('You uploaded new avatar.');
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false, disabledForUserAvatar: false });
      NProgress.done();
    }
  };

  private toggleTheme = async () => {
    const { store } = this.props;
    const { currentUser } = store;
    const { selectedTheme } = this.state;

    NProgress.start();
    this.setState({ disabled: true });

    notify('Please wait for page reload to complete.');

    try {
      await currentUser.toggleThemeStoreMethod({
        showDarkTheme: selectedTheme === 'dark' ? true : false,
        teamId: this.props.teamId,
      });

      window.location.reload();
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };
}

export default observer(MyAccountPage);
