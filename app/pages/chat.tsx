import React from 'react';
// import { observer } from 'mobx-react';
import Head from 'next/head';
// import Router from 'next/router';
import Grid from '@mui/material/Grid';

import Loading from '../components/common/Loading';
import Layout from '../components/layout';
import ChatDetail from '../components/chats/ChatDetail';
import ChatList from '../components/chats/ChatList';
import notify from '../lib/notify';
import { Chat, Store } from '../lib/store';

type Props = {
  store: Store;
  chatId: string;
  isServer: boolean;
  isMobile: boolean;
  teamId: string;
  parentMessageId: string;
};

type State = {
  showFormForNewChat: boolean;
};

class ChatPage extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      showFormForNewChat: false,
    };
  }

  public componentDidMount() {
    const { isServer, chatId, store, teamId } = this.props;
    const { currentUser } = store;

    if (!isServer || !chatId) {
      if (currentUser) {
        currentUser.loadChatsStoreMethod({ teamId }).catch((err) => notify(err));
      }
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.chatId !== this.props.chatId) {
      this.setState({ showFormForNewChat: false });

      // const { chatId } = this.props;

      // const chat = this.getChat(chatId);

      // if (!isServer && chat) {
      //   chat.loadMessagesStoreMethod().catch((err) => notify(err));
      // }
    }
  }

  public render() {
    const { store, chatId, isMobile, teamId, isServer } = this.props;
    const { currentUser } = store;

    const { showFormForNewChat } = this.state;


    if (showFormForNewChat) {
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
                md={2}
                sm={12}
                xs={12}
                style={{ padding: '10px', borderRight: '1px solid #828282' }}
              >
                <ChatList
                  store={store}
                  isMobile={this.props.isMobile}
                  // parentSidebarRef={this.myRef}
                  teamId={teamId}
                  onPlusIconClick={this.onPlusIconClick}
                />
              </Grid>
              <Grid
                item
                md={10}
                sm={12}
                xs={12}
                style={{
                  padding: '20px',
                  marginTop: isMobile ? '20px' : 'none',
                  borderTop: 'none',
                  borderRight: isMobile ? 'none' : '1px solid #828282',
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '0px' : '0px 10px',
                    height: '100%',
                  }}
                >
                  <ChatDetail
                    store={store}
                    chat={null}
                    isServer={isServer}
                    isMobile={isMobile}
                    teamId={teamId}
                    key={showFormForNewChat.toString() + 'CD1'}
                    onCreationOfNewChat={this.onCreationOfNewChat}
                    onPlusIconClickPropForCD={this.onPlusIconClick}
                  />
                </div>
              </Grid>
            </Grid>
          </div>
        </Layout>
      );
    }

    const chat = this.getChat(chatId);

    if (!chat) {
      if (currentUser.isLoadingChats || store.isServer) {
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
                  md={2}
                  sm={12}
                  xs={12}
                  style={{ padding: '10px', borderRight: '1px solid #828282' }}
                >
                  <ChatList
                    store={store}
                    isMobile={this.props.isMobile}
                    teamId={teamId}
                    onPlusIconClick={this.onPlusIconClick}
                  />
                </Grid>
                <Grid
                  item
                  md={10}
                  sm={12}
                  xs={12}
                  style={{
                    padding: '20px',
                    marginTop: isMobile ? '20px' : 'none',
                    borderTop: 'none',
                    borderRight: isMobile ? 'none' : '1px solid #828282',
                  }}
                >
                  <div
                    style={{
                      padding: isMobile ? '0px' : '0px 10px',
                    }}
                  >
                    <div style={{ padding: isMobile ? '0px' : '0px 30px' }}>
                      <Loading text="Loading chat..." />
                    </div>
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
              <Head>
                <title>No Chat is found.</title>
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
                  md={2}
                  sm={12}
                  xs={12}
                  style={{ padding: '10px', borderRight: '1px solid #828282' }}
                >
                  <ChatList
                    store={store}
                    isMobile={this.props.isMobile}
                    teamId={teamId}
                    onPlusIconClick={this.onPlusIconClick}
                  />
                </Grid>
                <Grid
                  item
                  md={10}
                  sm={12}
                  xs={12}
                  style={{
                    padding: '20px',
                    marginTop: isMobile ? '20px' : 'none',
                    borderTop: 'none',
                    borderRight: isMobile ? 'none' : '1px solid #828282',
                  }}
                >
                  <div
                    style={{
                      padding: isMobile ? '0px' : '0px 10px',
                    }}
                  >
                    <div style={{ padding: isMobile ? '0px' : '0px 30px' }}>
                      <p>No chat is found.</p>
                    </div>
                  </div>
                </Grid>
              </Grid>
            </div>
          </Layout>
        );
      }
    }

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
              md={2}
              sm={12}
              xs={12}
              style={{ padding: '10px', borderRight: '1px solid #828282' }}
            >
              <ChatList
                store={store}
                isMobile={this.props.isMobile}
                teamId={teamId}
                onPlusIconClick={this.onPlusIconClick}
              />
            </Grid>
            <Grid
              item
              md={10}
              sm={12}
              xs={12}
              style={{
                padding: '20px',
                marginTop: isMobile ? '20px' : 'none',
                borderTop: 'none',
                borderRight: isMobile ? 'none' : '1px solid #828282',
              }}
            >
              <div
                style={{
                  padding: isMobile ? '0px' : '0px 10px',
                  height: '100%',
                }}
              >
                <ChatDetail
                  store={store}
                  chat={chat}
                  isServer={isServer}
                  isMobile={isMobile}
                  teamId={teamId}
                  key={showFormForNewChat.toString() + 'CD2'}
                  onCreationOfNewChat={this.onCreationOfNewChat}
                  onPlusIconClickPropForCD={this.onPlusIconClick}
                  parentMessageId={this.props.parentMessageId}
                />
              </div>
            </Grid>
          </Grid>
        </div>
      </Layout>
    );
  }

  private onPlusIconClick = () => {
    const { showFormForNewChat } = this.state;

    this.setState({ showFormForNewChat: !showFormForNewChat });
  };

  private onCreationOfNewChat = () => {
    this.setState({ showFormForNewChat: false });
  };

  private getChat(chatId: string): Chat {
    const { store } = this.props;
    const { currentUser } = store;

    if (chatId) {
      const selectedChat = currentUser.chatsForUser.find((c) => {
        return c.chatId === chatId;
      });

      return selectedChat;
    }

    return null;
  }
}

export default ChatPage;
