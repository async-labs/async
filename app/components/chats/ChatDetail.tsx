import React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CircleIcon from '@mui/icons-material/Circle';

import throttle from 'lodash/throttle';

import { observer } from 'mobx-react';
import moment from 'moment';

import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';

import { deleteFileThatHasNoMessageApiMethod } from '../../lib/api/to-api-server-team-member';

import { Store } from '../../lib/store';
import confirm from '../../lib/confirm';
import notify from '../../lib/notify';
import { Chat, Message } from '../../lib/store';

import Loading from '../common/Loading';
import MemberChooser from '../common/MemberChooser';
import MessageDetail from '../messages/MessageDetail';
import MessageForm from '../messages/MessageForm';
import SearchWithinChat from './SearchWithinChat';

type Props = {
  store?: Store;
  chat: Chat;
  isServer: boolean;
  isMobile: boolean;
  teamId: string;
  onCreationOfNewChat: () => void;
  onPlusIconClickPropForCD: () => void;
  parentMessageId?: string;
};

type State = {
  disabled: boolean;
  showMarkdownClicked: boolean;
  selectedMessage: Message;
  isDeletingNotification: boolean;
  isScrollJumpNeeded: boolean;
  isEditing: boolean;
  isCreatingNew: boolean;
  chatParticipantIds: string[];
  contentForMessage: string;
  filesForNewMessage: { fileName: string; fileUrl: string; addedAt: Date }[];
  chatSearchFormOpen: boolean;
  searchQuery: string;
  programmaticScroll: boolean;
  isMessageThreadOpen: boolean;
  selectedThreadMessage: Message;
  heightOfRows: number;
};

// markCommentAsRead should be manual (not automattic) for Discussion
// define markCommentAsUnread

function isMessageDivVisible(messageDiv: HTMLElement) {
  const { top } = messageDiv.getBoundingClientRect();

  const windowHeight = window.innerHeight || document.documentElement.clientHeight;

  if (windowHeight - top >= 100) {
    return true;
  }

  return false;
}

class ChatDetail extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this._isMounted = false;

    const { chat } = props;

    this.state = {
      disabled: false,
      showMarkdownClicked: false,
      selectedMessage: null,
      isDeletingNotification: false,
      isScrollJumpNeeded: true,
      isEditing: false,
      isCreatingNew: !chat ? true : false,
      chatParticipantIds: chat ? chat.chatParticipantIds : [],
      contentForMessage: '',
      filesForNewMessage: [],
      chatSearchFormOpen: false,
      searchQuery: '',
      programmaticScroll: false,
      isMessageThreadOpen: false,
      selectedThreadMessage: null,
      heightOfRows: 25,
    };
  }

  private storageKey: string = null;
  private _isMounted: boolean;

  private onScrollDebounced = throttle((event) => {
    event.stopPropagation();
    if (
      this.state.programmaticScroll ||
      this.props.store.currentUser.unreadByUserMessageIds.length === 0
    ) {
      this.setState({ programmaticScroll: false });
      return;
    } else {
      this.messagesWereSeen();
    }
  }, 500);

  public componentDidMount() {
    this._isMounted = true;

    const { isServer, chat, teamId } = this.props;

    if (this.props.parentMessageId) {
      const parentMessage = chat.messages.find((m) => m.messageId === this.props.parentMessageId);
      this.onThreadClickCallback(parentMessage, true);
    }

    if (chat && !chat.isLoadingMessages) {
      this.scrollToUnreadOrLastMessage(chat);
    }

    if (chat) {
      chat.store.socket.on('messageEvent', this.handleMessageEvent);
      chat.store.socket.on('reconnect', this.handleSocketReconnect);
      chat.joinChatSocketRoomStoreMethod();

      if (!isServer) {
        chat.loadMessagesStoreMethod(1).catch((e) => notify(e));
      }

      this.storageKey = `files-${teamId}-${chat.chatId}-new-message`;

      const filesForNewMessage =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];

      this.setState({ filesForNewMessage });
    }

    const div = document.getElementById('scrollable-messages');

    // const { currentUser } = store;

    if (div) {
      div.addEventListener('scroll', (event) => this.onScrollDebounced(event));
    }

    this.updateOnlineStatus(true);
    document.addEventListener('visibilitychange', this.updateOnlineStatusVisibilityChange);
  }

  private updateOnlineStatusVisibilityChange = (event) => {
    event.preventDefault();
    const { currentUser } = this.props.store;

    currentUser
      .sendOnlineStatusToServerStoreMethod(!document.hidden, this.props.teamId)
      .catch((e) => notify(e));
  };

  private updateOnlineStatus = (status) => {
    const { currentUser } = this.props.store;

    currentUser
      .sendOnlineStatusToServerStoreMethod(status, this.props.teamId)
      .catch((e) => notify(e));
  };

  public componentDidUpdate(prevProps: Props) {
    const { chat, teamId, store } = this.props;

    if (
      chat &&
      this.props.parentMessageId &&
      prevProps.parentMessageId !== this.props.parentMessageId &&
      this._isMounted
    ) {
      const parentMessage = chat.messages.find((m) => m.messageId === this.props.parentMessageId);
      this.onThreadClickCallback(parentMessage, true);
    }

    if (chat && prevProps.chat && prevProps.chat.chatId !== chat.chatId && this._isMounted) {
      this.setState({
        disabled: false,
        showMarkdownClicked: false,
        selectedMessage: null,
        isScrollJumpNeeded: true,
        isEditing: false,
        isCreatingNew: !chat ? true : false,
        chatParticipantIds: chat ? chat.chatParticipantIds : [],
        contentForMessage: '',
        filesForNewMessage: [],
        chatSearchFormOpen: false,
        searchQuery: '',
        programmaticScroll: false,
        isMessageThreadOpen: false,
        selectedThreadMessage: null,
        heightOfRows: 25,
      });

      if (chat && !chat.isLoadingMessages) {
        this.scrollToUnreadOrLastMessage(chat);
      }

      prevProps.chat.leaveChatSocketRoomStoreMethod();
      chat.joinChatSocketRoomStoreMethod();
      chat.loadMessagesStoreMethod(1).catch((e) => notify(e));

      this.storageKey = `files-${teamId}-${chat.chatId}-new-message`;

      const filesForNewMessage =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];

      if (this._isMounted) {
        this.setState({ filesForNewMessage });
      }

      const div = document.getElementById('scrollable-messages');

      // const { currentUser } = store;

      if (div) {
        div.addEventListener('scroll', (event) => this.onScrollDebounced(event));
      }

      this.updateOnlineStatus(true);
      document.addEventListener('visibilitychange', this.updateOnlineStatusVisibilityChange);
    }

    if (
      chat &&
      chat.messages.length === 1 &&
      store.currentUser.unreadByUserMessageIds.length > 0 &&
      this._isMounted
    ) {
      const div = document.getElementById('scrollable-messages');

      if (div) {
        div.addEventListener('scroll', (event) => this.onScrollDebounced(event));
      }
    }

    if (store.currentUser.unreadByUserMessageIds.length > 0 && this._isMounted) {
      this.messagesWereSeen();
    }
  }

  public componentWillUnmount() {
    this._isMounted = false;

    const { chat } = this.props;

    if (chat) {
      chat.leaveChatSocketRoomStoreMethod();
      chat.store.socket.off('messageEvent', this.handleMessageEvent);
      chat.store.socket.off('reconnect', this.handleSocketReconnect);
    }

    const div = document.getElementById('scrollable-messages');

    if (div) {
      div.removeEventListener('scroll', this.onScrollDebounced);
    }

    if (document) {
      document.removeEventListener('visibilitychange', this.updateOnlineStatusVisibilityChange);
      this.updateOnlineStatus(false);
    }
  }

  public render() {
    // https://github.com/mobxjs/mobx-react#class-components
    // so the component will react to all changes in props and state that are used by render.

    const { chat, isMobile, store, teamId } = this.props;
    const { currentUser } = store;
    const { isCreatingNew, isEditing } = this.state;

    let title;

    if (isCreatingNew && !isEditing && !chat) {
      title = 'Create chat';
    } else if (isEditing && !isCreatingNew && chat) {
      title = 'Edit chat: ';
    } else {
      title = 'Chat: ';
    }

    let loading = 'loading messages ...';
    if (chat && chat.messages.length > 0) {
      loading = 'loading messages ...';
    }

    return (
      <div
        style={{
          position: 'relative',
        }}
      >
        <Head>
          <title>
            {title}{' '}
            {chat && chat.members.length > 1 ? chat.members.length + ' people ' : 'You only '}(
            {chat
              ? chat.members
                  .map((m) => {
                    return m['userName'];
                  })
                  .join(', ')
              : ''}
            )
          </title>
        </Head>
        <div
          style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{ flexBasis: isMobile ? '100%' : 'none', display: 'flex', alignItems: 'center' }}
          >
            <div
              style={{
                flexBasis: isMobile
                  ? '100%'
                  : this.state.isEditing || this.state.isCreatingNew
                  ? '100%'
                  : '50%',
                display: 'flex',
              }}
            >
              <p>{title}</p>
              {chat
                ? chat.members.map((m) => (
                    <div
                      key={m._id + '-tooltip-avatar'}
                      style={{
                        marginTop: '-16px',
                      }}
                    >
                      <CircleIcon
                        style={{
                          fontSize: '10px',
                          color: m.isTeamMemberOnline ? '#00c900' : 'gray',
                          marginLeft: '33px',
                          marginBottom: '-10px',
                        }}
                      />
                      <Tooltip
                        title={m.userName || m.email}
                        placement="top"
                        disableFocusListener
                        disableTouchListener
                      >
                        <Avatar
                          src={m.userAvatarUrl}
                          sx={{
                            // verticalAlign: 'middle',
                            marginLeft: '5px',
                          }}
                        />
                      </Tooltip>
                    </div>
                  ))
                : null}
            </div>
          </div>
          <div
            style={{
              zIndex: 1000,
              cursor: 'pointer',
              marginLeft: 'auto',
              order: 2,
            }}
          >
            {chat && isEditing && !isCreatingNew ? (
              <>
                <Button
                  variant="contained"
                  color="secondary"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={this.deleteChat}
                >
                  Delete
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={this.clearChatHistory}
                  style={{ marginLeft: '20px' }}
                >
                  Clear history
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={this.createOrUpdateChat}
                  style={{ marginLeft: '15px' }}
                >
                  Save changes
                </Button>
                <Button
                  variant="outlined"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={() => this.setState({ isEditing: false })}
                  style={{
                    marginLeft: '15px',
                    color: currentUser.showDarkTheme ? '#fff' : '#000',
                    border: currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}
          </div>
          {isCreatingNew || isEditing ? null : (
            <>
              {chat && chat.isLoadingMessages && !store.isServer ? (
                <Loading
                  text={loading}
                  style={{
                    margin: '15px auto 0px -40px',
                    fontSize: '13px',
                    order: 3,
                  }}
                />
              ) : null}
              {chat &&
              !chat.isLoadingMessages &&
              chat.typingChatParticipants &&
              chat.typingChatParticipants.length > 0 ? (
                <Loading
                  style={{
                    margin: '15px auto 0px -40px',
                    fontSize: '13px',
                    order: 3,
                  }}
                  text={
                    chat.typingChatParticipants.length === 1
                      ? `${
                          chat.typingChatParticipants[0].userName ||
                          chat.typingChatParticipants[0].email
                        } typing ...`
                      : `Multiple users typing ...`
                  }
                />
              ) : null}
              <TextField
                autoComplete="off"
                autoFocus={false}
                variant="outlined"
                size="small"
                value={this.state.searchQuery}
                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                placeholder="Search this chat"
                style={{
                  margin: '20px 5px 15px 0px',
                  fontSize: '14px',
                  fontFamily: 'Roboto, sans-serif',
                  order: 4,
                  background: store.currentUser.showDarkTheme ? 'none' : '#fff',
                }}
                onKeyPress={(event) => {
                  event.stopPropagation();
                  this.searchOnPress(event);
                }}
                InputProps={{
                  endAdornment: (
                    <SearchRoundedIcon
                      onClick={(event) => {
                        event.stopPropagation();
                        this.searchOnClick();
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  ),
                  style: { fontSize: '14px', float: 'right' },
                }}
              />
            </>
          )}
          <div
            style={{
              zIndex: 1000,
              cursor: 'pointer',
              marginLeft: '80px',
              order: 5,
              display: this.state.isEditing ? 'none' : 'inherit',
            }}
          >
            {(chat && chat.chatCreatorId === currentUser._id) ||
            currentUser.currentTeam.teamLeaderEmail === currentUser.email ? (
              <MoreVertIcon
                style={{
                  fontSize: '18px',
                }}
                onClick={() => this.setState({ isEditing: true })}
              />
            ) : null}
          </div>
        </div>

        {isMobile ? null : <hr style={{ margin: '20px 0px' }} />}

        <div style={{ margin: '10px 0' }}>
          <p />
          {isEditing || isCreatingNew ? (
            <>
              <h4 style={{ marginBottom: '12px' }}>Select participants (required)</h4>
              <MemberChooser
                label="Select participants to join chat"
                placeholder="These team members will see and participate in this chat"
                onChange={(chatParticipantIds) => this.setState({ chatParticipantIds })}
                members={currentUser.currentTeam.members.filter((m) => m._id !== currentUser._id)}
                selectedMemberIds={this.state.chatParticipantIds}
              />
            </>
          ) : null}
        </div>
        <div
          style={{
            height: isCreatingNew || isEditing ? null : 'calc(100% - 0px)',
          }}
        >
          {isEditing || isCreatingNew ? null : this.renderMessages()}
        </div>
        <p />
        <br />
        {this.state.selectedMessage || this.state.isMessageThreadOpen || isCreatingNew
          ? null
          : this.renderMessageForm(null)}
        <p />
        {!chat && isCreatingNew ? (
          <>
            <Button
              variant="contained"
              color="primary"
              type="button"
              disabled={this.state.disabled}
              onClick={this.createOrUpdateChat}
              style={{ float: 'right' }}
            >
              Create chat
            </Button>
            <Button
              variant="outlined"
              type="button"
              disabled={this.state.disabled}
              onClick={() => this.props.onPlusIconClickPropForCD()}
              style={{
                float: 'right',
                marginRight: '20px',
                color: currentUser.showDarkTheme ? '#fff' : '#000',
                border: currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
              }}
            >
              Cancel
            </Button>
          </>
        ) : null}
        <p />
        <br />
        {this.state.chatSearchFormOpen && !isCreatingNew && !isEditing ? (
          <SearchWithinChat
            title={'Search results for query: '}
            search={currentUser.searchWithinChatStoreMethod.bind(currentUser)}
            open={this.state.chatSearchFormOpen}
            query={this.state.searchQuery}
            onClose={() => {
              this.setState({ chatSearchFormOpen: false, searchQuery: '' });
            }}
            teamId={teamId}
            chatId={chat && chat.chatId}
          />
        ) : null}
      </div>
    );
  }

  private createOrUpdateChat = async () => {
    const { currentUser } = this.props.store;
    const { chatParticipantIds, contentForMessage } = this.state;
    const { teamId } = this.props;

    if (chatParticipantIds && !chatParticipantIds.includes(currentUser._id)) {
      chatParticipantIds.push(currentUser._id);
    }

    // if (chatParticipantIds.length < 2) {
    //   notify('Please select at least one other participant.');
    //   return;
    // }

    const { currentTeam } = currentUser;

    console.log('654', currentTeam.isSubscriptionActiveForTeam);

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
      const chat = await currentUser.createOrUpdateChatStoreMethod({
        chatParticipantIds,
        teamId,
        id: this.props.chat ? this.props.chat.chatId : null,
        content: contentForMessage,
      });

      if (!chat) {
        notify('This chat already exists inside this team.');
        return;
      } else {
        if (this.props.chat && this.props.chat.chatId) {
          notify('You updated chat.');
        } else {
          notify('You created new chat.');
        }

        Router.push(
          `/chat?teamId=${teamId}&chatId=${chat.chatId}`,
          `/teams/${teamId}/chats/${chat.chatId}`,
        );
      }
    } catch (error) {
      console.log(error.message);
    } finally {
      NProgress.done();
      this.setState({
        disabled: false,
        isEditing: false,
        isCreatingNew: false,
        chatParticipantIds: this.props.chat ? this.props.chat.chatParticipantIds : [],
      });
    }
  };

  private deleteChat = async () => {
    const { chat, teamId, store } = this.props;

    const { currentUser } = store;

    if (!chat) {
      return;
    }

    confirm({
      title: 'Delete chat',
      message:
        'When you delete chat, you delete chat, all messages and all attached files within it. Are you sure?',
      okText: 'Yes, delete',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          await currentUser.deleteChatStoreMethod({
            chatId: chat.chatId,
            teamId,
          });

          notify(`You deleted chat.`);
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

  private clearChatHistory = async () => {
    const { chat, teamId, store } = this.props;

    const { currentUser } = store;

    if (!chat) {
      return;
    }

    confirm({
      title: 'Clear chat history',
      message:
        'When you clear chat history, you preserve chat but you delete all messages and all attached files within it. Are you sure?',
      okText: 'Yes, clear',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          await currentUser.clearChatHistoryStoreMethod({
            chatId: chat.chatId,
            teamId,
          });

          notify(`You cleared chat history.`);

          Router.push(
            `/chat?teamId=${teamId}&chatId=${chat.chatId}`,
            `/teams/${teamId}/chats/${chat.chatId}`,
          );
        } catch (error) {
          console.error(error);
          notify(error);
        } finally {
          this.setState({
            disabled: false,
            isEditing: false,
            selectedMessage: null,
            isMessageThreadOpen: false,
          });
          NProgress.done();
        }
      },
    });
  };

  private renderMessages() {
    const { chat, teamId, store, isMobile } = this.props;
    const { selectedMessage, showMarkdownClicked, selectedThreadMessage } = this.state;

    if (chat && !chat.isLoadingMessages && chat.messages.length === 0) {
      return <p>Empty chat.</p>;
    }

    const isThemeDark = store.currentUser.showDarkTheme === true;

    return (
      <div
        id="scrollable-messages"
        style={{
          overflowY: 'auto',
          maxHeight: this.state.selectedMessage
            ? 'calc(100% - 200px)'
            : isMobile
            ? `calc(100% - ${210 + this.state.heightOfRows}px)`
            : `calc(100% - ${330 + this.state.heightOfRows}px)`,
          display: 'flex',
          flexDirection: 'column',
          width: isMobile ? 'calc(100% - 20px)' : 'calc(83.33% - 60px)',
          position: 'fixed',
          left: isMobile ? '10px' : null,
          top: isMobile ? '125px' : '220px',
          paddingTop: isMobile ? '0px' : '10px',
          paddingLeft: isMobile ? '0px' : '10px',
          backgroundColor: isThemeDark ? '#161b22' : '#fff',
        }}
      >
        {chat
          ? chat.messages.map((m) =>
              selectedMessage &&
              !selectedThreadMessage &&
              selectedMessage.messageId === m.messageId &&
              !this.state.isMessageThreadOpen ? (
                <div key={m.messageId + '-render-messages-1'}>
                  <MessageDetail
                    message={m}
                    onEditClick={this.onEditClickCallback}
                    onShowMarkdownClick={this.onShowMarkdownClickCallback}
                    onThreadClick={this.onThreadClickCallback}
                    isMessageThreadOpen={this.state.isMessageThreadOpen}
                    isMobile={this.props.isMobile}
                    teamId={teamId}
                    isUnread={m.isMessageUnreadByUser}
                    store={this.props.store}
                    isMessageSelected={
                      this.state.selectedMessage &&
                      this.state.selectedMessage.messageId === m.messageId
                        ? true
                        : false
                    }
                    chat={chat}
                  />
                  <MessageForm
                    message={m}
                    readOnly={showMarkdownClicked}
                    chat={chat}
                    members={chat.members}
                    onFinished={() => {
                      setTimeout(() => {
                        this.setState({ selectedMessage: null, disabled: false });
                      }, 0);
                    }}
                    teamId={teamId}
                    onContentChangeInMessageForm={this.onContentChangedInChatDetail}
                    onFileUploadProp2={this.onFileUpload}
                    onLocalStorageUpdate2={this.onLocalStorageUpdate}
                    parentMessageId={null}
                    isMobile={this.props.isMobile}
                    heightForMessageEditor={
                      typeof window !== 'undefined' &&
                      document.getElementById(`message-${m.messageId}`).offsetHeight
                    }
                  />
                  <div style={{ fontSize: '13px', margin: '-10px 0px 0px 45px' }}>
                    {m && m.files && m.files.length
                      ? m.files.map((f, i) => (
                          <div key={m.messageId + f.fileUrl + 'anchor-1'}>
                            <a
                              href={f.fileUrl}
                              rel="nofollow noopener noreferrer"
                              target="_blank"
                              style={{ color: '#0077ff', cursor: 'pointer' }}
                            >
                              {f.fileName}
                            </a>
                            {this.state.selectedMessage ? (
                              <DeleteIcon
                                data-id={f.fileUrl}
                                style={{
                                  fontSize: '16px',
                                  color: 'darkred',
                                  verticalAlign: 'bottom',
                                  margin: 'auto 5px',
                                  cursor: 'pointer',
                                }}
                                onClick={this.deleteFile}
                              />
                            ) : null}
                            {i === m.files.length - 1 ? null : ' | '}
                          </div>
                        ))
                      : null}
                  </div>
                  <div
                    style={{
                      zIndex: 1000,
                      marginLeft: 'auto',
                      marginRight: '20px',
                      marginTop: '10px',
                      marginBottom: '20px',
                      float: 'right',
                    }}
                  >
                    <Button
                      variant="contained"
                      color="secondary"
                      type="button"
                      disabled={this.state.disabled}
                      onClick={this.deleteMessage}
                      style={{
                        marginLeft: isMobile ? '40px' : 'inherit',
                        marginTop: isMobile ? '20px' : 'inherit',
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outlined"
                      type="button"
                      disabled={this.state.disabled}
                      onClick={() => this.setState({ selectedMessage: null })}
                      style={{
                        marginLeft: isMobile ? '20px' : '20px',
                        marginRight: '0px',
                        marginTop: isMobile ? '20px' : 'inherit',
                        color: store.currentUser.showDarkTheme ? '#fff' : '#000',
                        border: store.currentUser.showDarkTheme
                          ? '1px solid #fff'
                          : '1px solid #000',
                      }}
                    >
                      Exit editing
                    </Button>
                    {/* <Button
                      variant="contained"
                      color="primary"
                      type="button"
                      disabled={
                        this.state.disabled ||
                        (this.state.selectedMessage &&
                          this.state.selectedMessage.content === this.state.contentForMessage)
                          ? true
                          : false
                      }
                      onClick={this.editMessage}
                      style={{
                        marginLeft: isMobile ? '40px' : 'inherit',
                        marginTop: isMobile ? '20px' : '0px',
                      }}
                    >
                      Save changes
                    </Button> */}
                  </div>
                  <p />
                  <br />
                </div>
              ) : (
                <div key={m.messageId + '-render-messages-2'}>
                  {chat.numberOfMessagesPerChat > chat.messages.length &&
                  chat.messages[0].messageId === m.messageId ? (
                    <p style={{ margin: '20px' }}>
                      <a
                        style={{ cursor: 'pointer', fontWeight: 600 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          this.loadMoreMessages();
                        }}
                      >
                        Load more
                      </a>{' '}
                      messages.
                    </p>
                  ) : null}
                  {chat.numberOfMessagesPerChat === chat.messages.length &&
                  chat.messages[0].messageId === m.messageId ? (
                    <p style={{ margin: '20px' }}>
                      No more messages. You reached the end of this chat.
                    </p>
                  ) : null}
                  <div
                    data-message-id={m.messageId}
                    style={{
                      display: 'flex',
                    }}
                    // onClick={this.messagesWereSeen}
                  >
                    <MessageDetail
                      message={m}
                      onEditClick={this.onEditClickCallback}
                      onShowMarkdownClick={this.onShowMarkdownClickCallback}
                      onThreadClick={this.onThreadClickCallback}
                      isMessageThreadOpen={this.state.isMessageThreadOpen}
                      isMobile={this.props.isMobile}
                      teamId={teamId}
                      isUnread={m.isMessageUnreadByUser}
                      store={this.props.store}
                      isMessageSelected={
                        this.state.selectedMessage &&
                        this.state.selectedMessage.messageId === m.messageId
                          ? true
                          : false
                      }
                      chat={chat}
                    />
                  </div>
                  <div style={{ fontSize: '13px', margin: '5px 0px 20px 25px' }}>
                    {m &&
                      m.files &&
                      m.files.map((f, i) => (
                        <div key={m.messageId + f.fileUrl + 'anchor-2'}>
                          <a
                            href={f.fileUrl}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                            style={{ color: '#0077ff', cursor: 'pointer' }}
                          >
                            {f.fileName}
                          </a>
                          {i === m.files.length - 1 ? null : ' | '}
                        </div>
                      ))}
                  </div>{' '}
                  {this.state.selectedMessage &&
                  this.state.selectedMessage.messageId === m.messageId &&
                  this.state.isMessageThreadOpen &&
                  !m.parentMessageId ? (
                    <div
                      id={'message-thread-' + m.messageId}
                      key={'message-thread-' + m.messageId}
                      style={{ width: '95%', margin: '0px auto' }}
                    >
                      <p>Thread:</p>

                      <div
                        style={{
                          height:
                            this.state.isCreatingNew || this.state.isEditing
                              ? null
                              : 'calc(100% - 0px)',
                        }}
                      >
                        <p />
                        {this.state.isCreatingNew || this.state.isEditing
                          ? null
                          : this.renderThreadMessages()}
                      </div>
                      <p />
                      <br />
                      {this.state.selectedThreadMessage || this.state.isCreatingNew
                        ? null
                        : this.renderMessageForm(m.messageId)}
                    </div>
                  ) : null}
                  {chat.numberOfMessagesPerChat > chat.messages.length &&
                  chat.messages[chat.messages.length - 1].messageId === m.messageId ? (
                    <>
                      <p style={{ margin: '20px' }}>This is the start of this chat.</p>
                      <br />
                    </>
                  ) : null}
                </div>
              ),
            )
          : null}
      </div>
    );
  }

  private renderThreadMessages() {
    const { chat, teamId, store } = this.props;
    const { selectedMessage, selectedThreadMessage, showMarkdownClicked } = this.state;

    if (
      selectedMessage &&
      !selectedMessage.isLoadingThreadMessages &&
      selectedMessage.messagesInsideThread.length === 0
    ) {
      return <p>This thread is empty.</p>;
    }

    return (
      <div
        id="messages-inside-thread"
        style={{
          display: 'flex',
          flexDirection: 'column',
          margin: '0px auto',
        }}
      >
        {selectedMessage
          ? selectedMessage.messagesInsideThread.map((mit) =>
              selectedThreadMessage &&
              selectedThreadMessage.messageId === mit.messageId &&
              this.state.isMessageThreadOpen ? (
                <div key={mit.messageId + '-render-thread-messages-1'}>
                  <MessageDetail
                    message={mit}
                    onEditClick={this.onEditClickCallback}
                    onShowMarkdownClick={this.onShowMarkdownClickCallback}
                    onThreadClick={null}
                    isMessageThreadOpen={false}
                    isMobile={this.props.isMobile}
                    teamId={teamId}
                    isUnread={mit.isMessageUnreadByUser}
                    store={this.props.store}
                    isMessageSelected={this.state.selectedThreadMessage ? true : false}
                    chat={chat}
                  />
                  <MessageForm
                    message={mit}
                    readOnly={showMarkdownClicked}
                    chat={chat}
                    members={chat.members}
                    onFinished={() => {
                      setTimeout(() => {
                        this.setState({
                          selectedThreadMessage: null,
                          disabled: false,
                          selectedMessage,
                        });
                      }, 0);
                    }}
                    teamId={teamId}
                    onContentChangeInMessageForm={this.onContentChangedInChatDetail}
                    onFileUploadProp2={this.onFileUpload}
                    onLocalStorageUpdate2={this.onLocalStorageUpdate}
                    parentMessageId={mit.parentMessageId}
                    isMobile={this.props.isMobile}
                    heightForMessageEditor={
                      typeof window !== 'undefined' &&
                      document.getElementById(`thread-message-${mit.messageId}`).offsetHeight
                    }
                  />
                  <div style={{ fontSize: '13px', margin: '-10px 0px 0px 45px' }}>
                    {mit && mit.files && mit.files.length > 0
                      ? mit.files.map((f, i) => (
                          <div key={mit.messageId + f.fileUrl + 'anchor-3'}>
                            <a
                              href={f.fileUrl}
                              rel="nofollow noopener noreferrer"
                              target="_blank"
                              style={{ color: '#0077ff', cursor: 'pointer' }}
                            >
                              {f.fileName}
                            </a>
                            {this.state.selectedThreadMessage ? (
                              <DeleteIcon
                                data-id={f.fileUrl}
                                style={{
                                  fontSize: '16px',
                                  color: 'darkred',
                                  verticalAlign: 'bottom',
                                  margin: 'auto 5px',
                                  cursor: 'pointer',
                                }}
                                onClick={this.deleteFile}
                              />
                            ) : null}
                            {i === mit.files.length - 1 ? null : ' | '}
                          </div>
                        ))
                      : null}
                  </div>

                  <div
                    style={{
                      marginLeft: 'auto',
                      marginRight: '0px',
                      marginTop: '10px',
                      marginBottom: '20px',
                      float: 'right',
                    }}
                  >
                    <Button
                      variant="contained"
                      color="secondary"
                      type="button"
                      disabled={this.state.disabled}
                      onClick={this.deleteMessage}
                      style={{ marginLeft: '15px' }}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outlined"
                      type="button"
                      disabled={this.state.disabled}
                      onClick={() => this.setState({ selectedThreadMessage: null })}
                      style={{
                        marginLeft: '20px',
                        marginRight: '20px',
                        color: store.currentUser.showDarkTheme ? '#fff' : '#000',
                        border: store.currentUser.showDarkTheme
                          ? '1px solid #fff'
                          : '1px solid #000',
                      }}
                    >
                      Exit editing
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={mit.messageId + '-render-thread-messages-2'}>
                  <div
                    data-message-id={mit.messageId}
                    style={{
                      display: 'flex',
                    }}
                    // onClick={this.messagesWereSeen}
                  >
                    {/* <div
                      style={{
                        minWidth: '11px',
                        minHeight: '10px',
                      }}
                    >
                      {mit.isMessageUnreadByUser && mit.createdUserId !== store.currentUser._id ? (
                        <CircleIcon
                          style={{
                            fontSize: '12px',
                            zIndex: 1000,
                          }}
                          data-message-id={mit.messageId}
                        />
                      ) : null}
                    </div> */}
                    <MessageDetail
                      message={mit}
                      onEditClick={this.onEditClickCallback}
                      onShowMarkdownClick={this.onShowMarkdownClickCallback}
                      onThreadClick={null}
                      isMessageThreadOpen={false}
                      isMobile={this.props.isMobile}
                      teamId={teamId}
                      isUnread={mit.isMessageUnreadByUser}
                      store={this.props.store}
                      isMessageSelected={this.state.selectedThreadMessage ? true : false}
                      chat={chat}
                    />
                  </div>
                  <div style={{ fontSize: '13px', margin: '5px 0px 20px 25px' }}>
                    {mit &&
                      mit.files &&
                      mit.files.map((f, i) => (
                        <div key={mit.messageId + f.fileUrl + 'anchor-4'}>
                          <a
                            href={f.fileUrl}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                            style={{ color: '#0077ff', cursor: 'pointer' }}
                          >
                            {f.fileName}
                          </a>
                          {i === mit.files.length - 1 ? null : ' | '}
                        </div>
                      ))}
                  </div>{' '}
                </div>
              ),
            )
          : null}
      </div>
    );
  }

  private renderMessageForm(parentMessageId) {
    const { teamId, chat } = this.props;
    const { selectedMessage, isCreatingNew, isEditing, filesForNewMessage } = this.state;

    if (chat && chat.isLoadingMessages && chat.messages.length === 0) {
      return null;
    }

    let textForMessageForm;

    if (chat && !isEditing && !isCreatingNew) {
      textForMessageForm = '';
    } else if (chat && isEditing && !isCreatingNew) {
      textForMessageForm = '';
    } else if (!chat && !isEditing && isCreatingNew) {
      textForMessageForm = '';
    }

    return (
      <React.Fragment>
        <h4 style={{ marginTop: '0px' }}>{textForMessageForm}</h4>
        {!selectedMessage && isEditing ? null : (
          <>
            <MessageForm
              key={'mf-new'}
              message={null}
              chat={chat}
              members={chat && chat.members}
              teamId={teamId}
              onContentChangeInMessageForm={this.onContentChangedInChatDetail}
              onFileUploadProp2={this.onFileUpload}
              onLocalStorageUpdate2={this.onLocalStorageUpdate}
              isOnChatPage={true}
              parentMessageId={parentMessageId}
              isMobile={this.props.isMobile}
              heightForMessageEditor={0}
            />
            <div style={{ fontSize: '13px', position: 'fixed', bottom: '4px' }}>
              {chat && !isEditing && !isCreatingNew && filesForNewMessage.length > 0
                ? filesForNewMessage.map((f, i) => (
                    <div key={chat.chatId + f.fileUrl + 'anchor-MF'}>
                      <a
                        href={f.fileUrl}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        style={{ color: '#0077ff', cursor: 'pointer' }}
                      >
                        {f.fileName}
                      </a>
                      <DeleteIcon
                        data-id={f.fileUrl}
                        style={{
                          fontSize: '16px',
                          color: 'darkred',
                          verticalAlign: 'bottom',
                          margin: 'auto 5px',
                          cursor: 'pointer',
                        }}
                        onClick={this.deleteFileThatHasNoMessage}
                      />
                      {i === filesForNewMessage.length - 1 ? null : ' | '}
                    </div>
                  ))
                : null}
            </div>
          </>
        )}
      </React.Fragment>
    );
  }

  private onContentChangedInChatDetail = (content: string, heightOfRows: number) => {
    this.setState({ contentForMessage: content, heightOfRows });
  };

  private onFileUpload = (isFileUploading: boolean) => {
    this.setState({ disabled: isFileUploading });
  };

  private onLocalStorageUpdate = () => {
    const { chat, teamId } = this.props;

    if (chat) {
      this.storageKey = `files-${teamId}-${chat.chatId}-new-message`;

      const filesForNewMessage =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];

      this.setState({ filesForNewMessage });
    }
  };

  private handleMessageEvent = (data) => {
    const { chat } = this.props;
    if (chat) {
      chat.handleMessageRealtimeEventStoreMethod(data);
    }
  };

  private handleSocketReconnect = () => {
    const { chat } = this.props;
    if (chat) {
      chat.loadMessagesStoreMethod(1).catch((err) => notify(err));
      chat.joinChatSocketRoomStoreMethod();
    }
  };

  private onEditClickCallback = (message: Message) => {
    const { store } = message;

    if (message && message.parentMessageId) {
      if (store.currentUser && message.createdUserId === store.currentUser._id) {
        const selectedMessage = this.props.chat.messages.find(
          (m) => m.messageId === message.parentMessageId,
        );

        this.setState({
          selectedMessage,
          selectedThreadMessage: message,
          showMarkdownClicked: false,
          contentForMessage: selectedMessage.content,
        });
      }
    } else {
      if (store.currentUser && message.createdUserId === store.currentUser._id) {
        this.setState({
          selectedMessage: message,
          showMarkdownClicked: false,
          contentForMessage: message.content,
        });
      }
    }
  };

  private onShowMarkdownClickCallback = (message) => {
    this.setState({ selectedMessage: message, showMarkdownClicked: true });
  };

  private onThreadClickCallback = async (message: Message, open: boolean) => {
    if (this.props.isMobile) {
      notify('Threads are not available on mobile browser.');
      return;
    }

    if (open) {
      await message
        .loadThreadMessagesStoreMethod(message.chatId, message.messageId, this.props.teamId)
        .catch((e) => notify(e));
      this.setState({ selectedMessage: message, isMessageThreadOpen: true });
    } else {
      this.setState({ selectedMessage: null, isMessageThreadOpen: false });
    }
  };

  // done: add selectedThreadMessage
  private deleteMessage = async () => {
    const { chat, teamId } = this.props;
    const { selectedMessage, selectedThreadMessage } = this.state;

    if (!chat) {
      return;
    }

    confirm({
      title: 'Delete message',
      message:
        'When you delete message, you delete message from chat and all files attached to this message (if any). Are you sure?',
      okText: 'Yes, delete',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          await chat.deleteMessageStoreMethod({
            message: selectedThreadMessage || selectedMessage,
            teamId,
          });

          notify(`You deleted message.`);
        } catch (error) {
          console.error(error);
          notify(error);
        } finally {
          if (selectedThreadMessage) {
            this.setState({
              disabled: false,
              selectedMessage,
              selectedThreadMessage: null,
              isScrollJumpNeeded: true,
            });
          } else {
            this.setState({ disabled: false, selectedMessage: null, isScrollJumpNeeded: true });
          }
          if (chat && !chat.isLoadingMessages) {
            this.scrollToUnreadOrLastMessage(chat);
          }
          NProgress.done();
        }
      },
    });
  };

  // done: add selectedThreadMessage
  private deleteFile = async (event) => {
    const { chat, teamId } = this.props;
    const { selectedMessage, selectedThreadMessage } = this.state;

    const fileUrl = event.currentTarget.dataset.id;

    if (!chat) {
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      if (selectedThreadMessage) {
        await selectedThreadMessage.deleteFileStoreMethod({
          messageId: selectedThreadMessage.messageId,
          teamId,
          fileUrl,
        });
      } else {
        await selectedMessage.deleteFileStoreMethod({
          messageId: selectedMessage.messageId,
          teamId,
          fileUrl,
        });
      }

      notify(`You deleted file.`);
    } catch (error) {
      console.error(error);
      notify(error);
    } finally {
      if (selectedThreadMessage) {
        this.setState({ disabled: false, selectedMessage, selectedThreadMessage: null });
      } else {
        this.setState({ disabled: false, selectedMessage: null });
      }
      NProgress.done();
    }
  };

  private deleteFileThatHasNoMessage = async (event) => {
    const { chat, teamId } = this.props;

    const fileUrl = event.currentTarget.dataset.id;

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await deleteFileThatHasNoMessageApiMethod({
        teamId,
        fileUrl,
      });

      if (typeof localStorage !== 'undefined' && chat && !this.state.selectedMessage && fileUrl) {
        this.storageKey = `files-${teamId}-${chat.chatId}-new-message`;

        const filesForNewMessage = (JSON.parse(localStorage.getItem(this.storageKey)) || []).filter(
          (f) => f.fileUrl !== fileUrl,
        );

        if (this.storageKey) {
          localStorage.setItem(this.storageKey, JSON.stringify(filesForNewMessage));
        }

        this.setState({ filesForNewMessage });
      }

      notify(`You deleted file.`);
    } catch (error) {
      console.error(error);
      notify(error);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private messagesWereSeen = async () => {
    if (document.hidden) {
      return;
    }

    const { chat, store } = this.props;
    const { currentUser } = store;

    const messageIds = [];

    const unreadMessagesLevelOne =
      chat && chat.messages.filter((m) => currentUser.unreadByUserMessageIds.includes(m.messageId));

    // works
    if (unreadMessagesLevelOne && unreadMessagesLevelOne.length > 0) {
      for (const umlo of unreadMessagesLevelOne) {
        const unreadMessagesLevelTwo = umlo.messagesInsideThread.filter((mit) =>
          currentUser.unreadByUserMessageIds.includes(mit.messageId),
        );

        if (unreadMessagesLevelTwo.length > 0) {
          for (const threadMessage of unreadMessagesLevelTwo) {
            const threadMessageDiv = document.getElementById(
              `thread-message-${threadMessage.messageId}`,
            );

            if (threadMessageDiv && isMessageDivVisible(threadMessageDiv)) {
              messageIds.push(threadMessage.messageId);
            }
          }
        } else {
          const parentMessageDiv = document.getElementById(`message-${umlo.messageId}`);
          if (parentMessageDiv && isMessageDivVisible(parentMessageDiv)) {
            messageIds.push(umlo.messageId);
          }
        }
      }
    }

    if (messageIds && messageIds.length > 0) {
      setTimeout(async () => {
        await currentUser.messagesWereSeenStoreMethod(messageIds, this.props.teamId, chat.chatId);
      }, 2500);
    } else {
      return;
    }
  };

  private loadMoreMessages = async () => {
    const { chat } = this.props;

    if (chat.numberOfMessagesPerChat > chat.messages.length) {
      const limit = 25;

      const batchNumberForMessages = chat.messages.length / limit + 1;

      chat.loadMessagesStoreMethod(batchNumberForMessages).catch((e) => notify(e));
    }
  };

  private scrollToUnreadOrLastMessage = (chat: Chat) => {
    if (!this.state.isScrollJumpNeeded || chat.messages.length === 0) {
      return;
    }

    let message: Message;
    if (chat.isChatUnreadForUser) {
      // define
      for (const m of chat.messages) {
        if (m.isMessageUnreadByUser && m.createdUserId !== this.props.store.currentUser._id) {
          // define
          message = m;
          break;
        }
      }
    } else {
      message = chat.messages[chat.messages.length - 1];
    }

    if (!message) {
      return;
    }

    this.setState({ programmaticScroll: true });

    const wrapperElm = document.getElementById(`message-${message.messageId}`);

    if (!wrapperElm) {
      return;
    }

    wrapperElm.scrollIntoView();
    this.setState({ isScrollJumpNeeded: false });
  };

  private searchOnPress = (event) => {
    if (event.key === 'Enter' && (event.code === 'Enter' || event.code === 'NumpadEnter')) {
      this.setState({ chatSearchFormOpen: true });
    } else {
      this.setState({ searchQuery: event.target.value });
    }
  };

  private searchOnClick = () => {
    if (!this.state.searchQuery) {
      notify('Empty query. Please add query to search.');
      return;
    } else {
      this.setState({ chatSearchFormOpen: true });
    }
  };
}

export default observer(ChatDetail);
