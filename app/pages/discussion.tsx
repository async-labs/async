import React from 'react';
// import { observer } from 'mobx-react';
import Head from 'next/head';
// import Router from 'next/router';
import Grid from '@mui/material/Grid';

import Loading from '../components/common/Loading';
import Layout from '../components/layout';
import DiscussionDetail from '../components/discussions/DiscussionDetail';
import DiscussionList from '../components/discussions/DiscussionList';
import notify from '../lib/notify';
import { Discussion, Store } from '../lib/store';

type Props = {
  store: Store;
  discussionId: string;
  isServer: boolean;
  isMobile: boolean;
  teamId: string;
  isSelectedDiscussionArchived: boolean;
};

type State = {
  whichListToShow: string;
  showFormForNewDiscussion: boolean;
};

class DiscussionPage extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      whichListToShow: props.isSelectedDiscussionArchived ? 'archived' : 'active',
      showFormForNewDiscussion: false,
    };
  }

  public async componentDidMount() {
    const { discussionId, store, teamId } = this.props;
    const { currentUser } = store;

    if (!discussionId) {
      if (currentUser) {
        await currentUser.loadActiveDiscussionsStoreMethod({ teamId }).catch((err) => notify(err));
        await currentUser
          .loadArchivedDiscussionsStoreMethod({ teamId })
          .catch((err) => notify(err));
      }
    }
  }

  public async componentDidUpdate(prevProps: Props) {
    if (prevProps.discussionId !== this.props.discussionId) {
      const { discussionId, isServer } = this.props;

      const discussion = this.getDiscussion(discussionId);

      if (!isServer && discussion) {
        await discussion.loadCommentsStoreMethod().catch((err) => notify(err));
      }
    }

    if (prevProps.isSelectedDiscussionArchived !== this.props.isSelectedDiscussionArchived) {
      this.setState({
        whichListToShow: this.props.isSelectedDiscussionArchived ? 'archived' : 'active',
      });
    }
  }

  public render() {
    const { store, discussionId, isMobile, teamId, isServer } = this.props;
    const { currentUser } = store;

    const random10 = Math.random().toString(36).substring(2, 12);

    const { showFormForNewDiscussion } = this.state;

    const discussion = this.getDiscussion(discussionId);

    if (showFormForNewDiscussion) {
      return (
        <Layout {...this.props}>
          <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
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
              <Grid
                item
                sm={2}
                xs={12}
                style={{ padding: '10px', borderRight: '1px solid #828282' }}
              >
                <DiscussionList
                  store={store}
                  isMobile={this.props.isMobile}
                  teamId={teamId}
                  onChanged={this.onListChange}
                  onPlusIconClick={this.onPlusIconClick}
                  isSelectedDiscussionArchived={this.state.whichListToShow}
                  key={'DL-new-discussion' + random10}
                />
              </Grid>
              <Grid
                item
                sm={10}
                xs={12}
                style={{
                  padding: '20px',
                  marginTop: isMobile ? '-20px' : 'none',
                  borderTop: isMobile ? '1px solid #828282' : 'none',
                  borderRight: isMobile ? 'none' : '1px solid #828282',
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '0px' : '0px 10px',
                  }}
                >
                  <DiscussionDetail
                    store={store}
                    discussion={null}
                    isServer={isServer}
                    isMobile={isMobile}
                    teamId={teamId}
                    key={showFormForNewDiscussion.toString() + 'DD-new-discussion' + random10}
                    onCreationOfNewDiscussion={this.onCreationOfNewDiscussion}
                    whichList={this.state.whichListToShow}
                    onPlusIconClickPropForDD={this.onPlusIconClick}
                  />
                </div>
              </Grid>
            </Grid>
          </div>
        </Layout>
      );
    }

    if (!discussion && (currentUser.isLoadingDiscussions || store.isServer)) {
      return (
        <Layout {...this.props}>
          <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
            <Head>
              <title>Loading...</title>
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
              <Grid
                item
                sm={2}
                xs={12}
                style={{ padding: '10px', borderRight: '1px solid #828282' }}
              >
                <DiscussionList
                  store={store}
                  isMobile={this.props.isMobile}
                  teamId={teamId}
                  onChanged={this.onListChange}
                  onPlusIconClick={this.onPlusIconClick}
                  isSelectedDiscussionArchived={this.state.whichListToShow}
                  key={'DL-is-loading' + random10}
                />
              </Grid>
              <Grid
                item
                sm={10}
                xs={12}
                style={{
                  padding: '20px',
                  marginTop: isMobile ? '-20px' : 'none',
                  borderTop: isMobile ? '1px solid #828282' : 'none',
                  borderRight: isMobile ? 'none' : '1px solid #828282',
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '0px' : '0px 10px',
                  }}
                >
                  <Loading text="Loading discussion..." />{' '}
                </div>
              </Grid>
            </Grid>
          </div>
        </Layout>
      );
    } else if (!discussionId || !discussion) {
      return (
        <Layout {...this.props}>
          <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
            <Head>
              <title>No discussion is found.</title>
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
              <Grid
                item
                sm={2}
                xs={12}
                style={{ padding: '10px', borderRight: '1px solid #828282' }}
              >
                <DiscussionList
                  store={store}
                  isMobile={this.props.isMobile}
                  teamId={teamId}
                  onChanged={this.onListChange}
                  onPlusIconClick={this.onPlusIconClick}
                  isSelectedDiscussionArchived={this.state.whichListToShow}
                  key={'DL-list-is-loading' + random10}
                />
              </Grid>
              <Grid
                item
                sm={10}
                xs={12}
                style={{
                  padding: '20px',
                  marginTop: isMobile ? '-20px' : 'none',
                  borderTop: isMobile ? '1px solid #828282' : 'none',
                  borderRight: isMobile ? 'none' : '1px solid #828282',
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '0px' : '0px 10px',
                  }}
                >
                  <p>No discussion is found.</p>
                </div>
              </Grid>
            </Grid>
          </div>
        </Layout>
      );
    } else {
      return (
        <Layout {...this.props}>
          <div style={{ padding: '0px', fontSize: '14px', height: '100vh' }}>
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
              <Grid
                item
                sm={2}
                xs={12}
                style={{ padding: '10px', borderRight: '1px solid #828282' }}
              >
                <DiscussionList
                  store={store}
                  isMobile={this.props.isMobile}
                  teamId={teamId}
                  onChanged={this.onListChange}
                  onPlusIconClick={this.onPlusIconClick}
                  isSelectedDiscussionArchived={this.state.whichListToShow}
                  key={'DL-loaded-and-not-empty' + random10}
                />
              </Grid>
              <Grid
                item
                sm={10}
                xs={12}
                style={{
                  padding: '20px',
                  marginTop: isMobile ? '-20px' : 'none',
                  borderTop: isMobile ? '1px solid #828282' : 'none',
                  borderRight: isMobile ? 'none' : '1px solid #828282',
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '0px' : '0px 10px',
                  }}
                >
                  <DiscussionDetail
                    store={store}
                    discussion={discussion}
                    isServer={isServer}
                    isMobile={isMobile}
                    teamId={teamId}
                    key={showFormForNewDiscussion.toString() + discussion.discussionId + random10}
                    onCreationOfNewDiscussion={this.onCreationOfNewDiscussion}
                    whichList={this.state.whichListToShow}
                    onPlusIconClickPropForDD={this.onPlusIconClick}
                  />
                </div>
              </Grid>
            </Grid>
          </div>
        </Layout>
      );
    }
  }

  private onPlusIconClick = () => {
    const { showFormForNewDiscussion } = this.state;

    this.setState({ showFormForNewDiscussion: !showFormForNewDiscussion });
  };

  private onCreationOfNewDiscussion = () => {
    this.setState({ showFormForNewDiscussion: false });
  };

  private onListChange = (whichList: string) => {
    this.setState({ whichListToShow: whichList });
  };

  private getDiscussion(discussionId: string): Discussion {
    const { store } = this.props;
    const { currentUser } = store;
    const { whichListToShow } = this.state;

    if (discussionId && !currentUser.isLoadingDiscussions) {
      const selectedDiscussion =
        whichListToShow === 'active'
          ? currentUser.activeDiscussionsForUser.find((d) => {
              return d.discussionId === discussionId;
            })
          : currentUser.archivedDiscussionsForUser.find((d) => {
              return d.discussionId === discussionId;
            });

      return selectedDiscussion;
    }

    return null;
  }
}

export default DiscussionPage;
