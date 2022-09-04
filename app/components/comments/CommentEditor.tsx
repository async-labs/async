import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import he from 'he';
import hljs from 'highlight.js';

import { marked } from 'marked';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import moment from 'moment';

import NProgress from 'nprogress';
import React from 'react';

import { getSignedRequestForPutApiMethod } from '../../lib/api/to-api-server-team-member';
import { uploadFileUsingSignedPutRequestApiMethod } from '../../lib/api/to-external-services';

import notify from '../../lib/notify';
// import { resizeImage } from '../../lib/resizeImage';
import { Comment, Discussion, User } from '../../lib/store';

import CommentContent from './CommentContent';

// customize renderer: @username -> <b>@username</b>

function markdownToHtml(commentContent: string, userName: string) {
  let isCurrentUserMentioned;

  if (!commentContent) {
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

  const html = marked(he.decode(commentContent));

  if (commentContent && commentContent.includes(`@${userName}`)) {
    isCurrentUserMentioned = true;
  }

  return {
    html: html.replace(new RegExp(`@${userName}`, 'g'), `<b>@${userName}</b>`),
    isCurrentUserMentioned,
  };
}

// see async-old for more
// function getImageDimension(file): Promise<{ width: number; height: number }> {
//   const reader = new FileReader();
//   const img = new Image();

//   return new Promise((resolve) => {
//     reader.onload = (e) => {
//       img.onload = () => {
//         resolve({ width: img.width, height: img.height });
//       };

//       img.src = e.target.result as string;
//     };

//     reader.readAsDataURL(file);
//   });
// }

type MyProps = {
  user: User;
  onChanged: (content) => void;
  placeholder?: string;
  content: string;
  members?: Discussion['members'];
  textareaHeight?: string;
  readOnly?: boolean;
  teamId: string;
  discussionId: string;
  comment: Comment;
  onFileUploadProp1: (isFileUploading: boolean) => void;
  onLocalStorageUpdateProp1: () => void;
  isMobile: boolean;
};

type MyState = {
  htmlContent: string;
  uploadElmId: string;
  cursorPositionStart: number;
  cursorPositionEnd: number;
  renderUploaderAtTop: boolean;
};

class CommentEditor extends React.Component<MyProps, MyState> {
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
    };

    this.textAreaRef = React.createRef();
  }

  public componentDidMount() {
    this.setState({
      uploadElmId: Math.random().toString(36).substring(2, 12),
    });
  }

  public componentDidUpdate(_, prevState: MyState) {
    const renderUploaderAtTop = window.innerHeight < this.editorContainerDivRef.offsetHeight;

    if (prevState.renderUploaderAtTop !== renderUploaderAtTop) {
      this.setState({ renderUploaderAtTop });
    }
  }

  public render() {
    const { htmlContent } = this.state;
    const { content, user, comment, isMobile } = this.props;

    const isThemeDark = user.showDarkTheme === true;

    // const textareaBackgroundColor = isThemeDark ? '#0d1117' : '#fff';

    return (
      <React.Fragment>
        <div>
          <Button
            onClick={() => {
              setTimeout(() => this.restoreCursorPosition(), 0);
              this.showMarkdownContent();
            }}
            variant="text"
            style={{
              fontWeight: htmlContent ? 300 : 600,
              opacity: htmlContent ? 0.5 : 1,
              color: '#0077ff',
            }}
          >
            Markdown
          </Button>
          <Button
            onClick={() => {
              this.saveCursorPosition();
              this.showHtmlContent();
            }}
            variant="text"
            style={{
              fontWeight: htmlContent ? 600 : 300,
              opacity: htmlContent ? 1 : 0.5,
              color: '#0077ff',
            }}
          >
            HTML
          </Button>
        </div>

        <div
          style={{
            width: isMobile ? 'calc(100% - 20px)' : '100%',
            border: isThemeDark
              ? '1px solid rgba(255, 255, 255, 0.5)'
              : '1px solid rgba(0, 0, 0, 0.5)',
          }}
          ref={(elm) => (this.editorContainerDivRef = elm)}
        >
          {htmlContent ? (
            <CommentContent html={htmlContent} isPreview={true} />
          ) : (
            <React.Fragment>
              {this.renderUploadArea(isThemeDark)}
              <div className="TextField-without-border-radius">
                <TextField
                  autoFocus={comment ? true : false}
                  variant="outlined"
                  autoComplete="off"
                  multiline
                  rows={isMobile ? 12 : 16}
                  fullWidth
                  value={content}
                  onChange={(event) => this.props.onChanged(event.target.value)}
                  inputRef={this.textAreaRef}
                  placeholder="Type comment..."
                  style={{
                    lineHeight: '1.5em',
                    background: isThemeDark ? 'none' : '#fff',
                    fontFamily: 'Roboto, sans-serif',
                  }}
                />
              </div>
            </React.Fragment>
          )}
        </div>
      </React.Fragment>
    );
  }

  private renderUploadArea(isThemeDark) {
    if (this.props.readOnly) {
      return null;
    }

    return (
      <div
        style={{
          borderBottom: '1px dashed #616161',
          padding: '10px',
          height: this.props.isMobile ? '40px' : '40px',
          zIndex: 1000,
          background: isThemeDark ? 'none' : '#fff',
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer && event.dataTransfer.files[0];

          if (file) {
            this.uploadFile(file);
          }
        }}
      >
        <input
          // accept="image/*,.pdf"
          name={`upload-file-${this.state.uploadElmId}`}
          id={`upload-file-${this.state.uploadElmId}`}
          type="file"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files[0];
            event.target.value = '';
            this.uploadFile(file);
          }}
        />
        <label
          style={{ display: 'block', opacity: 0.6, cursor: 'pointer' }}
          htmlFor={`upload-file-${this.state.uploadElmId}`}
        >
          {this.props.isMobile
            ? 'Click to select file'
            : 'Click to select file or drag file into this area'}
        </label>
      </div>
    );
  }

  private restoreCursorPosition() {
    const editor = this.textAreaRef && this.textAreaRef.current;

    if (editor) {
      editor.selectionStart = this.state.cursorPositionStart;
      editor.selectionEnd = this.state.cursorPositionEnd;

      editor.focus();
    }
  }

  private saveCursorPosition() {
    const editor = this.textAreaRef && this.textAreaRef.current;
    if (editor) {
      this.setState({
        cursorPositionStart: editor.selectionStart,
        cursorPositionEnd: editor.selectionEnd,
      });
    }
  }

  private showMarkdownContent = () => {
    this.setState({ htmlContent: '' });
  };

  private showHtmlContent = async () => {
    const { content, user } = this.props;

    const htmlContent = content
      ? markdownToHtml(content, user.userName).html
      : '<p>No content to preview.</p>';

    this.setState({ htmlContent });
  };

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

    const { discussionId, comment, teamId } = this.props;

    try {
      const { returnedDataFromS3, addedFile } = await getSignedRequestForPutApiMethod({
        file,
        teamId: teamId,
        discussionId: discussionId || 'new-discussion',
        commentId: (comment && comment.commentId) || 'new-comment',
        chatId: null,
        messageId: null,
        socketId:
          (comment && comment.store && comment.store.socket && comment.store.socket.id) || null,
      });

      // const fileKey = responseFromApiServerForUpload.path;
      // const fileUrl = responseFromApiServerForUpload.url;

      await uploadFileUsingSignedPutRequestApiMethod(file, returnedDataFromS3.signedRequest, {
        'Cache-Control': 'max-age=2592000',
      });

      // for new comment, save file to local storage
      if (typeof localStorage !== 'undefined' && discussionId && !comment && addedFile) {
        const storageKey = `files-${teamId}-${discussionId}-new-comment`;

        const filesForNewComment = JSON.parse(localStorage.getItem(storageKey)) || [];

        filesForNewComment.push(addedFile);

        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(filesForNewComment));
        }

        this.props.onLocalStorageUpdateProp1();
      } else if (typeof localStorage !== 'undefined' && !discussionId && !comment && addedFile) {
        const storageKey = `files-${teamId}-new-discussion-new-comment`;

        const filesForNewComment = JSON.parse(localStorage.getItem(storageKey)) || [];

        filesForNewComment.push(addedFile);

        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(filesForNewComment));
        }

        this.props.onLocalStorageUpdateProp1();
      } else {
        runInAction(() => {
          comment.files.push(addedFile);
        });
      }
      notify('You uploaded file.');
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
export default observer(CommentEditor);
