import TextField from '@mui/material/TextField';

import he from 'he';
import * as hljs from 'highlight.js';
import { throttle } from 'lodash';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';

import marked from 'marked';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import moment from 'moment';

import NProgress from 'nprogress';
import React from 'react';

import { getSignedRequestForPutApiMethod } from '../../lib/api/to-api-server-team-member';
import { uploadFileUsingSignedPutRequestApiMethod } from '../../lib/api/to-external-services';

import notify from '../../lib/notify';
// import { resizeImage } from '../../lib/resizeImage';
import { Chat, Message, User } from '../../lib/store';

// function isOverflown(element) {
//   return element.scrollHeight > element.clientHeight;
// }

function markdownToHtml(messageContent: string, userName: string) {
  let isCurrentUserMentioned;

  if (!messageContent) {
    return { html: '', isCurrentUserMentioned: false };
  }

  const renderer = new marked.Renderer();

  renderer.link = (href, title, text) => {
    const t = title ? ` title="${title}"` : '';

    if (text.startsWith('<code>@#')) {
      return `${text.replace('<code>@#', '<code>@')} `;
    }

    return `
      <a target="_blank" href="${href}" style="cursor: pointer;" rel="nofollow noopener noreferrer"${t}>
        ${text}
      </a>
    `;
  };

  renderer.listitem = (text) => {
    const regex1 = RegExp('^<input disabled="" type="checkbox">');
    const regex2 = RegExp('^<input checked="" disabled="" type="checkbox">');

    if (regex1.test(text) || regex2.test(text)) {
      return `<li style="list-style: none; margin-left: -24px">${text}</li>`;
    }

    return `<li>${text}</li>`;
  };

  marked.setOptions({
    renderer,
    breaks: true,
    highlight(code, lang) {
      if (!lang) {
        return hljs.highlightAuto(code).value;
      }

      return hljs.highlight(lang, code).value;
    },
  });

  const html = marked(he.decode(messageContent));

  if (messageContent && messageContent.includes(userName)) {
    isCurrentUserMentioned = true;
  }

  return {
    html: html.replace(
      new RegExp(`@${userName}`, 'g'),
      `<b style="font-size: 15px">@${userName}</b>`,
    ),
    isCurrentUserMentioned,
  };
}

type MyProps = {
  user: User;
  onChanged: (content, heightOfRows) => void;
  placeholder?: string;
  content: string;
  members?: Chat['members'];
  textareaHeight?: string;
  readOnly?: boolean;
  makeSectionLinks?: boolean;
  teamId: string;
  chatId: string;
  message: Message;
  onFileUploadProp1: (isFileUploading: boolean) => void;
  onLocalStorageUpdateProp1: () => void;
  isOnChatPage?: boolean;
  isMobile: boolean;
  onEnterCtrlPress: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  chat: Chat;
  heightForMessageEditor: number;
  parentMessageId: string;
};

type MyState = {
  htmlContent: string;
  uploadElmId: string;
  cursorPositionStart: number;
  cursorPositionEnd: number;
  renderUploaderAtTop: boolean;
  heightOfRows: number;
};

class MessageEditor extends React.Component<MyProps, MyState> {
  public static defaultProps = {};

  public static getDerivedStateFromProps(props: MyProps, state: MyState) {
    const { content } = props;

    if (!content && state.htmlContent !== '<p>No content to preview.</p>') {
      return { htmlContent: '' };
    }

    return null;
  }

  private textAreaRef;
  private editorContainerDivRef;

  constructor(props) {
    super(props);

    this.state = {
      htmlContent: '',
      uploadElmId: 'upload',
      cursorPositionStart: 1,
      cursorPositionEnd: 1,
      renderUploaderAtTop: false,
      heightOfRows: 25,
    };

    this.textAreaRef = React.createRef();
  }

  public componentDidMount() {
    this.setState({
      uploadElmId: Math.random().toString(36).substring(2, 12),
    });

    const { message } = this.props;

    if (message) {
      const element = document.getElementById(`message-editor-${message.messageId}`);
      if (element) {
        element.style.overflow = 'hidden';
        element.style.height = message
          ? this.props.heightForMessageEditor.toString() + 'px !important'
          : '25px';
      }
    }

    if (!message) {
      const div = document.getElementById('message-editor');
      div.addEventListener('input', this.updateTypingStatus);
    }
  }

  private updateTypingStatus = throttle((event) => {
    event.preventDefault();
    const { user, chatId, teamId } = this.props;

    user.updateTypingStatusStoreMethod(true, chatId, teamId).catch((e) => notify(e));
  }, 500);

  public componentDidUpdate(_, prevState: MyState) {
    const renderUploaderAtTop = window.innerHeight < this.editorContainerDivRef.offsetHeight;

    if (prevState.renderUploaderAtTop !== renderUploaderAtTop) {
      this.setState({ renderUploaderAtTop });
    }
  }

  public componentWillUnmount() {
    const { message } = this.props;

    if (!message) {
      const div = document.getElementById('message-editor');
      div.removeEventListener('input', this.updateTypingStatus);
    }
  }

  public render() {
    const { content, user, chat, isOnChatPage, message, isMobile, parentMessageId } = this.props;

    const isThemeDark = user.showDarkTheme === true;

    return (
      <>
        <div style={{}} ref={(elm) => (this.editorContainerDivRef = elm)}>
          {isMobile &&
          chat &&
          !chat.isLoadingMessages &&
          chat.typingChatParticipants &&
          chat.typingChatParticipants.length > 0 ? (
            <span
              style={{
                fontSize: '13px',
                position: 'absolute',
              }}
            >
              {chat.typingChatParticipants.length === 1
                ? `${
                    chat.typingChatParticipants[0].userName || chat.typingChatParticipants[0].email
                  } typing...`
                : `Multiple users typing...`}
            </span>
          ) : null}

          {isMobile ? null : (
            <p
              style={{
                fontSize: '12px',
                textAlign: 'right',
                marginBottom: '5px',
                marginRight: '3px',
              }}
            >
              Enter + Ctrl
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              id={message ? 'message-editor-' + message.messageId : 'message-editor'}
              variant="outlined"
              autoComplete="off"
              autoFocus
              fullWidth
              multiline
              value={content}
              onChange={(event) => {
                event.preventDefault();
                if (message) {
                  this.props.onChanged(event.target.value, 25);
                } else {
                  const element = document.getElementById('message-editor');
                  element.style.height = element.scrollHeight < 50 ? '25px' : 'auto';
                  element.style.height = element.scrollHeight + 'px';
                  this.props.onChanged(event.target.value, element.scrollHeight + 1);
                }
              }}
              inputRef={this.textAreaRef}
              placeholder={
                isOnChatPage && !message && !parentMessageId
                  ? 'Type message...'
                  : 'Type message in thread...'
              }
              style={{
                lineHeight: '25px',
                fontFamily: 'Roboto, sans-serif',
                background: isThemeDark ? 'none' : '#fff',
              }}
              onKeyDown={(e) => {
                const key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
                if ((key == 13 || e.key === 'Enter') && e.ctrlKey) {
                  this.props.onEnterCtrlPress(e);
                }
              }}
              InputProps={{
                startAdornment: this.renderUploadArea(),
                endAdornment: (
                  <div style={{ borderLeft: '1px solid #787878' }}>
                    <IconButton
                      type="submit"
                      style={{
                        marginLeft: '10px',
                        verticalAlign: 'middle',
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </div>
                ),
              }}
            />
          </div>
        </div>
      </>
    );
  }

  private renderUploadArea() {
    if (this.props.readOnly) {
      return null;
    }

    return (
      <div>
        <input
          // accept="image/*,.pdf"
          name={`upload-file-${this.state.uploadElmId}`}
          id={`upload-file-${this.state.uploadElmId}`}
          type="file"
          style={{ display: 'none' }}
          onChange={async (event) => {
            const file = event.target.files[0];
            await this.uploadFile(file);
            event.target.value = '';
            return;
          }}
        />
        <label
          style={{ opacity: 0.6, cursor: 'pointer' }}
          htmlFor={`upload-file-${this.state.uploadElmId}`}
        >
          <AttachFileIcon
            style={{
              marginRight: '10px',
              verticalAlign: 'middle',
            }}
          />
        </label>
      </div>
    );
  }

  // private restoreCursorPosition() {
  //   const editor = this.textAreaRef && this.textAreaRef.current;

  //   if (editor) {
  //     editor.selectionStart = this.state.cursorPositionStart;
  //     editor.selectionEnd = this.state.cursorPositionEnd;

  //     editor.focus();
  //   }
  // }

  // private saveCursorPosition() {
  //   const editor = this.textAreaRef && this.textAreaRef.current;
  //   if (editor) {
  //     this.setState({
  //       cursorPositionStart: editor.selectionStart,
  //       cursorPositionEnd: editor.selectionEnd,
  //     });
  //   }
  // }

  // private showMarkdownContent = () => {
  //   this.setState({ htmlContent: '' });
  // };

  // private showHtmlContent = async () => {
  //   const { content, user } = this.props;

  //   const htmlContent = content
  //     ? markdownToHtml(content, user.userName).html
  //     : '<p>No content to preview.</p>';

  //   this.setState({ htmlContent });
  // };

  private uploadFile = async (file: File) => {
    if (!file) {
      notify('No file selected.');
      return;
    }

    if (!file.type) {
      notify('This file has no type.');
      return;
    }

    if (file.size / 1000000 > 25) {
      notify('This file size is over 25MB.');
      return;
    }

    const { currentTeam } = this.props.user;

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
    this.props.onFileUploadProp1(true);

    const { chatId, message, teamId } = this.props;

    try {
      const { returnedDataFromS3, addedFile } = await getSignedRequestForPutApiMethod({
        file,
        teamId: teamId,
        discussionId: null,
        commentId: null,
        chatId: chatId || 'new-chat',
        messageId: (message && message.messageId) || 'new-message',
        socketId:
          (message && message.store && message.store.socket && message.store.socket.id) || null,
      });

      // const fileKey = responseFromApiServerForUpload.path;
      // const fileUrl = responseFromApiServerForUpload.url;

      await uploadFileUsingSignedPutRequestApiMethod(file, returnedDataFromS3.signedRequest, {
        'Cache-Control': 'max-age=2592000',
      });

      // for new message, save file to local storage
      if (typeof localStorage !== 'undefined' && chatId && !message && addedFile) {
        const storageKey = `files-${teamId}-${chatId}-new-message`;

        const filesForNewMessage = JSON.parse(localStorage.getItem(storageKey)) || [];

        filesForNewMessage.push(addedFile);

        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(filesForNewMessage));
        }

        this.props.onLocalStorageUpdateProp1();
      } else if (typeof localStorage !== 'undefined' && !chatId && !message && addedFile) {
        const storageKey = `files-${teamId}-new-chat-new-message`;

        const filesForNewMessage = JSON.parse(localStorage.getItem(storageKey)) || [];

        filesForNewMessage.push(addedFile);

        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(filesForNewMessage));
        }

        this.props.onLocalStorageUpdateProp1();
      } else {
        runInAction(() => {
          message.files.push(addedFile);
        });
      }
      notify('You added file.');
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.props.onFileUploadProp1(false);
      NProgress.done();
    }
  };
}

export { markdownToHtml };
export default observer(MessageEditor);
