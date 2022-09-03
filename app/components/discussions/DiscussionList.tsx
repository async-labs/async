import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

import ControlPointRoundedIcon from '@mui/icons-material/ControlPointRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import { inject, observer } from 'mobx-react';
import Router, { NextRouter, withRouter } from 'next/router';
import React from 'react';
import NProgress from 'nprogress';

import { Store } from '../../lib/store';
import notify from '../../lib/notify';

import Loading from '../common/Loading';
import SidebarListItem from '../common/SidebarListItem';
import SearchDiscussions from './SearchDiscussions';

// define in data store: discussion.hasNotification

type Props = {
  store?: Store;
  classes?: any;
  router: NextRouter;
  isMobile: boolean;
  teamId: string;
  onChanged: (whichList: string) => void;
  onPlusIconClick: () => void;
  isSelectedDiscussionArchived: string;
};

type State = {
  discussionSearchFormOpen: boolean;
  searchQuery: string;
  whichList: string;
};

class DiscussionList extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      discussionSearchFormOpen: false,
      searchQuery: '',
      whichList: props.isSelectedDiscussionArchived,
    };
  }

  public render() {
    const { store, isMobile, router, teamId } = this.props;
    const { asPath } = router;
    const { currentUser } = store;
    const { whichList } = this.state;

    const isThemeDark = store.currentUser.showDarkTheme === true;

    if (!currentUser) {
      return null;
    }

    const orderedActiveDiscussions = currentUser.orderedActiveDiscussions;
    const orderedArchivedDiscussions = currentUser.orderedArchivedDiscussions;

    let loading = 'Loading...';
    let selectedDiscussion;

    if (whichList === 'active') {
      if (orderedActiveDiscussions.length > 0) {
        loading = 'Loading active list...';
      }

      selectedDiscussion =
        asPath &&
        orderedActiveDiscussions.find((d) => asPath.includes(`/discussions/${d.discussionId}`));
    } else if (whichList === 'archived') {
      if (orderedArchivedDiscussions.length > 0) {
        loading = 'Loading archived list...';
      }

      selectedDiscussion =
        asPath &&
        orderedArchivedDiscussions.find((d) =>
          // review for archived
          asPath.includes(`/discussions/${d.discussionId}`),
        );
    }

    if (
      whichList === 'active' &&
      orderedActiveDiscussions.length === 0 &&
      !currentUser.isLoadingDiscussions
    ) {
      loading = 'The active list is empty.';
    }

    if (
      whichList === 'archived' &&
      orderedArchivedDiscussions.length === 0 &&
      !currentUser.isLoadingDiscussions
    ) {
      loading = 'The archive list is empty.';
    }

    return (
      <div
        style={{
          padding: '5px 5px 5px 10px',
          marginRight: '5px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            marginBottom: '25px',
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
          }}
        >
          {' '}
          <b>Discussions</b>
          <ControlPointRoundedIcon
            onClick={this.showFormForNewDiscussion}
            style={{
              cursor: 'pointer',
              margin: isMobile ? '-5px 10px 0px auto' : '-5px -10px 0px auto',
              opacity: '0.75',
            }}
          />
        </div>
        {whichList === 'active' ? (
          <>
            <span
              style={{
                borderBottom: '1px solid',
                paddingBottom: '1px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Active
            </span>{' '}
            |{' '}
            <span
              style={{ cursor: 'pointer', opacity: 0.7 }}
              onClick={this.showArchivedDiscussions}
            >
              Archived
            </span>
          </>
        ) : (
          <>
            <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={this.showActiveDiscussions}>
              <b>Active</b>
            </span>{' '}
            |{' '}
            <span
              style={{
                borderBottom: '1px solid',
                paddingBottom: '1px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              <b>Archived</b>
            </span>
          </>
        )}
        <TextField
          autoComplete="off"
          autoFocus={false}
          variant="outlined"
          size="small"
          value={this.state.searchQuery}
          onChange={(e) => this.setState({ searchQuery: e.target.value })}
          placeholder={this.state.whichList === 'active' ? 'Search active' : 'Search archived'}
          style={{
            fontSize: '13px',
            margin: isMobile ? '20px 5px 0px 0px' : '20px 5px 15px 0px',
            width: '97%',
            fontFamily: 'Roboto, sans-serif',
            background: isThemeDark ? 'none' : '#fff',
          }}
          onKeyPress={this.searchOnPress}
          InputProps={{
            endAdornment: (
              <SearchRoundedIcon onClick={this.searchOnClick} style={{ cursor: 'pointer' }} />
            ),
            style: { fontSize: '13px' },
          }}
        />

        <p />
        {whichList === 'active' ? (
          <>
            {isMobile ? (
              <FormControl
                style={{ margin: isMobile ? '0px' : '10px 0px', width: isMobile ? '95%' : '380px' }}
                variant="outlined"
              >
                <InputLabel id="select-discussion-outlined-label">Select discussion</InputLabel>
                <Select
                  labelId="select-discussion-outlined-label"
                  fullWidth
                  style={{
                    margin: '0px 15px -20px 0px',
                    background: isThemeDark ? 'none' : '#fff',
                  }}
                  value={(selectedDiscussion && selectedDiscussion.discussionId) || ''}
                  label="Select discussion"
                  onChange={(event) => {
                    event.stopPropagation();
                    const id = event.target.value;
                    if (id) {
                      Router.push(
                        `/discussion?discussionId=${id}&teamId=${teamId}`,
                        `/teams/${teamId}/discussions/${id}`,
                      );
                    }
                  }}
                >
                  {orderedActiveDiscussions.map((d) => {
                    return (
                      <MenuItem key={d.discussionId + '-menu-item-active'} value={d.discussionId}>
                        {d.discussionName}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            ) : (
              <ul style={{ listStyle: 'none', padding: '0px' }}>
                {orderedActiveDiscussions.map((d) => {
                  const selected = asPath && asPath.includes(`/discussions/${d.discussionId}`);

                  return (
                    <SidebarListItem
                      store={store}
                      key={d.discussionId + '-sidebar-list-item-active'}
                      text={d.discussionName}
                      href={`/discussion?discussionId=${d.discussionId}&teamId=${teamId}`}
                      as={`/teams/${teamId}/discussions/${d.discussionId}`}
                      isSelected={selected}
                      isPinned={d.isDiscussionPinnedForUser}
                      discussionId={d.discussionId}
                      teamId={teamId}
                      isDiscussionArchived={false}
                      isUnread={d.isDiscussionUnreadForUser}
                      isChat={false}
                      chat={null}
                      isMobile={isMobile}
                    />
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            {isMobile ? (
              <Select
                style={{ width: '80%', fontSize: '12px', margin: '5px 15px 0px 20px' }}
                value={(selectedDiscussion && selectedDiscussion.discussionId) || ''}
                label="Select discussion"
                onChange={(event) => {
                  event.stopPropagation();
                  const id = event.target.value;
                  if (id) {
                    Router.push(
                      `/discussion?discussionId=${id}&teamId=${teamId}`,
                      `/teams/${teamId}/discussions/${id}`,
                    );
                  }
                }}
              >
                {orderedArchivedDiscussions.map((d) => {
                  return (
                    <MenuItem key={d.discussionId + '-menu-item-archived'} value={d.discussionId}>
                      {d.discussionName}
                    </MenuItem>
                  );
                })}
              </Select>
            ) : (
              <ul style={{ listStyle: 'none', padding: '0px' }}>
                {orderedArchivedDiscussions.map((d) => {
                  const selected = asPath && asPath.includes(`/discussions/${d.discussionId}`); // test if works as expected
                  return (
                    <SidebarListItem
                      store={store}
                      key={d.discussionId + '-sidebar-list-item-archived'}
                      text={d.discussionName}
                      href={`/discussion?discussionId=${d.discussionId}&teamId=${teamId}`}
                      as={`/teams/${teamId}/discussions/${d.discussionId}`}
                      isSelected={selected}
                      isPinned={d.isDiscussionPinnedForUser}
                      discussionId={d.discussionId}
                      teamId={teamId}
                      isDiscussionArchived={true}
                      isUnread={d.isDiscussionUnreadForUser}
                      isMobile={isMobile}
                    />
                  );
                })}
              </ul>
            )}
          </>
        )}
        <Loading
          text={loading}
          style={{
            visibility:
              currentUser.isLoadingDiscussions ||
              store.isServer ||
              (whichList === 'active' &&
                orderedActiveDiscussions.length === 0 &&
                !currentUser.isLoadingDiscussions) ||
              (whichList === 'archived' &&
                orderedArchivedDiscussions.length === 0 &&
                !currentUser.isLoadingDiscussions)
                ? 'visible'
                : 'hidden',
          }}
        />
        {this.state.discussionSearchFormOpen ? (
          <SearchDiscussions
            title={'Search results for query: '}
            search={currentUser.searchDiscussionsStoreMethod.bind(currentUser)}
            open={this.state.discussionSearchFormOpen}
            query={this.state.searchQuery}
            whichList={this.state.whichList}
            onClose={() => {
              this.setState({ discussionSearchFormOpen: false, searchQuery: '' });
            }}
            teamId={teamId}
          />
        ) : null}
      </div>
    );
  }

  private showFormForNewDiscussion = (event) => {
    event.preventDefault();

    this.props.onPlusIconClick();
  };

  private searchOnPress = (event) => {
    if (event.key === 'Enter' && (event.code === 'Enter' || event.code === 'NumpadEnter')) {
      this.setState({ discussionSearchFormOpen: true });
    } else {
      this.setState({ searchQuery: event.target.value });
    }
  };

  private searchOnClick = (event) => {
    event.preventDefault();
    if (!this.state.searchQuery) {
      notify('Empty query. Please add content to search.');
      return;
    } else {
      this.setState({ discussionSearchFormOpen: true });
    }
  };

  private showActiveDiscussions = async (event) => {
    event.preventDefault();

    const { currentUser } = this.props.store;
    const { teamId } = this.props;

    NProgress.start();
    this.props.onChanged('active');
    this.setState({ whichList: 'active' });

    try {
      await currentUser.loadActiveDiscussionsStoreMethod({
        teamId,
      });

      Router.push(
        `/discussion?discussionId=${
          (currentUser.orderedActiveDiscussions[0] &&
            currentUser.orderedActiveDiscussions[0].discussionId) ||
          null
        }&teamId=${teamId}`,
        `/teams/${teamId}/discussions/${
          (currentUser.orderedActiveDiscussions[0] &&
            currentUser.orderedActiveDiscussions[0].discussionId) ||
          null
        }`,
      );
    } catch (error) {
      notify(error);
    } finally {
      NProgress.done();
    }
  };

  private showArchivedDiscussions = async (event) => {
    event.preventDefault();

    const { currentUser } = this.props.store;
    const { teamId } = this.props;

    NProgress.start();
    this.props.onChanged('archived');
    this.setState({ whichList: 'archived' });

    try {
      await currentUser.loadArchivedDiscussionsStoreMethod({
        teamId,
      });

      Router.push(
        `/discussion?discussionId=${
          (currentUser.orderedArchivedDiscussions[0] &&
            currentUser.orderedArchivedDiscussions[0].discussionId) ||
          null
        }&teamId=${teamId}`,
        `/teams/${teamId}/discussions/${
          (currentUser.orderedArchivedDiscussions[0] &&
            currentUser.orderedArchivedDiscussions[0].discussionId) ||
          null
        }`,
      );
    } catch (error) {
      notify(error);
    } finally {
      NProgress.done();
    }
  };
}

export default withRouter<Props>(inject('store')(observer(DiscussionList)));
