import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import moment from 'moment';
// import { observer } from 'mobx-react';
import Head from 'next/head';
import NProgress from 'nprogress';
import * as React from 'react';

import Layout from '../../components/layout';
import InviteMemberModal from '../../components/teams/InviteMemberModal';
import SettingsMenu from '../../components/settings/SettingsMenu';
import confirm from '../../lib/confirm';
import notify from '../../lib/notify';
import { Store } from '../../lib/store';
import { getSignedRequestForPutApiMethod } from '../../lib/api/to-api-server-team-member';
import { uploadFileUsingSignedPutRequestApiMethod } from '../../lib/api/to-external-services';
import { resizeImage } from '../../lib/resizeImage';

type Props = {
  store: Store;
  error?: string;
  isMobile: boolean;
  teamId: string;
};

type State = {
  newTeamName: string;
  newTeamLogoUrl: string;
  showData: boolean;
  data: string;
  value: number;
  disabled: boolean;
  disabledForTeamName: boolean;
  disabledForTeamLogo: boolean;
  inviteMemberOpen: boolean;
};

class TeamSettingsPage extends React.Component<Props, State> {
  public static getInitialProps({ query }) {
    const { error } = query;

    return { error };
  }

  constructor(props: Props) {
    super(props);

    this.state = {
      // populate leaderOfTeam for newly signed up user
      newTeamName: this.props.store.currentUser.currentTeam.teamName || '',
      newTeamLogoUrl: this.props.store.currentUser.currentTeam.teamLogoUrl || '', // add default value
      showData: false,
      data: '',
      value: 0,
      disabled: false,
      disabledForTeamName: false,
      disabledForTeamLogo: false,
      inviteMemberOpen: false,
    };
  }

  public componentDidMount() {
    const { error, teamId, store } = this.props;

    if (error) {
      notify(error);
    }

    if (teamId) {
      store.currentUser.setCurrentTeamStoreMethod(teamId);
      this.setState({
        newTeamName: store.currentUser.currentTeam.teamName,
        newTeamLogoUrl: store.currentUser.currentTeam.teamLogoUrl,
      });
    }
  }

  public componentDidUpdate(prevProps: Props) {
    const { teamId, store } = this.props;

    if (teamId && prevProps.teamId && prevProps.teamId !== teamId) {
      store.currentUser.setCurrentTeamStoreMethod(teamId);

      this.setState({
        newTeamName: store.currentUser.currentTeam.teamName,
        newTeamLogoUrl: store.currentUser.currentTeam.teamLogoUrl,
      });
    }
  }

  // private handleChange = (event, value) => {
  //   event.preventDefault();
  //   this.setState({ value });
  // };

  public render() {
    const { isMobile, store, teamId } = this.props;
    const { currentUser } = store;
    const { currentTeam } = currentUser;
    const { newTeamLogoUrl } = this.state;

    const arrayOfMenuItems = [
      {
        text: currentTeam.teamName,
        href: `/settings/team-settings?teamId=${teamId}`,
        as: `/teams/${teamId}/settings/team-settings`,
        status: currentTeam.status,
      },
    ];
    return (
      <Layout {...this.props}>
        <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
          <Head>
            <title>Team Settings</title>
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
                <h1>
                  Team Settings {'>'} {currentTeam.teamName}
                </h1>
                <div>
                  {currentTeam.status === 'team-leader' ? (
                    <div style={{ padding: '20px 10px' }}>
                      You ({currentUser.email}) are{' '}
                      <span style={{ borderBottom: '1px solid', paddingBottom: '1px' }}>
                        Team Leader
                      </span>{' '}
                      of team <b>{currentTeam.teamName}</b>{' '}
                      <Avatar
                        src={currentTeam.teamLogoUrl}
                        sx={{
                          display: 'inline-flex',
                          verticalAlign: 'middle',
                          marginBottom: isMobile ? '20px' : '0px',
                        }}
                      />
                      {currentUser.defaultTeamId === teamId ||
                      currentUser.teamsForUser.length < 2 ? null : (
                        <Button
                          variant="contained"
                          color="secondary"
                          type="button"
                          disabled={this.state.disabled}
                          onClick={this.deleteTeam}
                          style={{ marginLeft: '20px' }}
                        >
                          Delete team
                        </Button>
                      )}
                    </div>
                  ) : null}
                  {currentTeam.status === 'team-member' ? (
                    <div style={{ padding: '20px 10px' }}>
                      You ({currentUser.email}) are{' '}
                      <span style={{ borderBottom: '1px solid', paddingBottom: '1px' }}>
                        Team Member
                      </span>{' '}
                      of team <b>{currentTeam.teamName}</b>{' '}
                      <Avatar
                        src={currentTeam.teamLogoUrl}
                        sx={{
                          display: 'inline-flex',
                          verticalAlign: 'middle',
                          marginBottom: isMobile ? '20px' : '0px',
                        }}
                      />{' '}
                      owned by Team Leader ({currentTeam.teamLeaderEmail}).
                    </div>
                  ) : null}
                  {currentTeam.status === 'team-leader' ? (
                    <>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Team profile</TableCell>
                            <TableCell align="center" style={{ display: 'none' }}>
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
                                disabled={!this.state.disabledForTeamName}
                                autoComplete="off"
                                value={this.state.newTeamName}
                                onChange={(event) =>
                                  this.setState({ newTeamName: event.target.value })
                                }
                                label="Team name"
                                placeholder="Provide team name"
                                variant="outlined"
                                style={{
                                  fontFamily: 'Roboto, sans-serif',
                                  margin: isMobile ? '0px' : '10px 20px',
                                  minWidth: '320px',
                                }}
                              />
                            </TableCell>
                            <TableCell
                              style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}
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
                                  onClick={() => this.setState({ disabledForTeamName: false })}
                                  style={{
                                    display: this.state.disabledForTeamName ? 'inherit' : 'none',
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
                                    this.state.disabledForTeamName
                                      ? this.updateTeamName
                                      : () => this.setState({ disabledForTeamName: true })
                                  }
                                >
                                  {this.state.disabledForTeamName ? 'Save' : 'Edit'}
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
                                src={newTeamLogoUrl}
                                sx={{
                                  display: 'inline-flex',
                                  verticalAlign: 'middle',
                                  margin: isMobile ? '0px' : '10px 20px 10px 20px',
                                }}
                              />
                              {/* <TextField
                                disabled
                                value={this.state.newTeamLogoUrl}
                                label="Team logo"
                                placeholder="Upload image"
                                variant="outlined"
                                style={{
                                  fontFamily: 'Roboto, sans-serif',
                                  margin: isMobile ? '0px' : '10px 20px',
                                  width: isMobile ? '100%' : 'calc(100% - 75px)',
                                }}
                              /> */}
                            </TableCell>
                            <TableCell
                              style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}
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
                                  onClick={() => this.setState({ disabledForTeamLogo: false })}
                                  style={{
                                    display: this.state.disabledForTeamLogo ? 'inherit' : 'none',
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
                                  onClick={() => this.setState({ disabledForTeamLogo: true })}
                                  style={{
                                    display: this.state.disabledForTeamLogo ? 'none' : 'inherit',
                                  }}
                                >
                                  Edit
                                </Button>
                                <label htmlFor="upload-file-team-logo">
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    component="span"
                                    disabled={this.state.disabled}
                                    style={{
                                      display: this.state.disabledForTeamLogo ? 'inherit' : 'none',
                                    }}
                                  >
                                    Upload image
                                  </Button>
                                </label>
                                <input
                                  accept="image/*"
                                  id="upload-file-team-logo"
                                  type="file"
                                  style={{ display: 'none' }}
                                  onChange={
                                    this.state.disabledForTeamLogo
                                      ? this.uploadTeamLogo
                                      : () => this.setState({ disabledForTeamLogo: true })
                                  }
                                />
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
                            <TableCell
                              style={{
                                display: isMobile ? 'block' : null,
                                alignItems: 'center',
                              }}
                            >
                              Team
                              <Button
                                disabled={this.state.disabled}
                                onClick={this.inviteMember}
                                variant="contained"
                                color="primary"
                                style={{
                                  marginLeft: isMobile ? '0px' : '20px',
                                  marginTop: isMobile ? '20px' : '0px',
                                }}
                              >
                                Invite new member
                              </Button>
                            </TableCell>
                            <TableCell align="center" style={{ display: 'none' }}>
                              Edit/Save button
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          <TableRow>
                            <TableCell>Email address</TableCell>
                            <TableCell
                              style={{ width: isMobile ? '25%' : '300px', textAlign: 'center' }}
                            >
                              Status/Action
                            </TableCell>
                          </TableRow>
                          {currentTeam &&
                            currentTeam.members.map((tm) => (
                              <TableRow key={tm.email}>
                                <TableCell>
                                  {tm.teamForTeamMember &&
                                  tm.teamForTeamMember.status === 'invited' ? (
                                    tm.email
                                  ) : (
                                    <>
                                      <Avatar
                                        src={tm.userAvatarUrl}
                                        sx={{
                                          display: 'inline-flex',
                                          verticalAlign: 'middle',
                                          margin: isMobile ? '0px' : '10px 20px 10px 20px',
                                        }}
                                      />
                                      {tm.userName} / {tm.email}
                                    </>
                                  )}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  style={{
                                    width: isMobile ? '25%' : '300px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {(tm.teamForTeamMember &&
                                    tm.teamForTeamMember.status === 'team-leader') ||
                                  tm.email === currentTeam.teamLeaderEmail
                                    ? 'Team Leader'
                                    : null}
                                  <p />
                                  {tm.teamForTeamMember &&
                                  tm.teamForTeamMember.status === 'team-member'
                                    ? 'Team Member'
                                    : null}
                                  <p />
                                  {tm.teamForTeamMember &&
                                  tm.teamForTeamMember.status === 'team-member' ? (
                                    <Button
                                      data-id={tm.email}
                                      onClick={this.removeMember}
                                      variant="contained"
                                      color="secondary"
                                      disabled={this.state.disabled}
                                    >
                                      Remove member
                                    </Button>
                                  ) : null}

                                  {tm.teamForTeamMember && tm.teamForTeamMember.status === 'invited'
                                    ? 'Invitation email sent'
                                    : null}
                                  <p />

                                  {tm.teamForTeamMember &&
                                  tm.teamForTeamMember.status === 'invited' ? (
                                    <Button
                                      data-id={tm.email}
                                      onClick={this.revokeInvitation}
                                      variant="contained"
                                      color="secondary"
                                      disabled={this.state.disabled}
                                    >
                                      Revoke invitation
                                    </Button>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <p />
                      <br />
                      <p />
                      <br />
                    </>
                  ) : null}
                </div>
              </div>
              <p />
              <br />
              {currentTeam.status === 'team-leader' ? (
                <InviteMemberModal
                  store={this.props.store}
                  open={this.state.inviteMemberOpen}
                  onClose={this.handleInviteMemberClose}
                  teamId={this.props.teamId}
                />
              ) : null}
            </Grid>
          </Grid>
        </div>
      </Layout>
    );
  }

  // private handleCopyUrl = async (URL) => {
  //   try {
  //     if (window.navigator) {
  //       await window.navigator.clipboard.writeText(URL);
  //       notify('You copied URL to your clipboard.');
  //     }
  //   } catch (err) {
  //     notify(err);
  //   }
  // };

  // make edits
  private updateTeamName = async () => {
    const { currentUser } = this.props.store;
    const { teamId } = this.props;

    if (!teamId || !this.state.newTeamName) {
      notify('Team name or team id is missing.');
      return;
    }

    if (this.state.newTeamName.length > 20) {
      notify('Team name should not exceed 20 characters.');
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentUser.createOrUpdateTeamStoreMethod({
        teamName: this.state.newTeamName,
        teamLogoUrl: this.state.newTeamLogoUrl,
        teamId,
      });
      notify('You updated team name.');
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false, disabledForTeamName: false });
      NProgress.done();
    }
  };

  // make edits
  private uploadTeamLogo = async () => {
    const { store, teamId } = this.props;
    const { currentUser } = store;

    const fileElm = document.getElementById('upload-file-team-logo') as HTMLFormElement;
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
    this.setState({ disabled: true });

    fileElm.value = '';

    // add teamId to prefix

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
        { 'Cache-Control': 'max-age=2592000' }, // review number
      );

      this.setState({ newTeamLogoUrl: returnedDataFromS3.url });

      await currentUser.createOrUpdateTeamStoreMethod({
        teamName: this.state.newTeamName,
        teamLogoUrl: this.state.newTeamLogoUrl,
        teamId,
      });

      notify('You uploaded new team logo.');
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false, disabledForTeamLogo: false });
      NProgress.done();
    }
  };

  private handleInviteMemberClose = () => {
    this.setState({ inviteMemberOpen: false });
  };

  private inviteMember = async () => {
    const { currentTeam } = this.props.store.currentUser;
    const { teamName, teamLogoUrl } = currentTeam;

    if (!currentTeam || !teamName || !teamLogoUrl) {
      notify('You must add team name and logo before you can invite team members to your team.');
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

    NProgress.start();
    this.setState({ disabled: true });

    try {
      this.setState({ inviteMemberOpen: true });
    } catch (error) {
      notify(error);
      return;
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private removeMember = (event) => {
    const { currentTeam } = this.props.store.currentUser;
    const { teamName, teamLogoUrl } = currentTeam;
    const { teamId } = this.props;

    if (!currentTeam || !teamName || !teamLogoUrl) {
      notify('Please select team, and add team name and team logo to selected team.');
      return;
    }

    const email = event.currentTarget.dataset.id;
    const selectedUser = currentTeam.members.find((user) => email === user.email);

    if (!email || !selectedUser) {
      notify('Select Team Member to remove from team.');
      return;
    }

    this.setState({ disabled: true });

    confirm({
      title: 'Removing member',
      okText: 'Yes, remove',
      buttonColor: 'primary',
      message: `You are removing ${selectedUser.email} from this team. Are you sure?`,
      onAnswer: async (answer) => {
        if (!answer) {
          this.setState({ disabled: false });
          return;
        }

        if (answer) {
          try {
            NProgress.start();

            await currentTeam.removeTeamMemberStoreMethod({
              email: selectedUser.email,
              teamId,
            });
            notify(`You removed ${selectedUser.email} from ${currentTeam.teamName}`);
          } catch (error) {
            notify(error);
          } finally {
            this.setState({ disabled: false });
            NProgress.done();
          }
        }
      },
    });
  };

  private revokeInvitation = (event) => {
    const { currentTeam } = this.props.store.currentUser;
    const { teamName, teamLogoUrl } = currentTeam;
    const { teamId } = this.props;

    if (!currentTeam || !teamName || !teamLogoUrl) {
      notify('You team profile requires team name and team logo.');
      return;
    }

    const email = event.currentTarget.dataset.id;
    const selectedUser = currentTeam.members.find((user) => email === user.email);

    if (!email || !selectedUser) {
      notify('Select Team Member to revoke invitation from.');
      return;
    }

    this.setState({ disabled: true });

    confirm({
      title: 'Revoke invitation',
      message: `When you revoke invitation, invitation link that was sent to invited person "${selectedUser.email}" will not work anymore. Are you sure?`,
      okText: 'Yes, revoke invitation',
      buttonColor: 'primary',
      onAnswer: async (answer) => {
        if (!answer) {
          this.setState({ disabled: false });

          return;
        }

        if (answer) {
          try {
            NProgress.start();

            await currentTeam.revokeInvitationStoreMethod({
              email: selectedUser.email,
              teamId,
            });
            notify(`You revoked invitation for ${selectedUser.email}`);
          } catch (error) {
            notify(error);
          } finally {
            this.setState({ disabled: false });
            NProgress.done();
          }
        }
      },
    });
  };

  // You cannot delete the very last team. You can only delete non-default team. You have to remove all team members before deleting.
  private deleteTeam = async () => {
    const { store, teamId } = this.props;
    const { currentUser } = store;

    if (!teamId || !currentUser) {
      return;
    }

    if (currentUser.currentTeam.teamId === currentUser.defaultTeamId) {
      notify(`You cannot delete default team. Only non-default teams can be deleted.`);
      return;
    }

    if (currentUser.teamsForUser.length < 2) {
      notify(
        `You cannot delete your only team from your account. If you like to delete your Async account - please contact us.`,
      );
      return;
    }

    if (currentUser.currentTeam.teamMembers.size > 1) {
      notify(`Please remove all team members and invitations from your team before deleting team.`);
      return;
    }

    if (currentUser.currentTeam.isSubscriptionActiveForTeam) {
      notify(`Please cancel team's subscription before deleting team.`);
      return;
    }

    confirm({
      title: 'Delete team? This cannot be undone.',
      message:
        'If you delete team, you will delete all Discussions and Chats associated with this team. Are you sure?',
      okText: 'Yes, delete',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          await currentUser.deleteCurrentTeamStoreMethod({ teamId });

          notify(`You deleted team.`);
        } catch (error) {
          console.error(error);
          notify(error);
        } finally {
          this.setState({ disabled: false });
          NProgress.done();
        }
      },
    });
  };
}

export default TeamSettingsPage;
