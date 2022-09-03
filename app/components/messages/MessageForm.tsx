// import Button from '@mui/material/Button';
// import IconButton from '@mui/material/IconButton';
// import SendIcon from '@mui/icons-material/Send';

import { inject, observer } from 'mobx-react';
import moment from 'moment';

import NProgress from 'nprogress';
import React from 'react';

import notify from '../../lib/notify';
import { Chat, Message, Store } from '../../lib/store';

import MessageEditor from './MessageEditor';

type Props = {
  store?: Store;
  members: Chat['members'];
  message?: Message;
  chat: Chat;
  onFinished?: () => void;
  readOnly?: boolean;
  isMobile?: boolean;
  teamId: string;
  onContentChangeInMessageForm: (content, heightOfRows) => void;
  onFileUploadProp2: (isFileUploading: boolean) => void;
  onLocalStorageUpdate2: () => void;
  isOnChatPage?: boolean;
  parentMessageId: string;
  heightForMessageEditor: number;
};

type State = { messageId: string | null; content: string; disabled: boolean; heightOfRows: number };

class MessageForm extends React.Component<Props, State> {
  public static getDerivedStateFromProps(props: Props, state) {
    const { message } = props;

    if (!message && !state.messageId) {
      return null;
    }

    if (message && message.messageId === state.messageId) {
      return null;
    }

    return {
      content: (message && message.content) || '',
      messageId: (message && message.messageId) || null,
    };
  }

  public state = { messageId: null, content: '', disabled: false, heightOfRows: 25 };

  private storageKey: string = null;

  // getting content for non-first message from local storage
  public componentDidMount() {
    const { chat, message, teamId } = this.props;

    // no need to include userId since it's user's browser
    this.storageKey = `content-${teamId}-${chat ? chat.chatId : 'new-chat'}-${
      message ? message.messageId : 'new-message'
    }`;

    const draftContent =
      (typeof localStorage !== 'undefined' && localStorage.getItem(this.storageKey)) || null;

    if (draftContent) {
      this.setState({ content: draftContent });
    }
  }

  public componentDidUpdate(prevProps: Props) {
    const { chat, message, teamId } = this.props;

    if (chat && prevProps.chat && prevProps.chat.chatId !== chat.chatId) {
      this.storageKey = `content-${teamId}-${chat ? chat.chatId : 'new-chat'}-${
        message ? message.messageId : 'new-message'
      }`;

      const draftContent =
        (typeof localStorage !== 'undefined' && localStorage.getItem(this.storageKey)) || null;

      if (draftContent) {
        this.setState({ content: draftContent });
      }
    }
  }

  public render() {
    const {
      members,
      store,
      readOnly,
      message,
      teamId,
      chat,
      isOnChatPage,
      parentMessageId,
      isMobile,
    } = this.props;

    let stylesForMainDiv;

    if (isOnChatPage && !parentMessageId) {
      stylesForMainDiv = {
        height: isMobile
          ? `${55 + this.state.heightOfRows + 'px'}`
          : `${90 + this.state.heightOfRows + 'px'}`,
        bottom: isMobile ? '25px' : '25px',
        position: 'fixed',
        width: isMobile ? 'calc(100% - 40px)' : 'calc(83.33% - 80px)',
        margin: 'auto 0px',
        display: 'flex',
        alignItems: 'center',
      };
    } else if (isOnChatPage && parentMessageId) {
      stylesForMainDiv = {
        height: '100%',
        margin: '-20px 0px 40px 80px',
        width: 'calc(100% - 80px)',
      };
    } else {
      stylesForMainDiv = { height: '100%', margin: '10px 20px 10px 40px' };
    }

    return (
      <div style={stylesForMainDiv}>
        <form style={{ width: '100%', height: '100%' }} onSubmit={this.onSubmit} autoComplete="off">
          <MessageEditor
            user={store.currentUser}
            readOnly={readOnly}
            content={this.state.content}
            onChanged={this.onContentChanged}
            members={members}
            textareaHeight="100%"
            teamId={teamId}
            chatId={chat && chat.chatId}
            message={message}
            onFileUploadProp1={this.onFileUpload}
            onLocalStorageUpdateProp1={this.onLocalStorageUpdate}
            isOnChatPage={isOnChatPage}
            isMobile={isMobile}
            onEnterCtrlPress={this.onSubmit}
            chat={chat}
            heightForMessageEditor={this.props.heightForMessageEditor}
            parentMessageId={parentMessageId}
          />
          {isOnChatPage ? null : <p />}
        </form>
      </div>
    );
  }

  private onContentChanged = (content: string, heightOfRows: number) => {
    this.setState({ content, heightOfRows });
    this.props.onContentChangeInMessageForm(content, heightOfRows);

    if (typeof localStorage !== 'undefined' && this.storageKey) {
      if (content) {
        localStorage.setItem(this.storageKey, content);
      } else {
        localStorage.removeItem(this.storageKey);
      }
    }
  };

  private onFileUpload = (isFileUploading: boolean) => {
    this.setState({ disabled: isFileUploading });
    this.props.onFileUploadProp2(isFileUploading);
  };

  private onLocalStorageUpdate = () => {
    this.props.onLocalStorageUpdate2();
  };

  private onSubmit = async (event: any) => {
    event.preventDefault();

    const { content } = this.state;
    const { message, onFinished, chat, teamId, store, parentMessageId } = this.props;
    const isEditingMessage = !!message;

    if (!content) {
      notify('Please add content to your message.');
      return;
    }

    const { currentTeam } = store.currentUser;

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

    if (isEditingMessage) {
      try {
        const data: {
          content: string;
          teamId: string;
          chatId: string;
          id: string;
          parentMessageId: string;
        } = {
          content,
          teamId,
          chatId: chat.chatId,
          id: parentMessageId ? message.messageId : message.messageId,
          parentMessageId: parentMessageId ? parentMessageId : null,
        };

        await chat.addOrEditMessageStoreMethod(data);

        // notify('You edited message.');

        if (onFinished) {
          onFinished();
        }

        if (typeof localStorage !== 'undefined' && this.storageKey) {
          localStorage.removeItem(this.storageKey);
        }

        this.scrollToMessage(message.messageId);
      } catch (error) {
        console.error(error);
        notify(error);
      } finally {
        this.setState({ disabled: false });
        NProgress.done();
      }

      return;
    }

    // get files from localStorage for new comment
    const storageKey = `files-${teamId}-${chat.chatId}-new-message`;

    const filesForNewComment =
      (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem(storageKey))) || [];

    NProgress.start();

    try {
      // add parentMessageId
      const newMessage = await chat.addOrEditMessageStoreMethod({
        content,
        teamId,
        chatId: chat.chatId,
        id: null,
        files: filesForNewComment,
        parentMessageId,
      });

      // notify('You added a new message.');

      if (onFinished) {
        onFinished();
      }

      // remove content and files from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`content-${teamId}-${chat.chatId}-new-message`);
        localStorage.removeItem(`files-${teamId}-${chat.chatId}-new-message`);
      }

      this.setState({ content: '' });
      this.onLocalStorageUpdate();

      this.scrollToMessage(newMessage.messageId);
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.setState({ disabled: false, messageId: null, content: '', heightOfRows: 25 });
      this.props.onContentChangeInMessageForm('', 25);
      NProgress.done();
    }
  };

  private scrollToMessage = (messageId: string) => {
    setTimeout(() => {
      const wrapperElm = this.props.parentMessageId
        ? document.getElementById(`thread-message-${messageId}`)
        : document.getElementById(`message-${messageId}`);

      if (wrapperElm) {
        wrapperElm.scrollIntoView();
      }
    }, 0);
  };
}

export default inject('store')(observer(MessageForm));
