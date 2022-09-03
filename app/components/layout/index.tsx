import Avatar from '@mui/material/Avatar';
// import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import { ArrowDropDown, Textsms, Subject, Settings } from '@mui/icons-material';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import CircleIcon from '@mui/icons-material/Circle';
import Menu from '@mui/icons-material/Menu';

import Drawer from '@mui/material/Drawer';

import { observer } from 'mobx-react';
import moment from 'moment';
import Link from 'next/link';
import Router, { NextRouter, withRouter } from 'next/router';
// import NProgress from 'nprogress';
import React from 'react';

// import notify from '../../lib/notify';
import { Store } from '../../lib/store';
import MenuWithLinks from '../common/MenuWithLinks';
import CreateTeamModal from '../../components/teams/CreateTeamModal';
import { accountMenu } from './menus';
import Loading from '../common/Loading';

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <React.Fragment>
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        style={{ width: '100%', maxWidth: '100%', borderBottom: '1px solid #828282' }}
      >
        {children}
      </Grid>
    </React.Fragment>
  );
}

type Props = {
  showDarkTheme?: boolean;
  children?: React.ReactNode;
  store?: Store;
  isMobile?: boolean;
  isServer?: boolean;
  router: NextRouter;
  teamId: string;
  discussionId?: string;
  chatId?: string;
};

type State = {
  createTeamModalOpen: boolean;
  selectedTeamId: string;
  open: boolean;
};

class Layout extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      createTeamModalOpen: false,
      selectedTeamId: this.props.teamId || this.props.store.currentUser.defaultTeamId || null,
      open: false,
    };
  }

  public componentDidMount() {
    const { teamId, store } = this.props;

    if (teamId) {
      store.currentUser.setCurrentTeamStoreMethod(teamId);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    const { teamId, store } = this.props;

    if (teamId && prevProps.teamId !== teamId) {
      store.currentUser.setCurrentTeamStoreMethod(teamId);

      this.setState({ selectedTeamId: teamId });
    }
  }

  public render() {
    const { store, children, isMobile, showDarkTheme, teamId } = this.props;
    const { currentUser } = store;

    const { pathname } = this.props.router;
    const isDiscussionPageLoaded = pathname.includes('/discussion');
    const isChatPageLoaded = pathname.includes('/chat');

    const orderedActiveDiscussions = currentUser.orderedActiveDiscussions;
    const orderedChats = currentUser.orderedChats;

    if (store.isLoggingIn) {
      return (
        <LayoutWrapper>
          <Grid item md={12} sm={12} xs={12}>
            <Loading text="loading User ..." />
          </Grid>
        </LayoutWrapper>
      );
    }

    if (!currentUser) {
      return (
        <LayoutWrapper>
          <Grid item md={12} sm={12} xs={12}>
            {children}
          </Grid>
        </LayoutWrapper>
      );
    }

    return (
      <>
        <Grid
          container
          style={{
            borderBottom: '1px solid #828282',
            backgroundColor: currentUser && currentUser.showDarkTheme ? '#161b22' : '#dce7f1',
            justifyContent: 'space-around',
          }}
        >
          {isMobile ? null : (
            <Grid
              item
              md={2}
              sm={isMobile ? 6 : 12}
              xs={isMobile ? 6 : 12}
              style={{
                borderRight: isMobile ? 'none' : '1px solid #828282',
              }}
            >
              {this.state.selectedTeamId ? (
                <FormControl size="small" variant="outlined" style={{ margin: '20px' }}>
                  <InputLabel id="select-team-outlined-label">Team</InputLabel>
                  <Select
                    disabled={
                      teamId &&
                      !(pathname.includes('/my-billing') || pathname.includes('/my-account'))
                        ? false
                        : true
                    }
                    fullWidth
                    labelId="select-team-outlined-label"
                    id="select-team-outlined"
                    value={this.state.selectedTeamId}
                    onChange={async (event) => {
                      await this.changeTeam({ newTeamId: event.target.value as string });
                    }}
                    label="Team"
                    style={{
                      fontFamily: 'Roboto, sans-serif',
                      fontSize: '14px',
                    }}
                  >
                    <MenuItem value="team-settings">
                      <Settings style={{ fontSize: '19px', opacity: '0.8', marginRight: '10px' }} />{' '}
                      Team Settings
                    </MenuItem>

                    <hr style={{ width: '100%', margin: '10px auto' }} />
                    {currentUser &&
                      currentUser.teamsForUser.map((team) => (
                        <MenuItem key={team.teamId + '-menu-item'} value={team.teamId}>
                          <Avatar
                            src={team.teamLogoUrl}
                            sx={{
                              margin: '5px 10px 5px 0px',
                              verticalAlign: 'middle',
                            }}
                          />{' '}
                          {team.teamName}{' '}
                          {currentUser.defaultTeamId === team.teamId ? (
                            <span
                              style={{
                                marginLeft: '3px',
                                fontSize: '15px',
                                marginRight: '10px',
                              }}
                            >
                              *
                            </span>
                          ) : null}
                        </MenuItem>
                      ))}
                    <hr style={{ width: '100%', margin: '10px auto' }} />
                    <MenuItem value="create-new-team">+ Add team</MenuItem>
                  </Select>
                </FormControl>
              ) : null}
            </Grid>
          )}
          {isMobile ? (
            <Grid
              item
              md={1}
              sm={isMobile ? 6 : 12}
              xs={isMobile ? 6 : 12}
              style={{ textAlign: 'right' }}
            ></Grid>
          ) : null}
          <Grid
            item
            md={2}
            sm={12}
            xs={12}
            style={{
              borderTop: isMobile ? '1px solid #828282' : 'none',
              display: 'flex',
              height: isMobile ? '40px' : 'inherit',
              justifyContent: 'space-evenly',
              paddingLeft: isMobile ? 'inherit' : '80px',
            }}
          >
            <Link
              href={`/discussion?teamId=${teamId || currentUser.defaultTeamId}&discussionId=${
                (orderedActiveDiscussions[0] && orderedActiveDiscussions[0].discussionId) || null
              }`}
              as={`/teams/${teamId || currentUser.defaultTeamId}/discussions/${
                (orderedActiveDiscussions[0] && orderedActiveDiscussions[0].discussionId) || null
              }`}
            >
              <a
                style={{
                  cursor: 'pointer',
                  zIndex: 100,
                  margin: isMobile ? 'auto 40px auto 20px' : 'auto 20px auto 20px',
                  fontWeight: isDiscussionPageLoaded ? 600 : 300,
                  fontSize: isDiscussionPageLoaded ? '19px' : '14px',
                  opacity: isDiscussionPageLoaded ? '1' : '0.7',
                  display: 'flex',
                }}
              >
                {' '}
                <Subject
                  style={{
                    cursor: 'pointer',
                    fontSize: '24px',
                    margin: 'auto 5px',
                  }}
                />{' '}
                Discussions
              </a>
            </Link>
            <Link
              href={`/chat?teamId=${teamId || currentUser.defaultTeamId}&chatId=${
                (orderedChats[0] && orderedChats[0].chatId) || null
              }`}
              as={`/teams/${teamId || currentUser.defaultTeamId}/chats/${
                (orderedChats[0] && orderedChats[0].chatId) || null
              }`}
            >
              <a
                style={{
                  cursor: 'pointer',
                  zIndex: 100,
                  margin: isMobile ? 'auto 40px auto 20px' : 'auto 20px auto 20px',
                  fontWeight: isChatPageLoaded ? 600 : 300,
                  fontSize: isChatPageLoaded ? '19px' : '14px',
                  opacity: isChatPageLoaded ? '1' : '0.7',
                  display: 'flex',
                }}
              >
                <Textsms
                  style={{
                    cursor: 'pointer',
                    fontSize: '24px',
                    margin: 'auto 5px',
                  }}
                />
                Chats
                {currentUser.isChatsLinkUnreadForUser ? (
                  <CircleIcon
                    style={{
                      fontSize: '10px',
                      marginLeft: '3px',
                    }}
                  />
                ) : null}
              </a>
            </Link>
            {isMobile ? (
              <div>
                <Menu
                  onClick={() => this.toggleDrawer(true)}
                  style={{ marginTop: '5px', marginRight: '5px' }}
                />
                <Drawer
                  anchor="right"
                  open={this.state.open}
                  onClose={() => this.toggleDrawer(false)}
                >
                  <div style={{ width: '100%', height: '100%' }}>
                    <p />
                    {this.state.selectedTeamId ? (
                      <FormControl
                        size="small"
                        variant="outlined"
                        style={{ minWidth: '180px', margin: '20px' }}
                      >
                        <InputLabel id="select-team-outlined-label">Team</InputLabel>
                        <Select
                          disabled={
                            teamId &&
                            !(pathname.includes('/my-billing') || pathname.includes('/my-account'))
                              ? false
                              : true
                          }
                          labelId="select-team-outlined-label"
                          id="select-team-outlined"
                          value={this.state.selectedTeamId}
                          onChange={async (event) => {
                            await this.changeTeam({ newTeamId: event.target.value as string });
                          }}
                          label="Team"
                          style={{
                            fontFamily: 'Roboto, sans-serif',
                          }}
                        >
                          {currentUser &&
                            currentUser.teamsForUser.map((team) => (
                              <MenuItem key={team.teamId + '-menu-item'} value={team.teamId}>
                                <Avatar
                                  src={team.teamLogoUrl}
                                  sx={{
                                    margin: '5px 10px 5px 0px',
                                    verticalAlign: 'middle',
                                  }}
                                />{' '}
                                {team.teamName}{' '}
                                {currentUser.defaultTeamId === team.teamId ? (
                                  <span
                                    style={{
                                      marginLeft: '3px',
                                      fontSize: '17px',
                                    }}
                                  >
                                    *
                                  </span>
                                ) : null}
                              </MenuItem>
                            ))}
                          <MenuItem value="create-new-team">+ Create new team</MenuItem>
                        </Select>
                      </FormControl>
                    ) : null}
                    <p />
                    <div style={{ textAlign: 'right' }}>
                      <MenuWithLinks
                        options={accountMenu()}
                        selected={true}
                        showDarkTheme={showDarkTheme}
                        isMobile={isMobile}
                      >
                        <Tooltip
                          title={
                            currentUser && currentUser.userName
                              ? currentUser.userName
                              : 'Add username in Settings > My Account'
                          }
                        >
                          <Avatar
                            src={currentUser.userAvatarUrl || ''}
                            sx={{
                              cursor: 'pointer',
                              display: 'inline-flex',
                            }}
                          />
                        </Tooltip>
                        <ArrowDropDown
                          style={{
                            opacity: '1',
                            fontSize: '24px',
                            cursor: 'pointer',
                            margin: '5px auto 5px 0px',
                          }}
                        />
                      </MenuWithLinks>
                    </div>
                    <div>
                      <div style={{ clear: 'both' }} />
                      {this.renderLogoutMessage()}
                    </div>
                  </div>
                </Drawer>
              </div>
            ) : null}
          </Grid>
          {isMobile ? (
            <div
              style={{
                fontSize: '12px',
                margin: '10px auto',
              }}
            >
              {currentUser &&
              currentUser.accountCreationDate &&
              moment(new Date()).isBefore(moment(currentUser.accountCreationDate).add(30, 'days'))
                ? `Free trial expires ${moment(currentUser.accountCreationDate)
                    .add(30, 'days')
                    .from(moment(new Date()))} for your account.`
                : currentUser.isSubscriptionActiveForAccount || isMobile
                ? null
                : `Free trial is over for your account.`}
            </div>
          ) : null}
          <Grid item md={7} sm={12} xs={12} style={{ display: isMobile ? 'none' : 'block' }}>
            <div
              style={{
                fontSize: '12px',
                padding: isMobile ? '15px' : 'none',
                margin: '40px',
                float: 'right',
              }}
            >
              {currentUser &&
              currentUser.accountCreationDate &&
              moment(new Date()).isBefore(moment(currentUser.accountCreationDate).add(30, 'days'))
                ? `Free trial expires ${moment(currentUser.accountCreationDate)
                    .add(30, 'days')
                    .from(moment(new Date()))} for your account.`
                : currentUser.isSubscriptionActiveForAccount || isMobile
                ? null
                : `Free trial is over for your account.`}
            </div>
          </Grid>

          {isMobile ? null : (
            <Grid
              item
              md={1}
              sm={12}
              xs={12}
              style={{
                display: 'flex',
                borderLeft: '1px solid #828282',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MenuWithLinks options={accountMenu()} selected={true} showDarkTheme={showDarkTheme}>
                <Tooltip
                  title={
                    currentUser && currentUser.userName
                      ? currentUser.userName
                      : 'Add username in Settings > My Account'
                  }
                >
                  <Avatar
                    src={currentUser.userAvatarUrl || ''}
                    sx={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                    }}
                  />
                </Tooltip>
                <ArrowDropDown
                  style={{
                    opacity: '1',
                    fontSize: '24px',
                    cursor: 'pointer',
                    margin: '5px auto 5px 0px',
                  }}
                />
              </MenuWithLinks>
              <div>
                <div style={{ clear: 'both' }} />
                {this.renderLogoutMessage()}
              </div>
            </Grid>
          )}
        </Grid>
        {children}
        <CreateTeamModal
          store={this.props.store}
          open={this.state.createTeamModalOpen}
          onClose={this.handleCreateTeamModalClose}
        />
      </>
    );
  }

  public toggleDrawer = (open: boolean): void => {
    this.setState({ open });
  };

  private handleCreateTeamModalClose = () => {
    this.setState({ createTeamModalOpen: false });
  };

  private renderLogoutMessage() {
    const { currentUser } = this.props.store;

    if (currentUser && currentUser.isLoggedIn) {
      return null;
    }

    return (
      <p>
        You are logged out. Please log in. Simply refresh browser tab to be redirected to Login
        page.
      </p>
    );
  }

  // need to move these methods to Project page

  // review method
  private async changeTeam({ newTeamId }) {
    const { teamId, store, router } = this.props;

    if (!newTeamId || !teamId) {
      return;
    }

    if (newTeamId === teamId) {
      return;
    }

    if (newTeamId === 'create-new-team') {
      this.setState({ createTeamModalOpen: true });
      return;
    }

    if (newTeamId === 'team-settings') {
      Router.push(
        `/settings/team-settings?teamId=${teamId}`,
        `/teams/${teamId}/settings/team-settings`,
      );
      return;
    }

    this.setState({ selectedTeamId: newTeamId });

    await store.currentUser.sendOnlineStatusToServerStoreMethod(false, this.props.teamId);

    if (router.asPath.includes('/discussions')) {
      const { orderedActiveDiscussions } = store.currentUser;
      Router.replace(
        `/discussion?teamId=${newTeamId}&discussionId=${
          (orderedActiveDiscussions &&
            orderedActiveDiscussions.length > 0 &&
            orderedActiveDiscussions[0].discussionId) ||
          null
        }`,
        `/teams/${newTeamId}/discussions/${
          (orderedActiveDiscussions &&
            orderedActiveDiscussions.length > 0 &&
            orderedActiveDiscussions[0].discussionId) ||
          null
        }`,
      );
    } else if (router.asPath.includes('/chats')) {
      const { orderedChats } = store.currentUser;
      Router.replace(
        `/chat?teamId=${newTeamId}&chatId=${
          (orderedChats && orderedChats.length > 0 && orderedChats[0].chatId) || null
        }`,
        `/teams/${newTeamId}/chats/${
          (orderedChats && orderedChats.length > 0 && orderedChats[0].chatId) || null
        }`,
      );
    } else if (router.asPath.includes('/settings/team-settings')) {
      Router.push(
        `/settings/team-settings?teamId=${newTeamId}`,
        `/teams/${newTeamId}/settings/team-settings`,
      );
    } else if (router.asPath.includes('/settings/my-billing')) {
      Router.push(`/settings/my-billing`, `/settings/my-billing`);
    } else if (router.asPath.includes('/settings/my-account')) {
      Router.push(`/settings/my-account`, `/settings/my-account`);
    }

    await store.currentUser.setCurrentTeamStoreMethod(newTeamId);
  }
}

export default withRouter<Props>(observer(Layout));
