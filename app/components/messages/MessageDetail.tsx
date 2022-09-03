import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import CheckIcon from '@mui/icons-material/Check';

import { inject, observer } from 'mobx-react';
import moment from 'moment';
import React from 'react';

import { Message, Store, Chat } from '../../lib/store';
import { markdownToHtml } from './MessageEditor';

import MessageContent from './MessageContent';

// done: if content contains `@username`, show text to user: "You are mentioned"

const styleLineSeparator = {
  verticalAlign: 'text-bottom',
  fontWeight: 300,
  fontSize: '16px',
  margin: '0px 5px',
  opacity: 0.75,
};

type Props = {
  message: Message;
  store?: Store;
  onEditClick: (message) => void;
  onShowMarkdownClick: (message) => void;
  onThreadClick: (message, open) => void;
  isMessageThreadOpen: boolean;
  isMobile: boolean;
  teamId: string;
  isUnread: boolean;
  isMessageSelected: boolean;
  chat: Chat;
};

class MessageDetail extends React.Component<Props> {
  public editMessage = () => {
    const { message, onEditClick } = this.props;
    if (onEditClick) {
      onEditClick(message);
    }
  };

  public showMarkdown = () => {
    const { message, onShowMarkdownClick } = this.props;
    if (onShowMarkdownClick) {
      onShowMarkdownClick(message);
    }
  };

  public openOrCloseThread = (open) => {
    const { message, onThreadClick } = this.props;
    if (onThreadClick) {
      onThreadClick(message, open);
    }
  };

  public render() {
    const { message, isMobile, store, chat } = this.props;

    const isThemeDark = store.currentUser.showDarkTheme === true;
    // const isUnreadItemBorder = isThemeDark ? '1px #fff solid' : '1px #222 solid';

    const stylePaper = {
      padding: '8px 8px 5px 8px',
      marginRight: isMobile ? '10px' : '15px',
      background: isThemeDark ? 'none' : '#fff',
      width: 'calc(100% - 30px)',
      borderLeft: 'none',
      marginLeft: 'auto',
    };

    if (this.props.isMessageSelected && !message.parentMessageId) {
      stylePaper.borderLeft = isThemeDark ? 'solid 3px white' : 'solid 3px black';
    }

    if (this.props.isMessageSelected && message.parentMessageId) {
      stylePaper.width = 'calc(100% - 40px)';
    }

    if (message.createdUserId === store.currentUser._id) {
      stylePaper.background = isThemeDark ? '#8774e1' : '#eeffde';
    }

    return (
      <Paper
        id={
          message.parentMessageId
            ? `thread-message-${message.messageId}`
            : `message-${message.messageId}`
        }
        style={stylePaper}
        elevation={3}
      >
        {this.renderMessageDetail(message, isMobile, chat)}
      </Paper>
    );
  }

  private renderEditIcon() {
    return (
      <MoreVertIcon
        style={{
          fontSize: '16px',
          cursor: 'pointer',
          opacity: '0.8',
        }}
        onClick={(e) => {
          e.stopPropagation();
          this.editMessage();
        }}
      />
    );
  }

  private renderThreadIcon(count) {
    return (
      <>
        {count && count !== 0 ? (
          <span
            style={{
              fontSize: '12px',
              opacity: '0.7',
              verticalAlign: 'middle',
              marginRight: '4px',
            }}
          >
            ({count})
          </span>
        ) : null}

        <CommentOutlinedIcon
          style={{
            fontSize: '13px',
            cursor: 'pointer',
            opacity: '0.5',
            verticalAlign: 'middle',
          }}
          onClick={(e) => {
            e.stopPropagation();
            this.openOrCloseThread(true);
          }}
        />
      </>
    );
  }

  private renderMessageDetail(message: Message, isMobile: boolean, chat: Chat) {
    const { store, isMessageSelected, isMessageThreadOpen } = this.props;
    const { currentUser } = store;

    const { html } = markdownToHtml(message.content, currentUser.userName);

    const createdDate = moment(message.createdAt).format('hh:mmA on MMM Do YYYY ');
    const lastEditedDate = moment(message.lastEditedAt).fromNow();
    const { creator } = message;

    const isThemeDark = store.currentUser.showDarkTheme === true;
    // const borderForAvatar = isThemeDark ? '2px #fff solid' : '2px #222 solid';

    let linkColor;
    let linkFontWeight;
    if (message.createdUserId === store.currentUser._id) {
      linkColor = isThemeDark ? '#fff' : '#0077ff';
      linkFontWeight = isThemeDark ? 400 : 400;
    }

    return (
      <>
        <div
          style={{
            minWidth: '10px',
            minHeight: '10px',
            marginLeft: '-22px',
            marginTop: '-5px',
          }}
        >
          {message.isMessageUnreadByUser && message.createdUserId !== store.currentUser._id ? (
            <CircleIcon
              style={{
                fontSize: '11px',
                zIndex: 1000,
              }}
              data-message-id={message.messageId}
            />
          ) : null}
        </div>
        <div>
          {currentUser &&
          currentUser._id === message.createdUserId &&
          (!this.props.isMessageSelected || message.parentMessageId) ? (
            <Tooltip title="Edit" placement="left" disableFocusListener disableTouchListener>
              <div style={{ zIndex: 1000, float: 'right' }}>{this.renderEditIcon()}</div>
            </Tooltip>
          ) : null}
          <div>
            {creator && (
              <Avatar
                src={creator.userAvatarUrl}
                alt={creator.userName || creator.email}
                sx={{
                  margin: '0px 10px 0px 5px',
                  float: 'left',
                }}
              />
            )}
            <div
              style={{
                margin: isMobile ? '0px' : '0px 20px 0px 60px',
                fontWeight: 300,
                lineHeight: '1em',
              }}
            >
              <span style={{ fontSize: '11px' }}>
                <b>
                  {creator && currentUser && currentUser._id === message.createdUserId
                    ? '(You) ' + (creator.userName || creator.email)
                    : creator.status === 'removed'
                    ? 'REMOVED: ' + (creator.userName || creator.email)
                    : creator.userName || creator.email}{' '}
                </b>
                at{' '}
                <a
                  href={`#message-${message.messageId}`}
                  style={{ color: linkColor, fontWeight: linkFontWeight, backgroundColor: 'none' }}
                >
                  {(message.createdAt && createdDate) || ''}
                </a>
                {message.isEdited ? (
                  <>
                    <span style={styleLineSeparator}>|</span>
                    <span suppressHydrationWarning>Last edited: {lastEditedDate}</span>
                  </>
                ) : null}
              </span>
              <div>
                <MessageContent html={html} isThemeDark={isThemeDark} />
              </div>
            </div>
          </div>
          <div>
            {message.isMessageUnreadBySomeone &&
            message.createdUserId === store.currentUser._id &&
            chat.chatParticipantIds.length > 1 ? (
              <CheckIcon
                style={{
                  fontSize: '15px',
                }}
                data-message-id={message.messageId}
              />
            ) : !message.isMessageUnreadBySomeone &&
              message.createdUserId === store.currentUser._id &&
              chat.chatParticipantIds.length > 1 ? (
              <>
                <CheckIcon
                  style={{
                    fontSize: '15px',
                    marginRight: '-9px',
                    zIndex: 1000,
                  }}
                  data-message-id={message.messageId}
                />
                <CheckIcon
                  style={{
                    fontSize: '15px',
                  }}
                  data-message-id={message.messageId}
                />
              </>
            ) : null}
          </div>
          <div style={{ marginRight: '5px', float: 'right' }}>
            {!message.parentMessageId && !isMessageSelected && !isMessageThreadOpen ? (
              <Tooltip
                title="Open thread"
                placement="left"
                disableFocusListener
                disableTouchListener
              >
                <div style={{ zIndex: 1000 }}>
                  {this.renderThreadIcon(message.countOfThreadMessages)}
                </div>
              </Tooltip>
            ) : !message.parentMessageId && isMessageSelected && isMessageThreadOpen ? (
              <Button
                variant="text"
                onClick={() => this.openOrCloseThread(false)}
                style={{
                  marginRight: '0px',
                  color: isThemeDark ? '#fff' : '#000',
                  fontSize: '12px',
                }}
              >
                Close thread
              </Button>
            ) : null}
          </div>
        </div>
      </>
    );
  }
}

export default inject('store')(observer(MessageDetail));
