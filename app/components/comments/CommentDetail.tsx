import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { inject, observer } from 'mobx-react';
import moment from 'moment';
import React from 'react';

import { Comment, Store } from '../../lib/store';
import { markdownToHtml } from '../comments/CommentEditor';

import CommentContent from './CommentContent';

const styleLineSeparator = {
  verticalAlign: 'text-bottom',
  fontWeight: 300,
  fontSize: '16px',
  margin: '0px 5px',
  opacity: 0.75,
};

type Props = {
  comment: Comment;
  store?: Store;
  onEditClick: (comment) => void;
  onShowMarkdownClick: (comment) => void;
  isMobile: boolean;
  teamId: string;
  isUnread: boolean;
  isCommentSelected: boolean;
};

class CommentDetail extends React.Component<Props> {
  public editComment = () => {
    const { comment, onEditClick } = this.props;
    if (onEditClick) {
      onEditClick(comment);
    }
  };

  public showMarkdown = () => {
    const { comment, onShowMarkdownClick } = this.props;
    if (onShowMarkdownClick) {
      onShowMarkdownClick(comment);
    }
  };

  public render() {
    const { comment, isMobile, isUnread, store } = this.props;

    const isThemeDark = store.currentUser.showDarkTheme === true;
    const isUnreadItemBorder = isThemeDark ? '1px #fff solid' : '1px #222 solid';

    const stylePaper = {
      padding: isMobile ? '10px 15px' : '12px',
      border: isUnread ? isUnreadItemBorder : 'none',
      background: isThemeDark ? 'none' : '#fff',
      width: isMobile ? 'calc(100% - 10px)' : 'calc(100% - 0px)',
      borderLeft: isUnread ? isUnreadItemBorder : 'none',
    };

    if (this.props.isCommentSelected) {
      stylePaper.borderLeft = isThemeDark ? 'solid 3px white' : 'solid 3px black';
    }

    if (comment.createdUserId === store.currentUser._id) {
      stylePaper.background = isThemeDark ? '#8774e1' : '#eeffde';
    }

    return (
      <Paper
        variant="elevation"
        id={`comment-${comment.commentId}`}
        style={stylePaper}
        elevation={3}
      >
        {this.renderCommentDetail(comment, isMobile)}
      </Paper>
    );
  }

  // icon, upon click shows two buttons: Cancel and Save changes
  private renderEditIcon() {
    // const { comment, store } = this.props;

    return (
      <MoreVertIcon
        style={{
          fontSize: '18px',
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          this.editComment();
        }}
      />
    );
  }

  private renderCommentDetail(comment: Comment, isMobile) {
    const { store, isCommentSelected } = this.props;
    const { currentUser } = store;

    const { html, isCurrentUserMentioned } = markdownToHtml(comment.content, currentUser.userName);

    const createdDate = moment(comment.createdAt).format('hh:mmA on MMM Do YYYY ');
    const lastEditedDate = moment(comment.lastEditedAt).fromNow();
    const { creator } = comment;

    const isThemeDark = store.currentUser.showDarkTheme === true;

    let linkColor;
    let linkFontWeight;
    // let linkBackgroundColor;
    if (comment.createdUserId === store.currentUser._id) {
      linkColor = isThemeDark ? '#fff' : '#0077ff';
      linkFontWeight = isThemeDark ? 600 : 400;
      // linkBackgroundColor = isThemeDark ? '#fff' : 'none';
    }

    return (
      <>
        {' '}
        {currentUser &&
        currentUser._id === comment.createdUserId &&
        comment.discussion.firstCommentId !== comment.commentId &&
        !isCommentSelected ? (
          <div style={{ zIndex: 1000, float: 'right' }}>{this.renderEditIcon()}</div>
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
                {creator && currentUser && currentUser._id === comment.createdUserId
                  ? '(You) ' + (creator.userName || creator.email)
                  : creator.status === 'removed'
                  ? 'REMOVED: ' + (creator.userName || creator.email)
                  : creator.userName || creator.email}{' '}
              </b>
              at{' '}
              <a
                href={`#comment-${comment.commentId}`}
                style={{
                  color: linkColor,
                  fontWeight: linkFontWeight,
                }}
              >
                {(comment.createdAt && createdDate) || ''}
              </a>
              {comment.isEdited ? (
                <>
                  <span style={styleLineSeparator}>|</span>
                  <span suppressHydrationWarning>Last edited: {lastEditedDate}</span>
                </>
              ) : null}
            </span>
            <div>
              <CommentContent html={html} />
              {isCurrentUserMentioned ? (
                <span
                  style={{
                    fontSize: '12px',
                    fontStyle: 'oblique',
                    float: 'right',
                    marginTop: '7px',
                  }}
                >
                  You are mentioned
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default inject('store')(observer(CommentDetail));
