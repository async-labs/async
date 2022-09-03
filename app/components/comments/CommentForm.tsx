import Button from '@mui/material/Button';

import { inject, observer } from 'mobx-react';
import moment from 'moment';

import NProgress from 'nprogress';
import React from 'react';

import notify from '../../lib/notify';
import { Discussion, Comment, Store } from '../../lib/store';

import CommentEditor from './CommentEditor';

type Props = {
  store?: Store;
  members: Discussion['members'];
  comment?: Comment;
  discussion: Discussion;
  onFinished?: () => void;
  readOnly?: boolean;
  isMobile?: boolean;
  teamId: string;
  onContentChangeInCommentForm: (content) => void;
  onFileUploadProp2: (isFileUploading: boolean) => void;
  onLocalStorageUpdate2: () => void;
};

type State = { commentId: string | null; content: string; disabled: boolean };

class CommentForm extends React.Component<Props, State> {
  public static getDerivedStateFromProps(props: Props, state) {
    const { comment } = props;

    if (!comment && !state.commentId) {
      return null;
    }

    if (comment && comment.commentId === state.commentId) {
      return null;
    }

    return {
      content: (comment && comment.content) || '',
      commentId: (comment && comment.commentId) || null,
    };
  }

  public state = { commentId: null, content: '', disabled: false };

  private storageKey: string = null;

  // getting content for non-first comment from local storage
  public componentDidMount() {
    const { discussion, comment, teamId } = this.props;

    // no need to include userId since it's user's browser
    this.storageKey = `content-${teamId}-${
      discussion ? discussion.discussionId : 'new-discussion'
    }-${comment ? comment.commentId : 'new-comment'}`;

    const draftContent =
      (typeof localStorage !== 'undefined' && localStorage.getItem(this.storageKey)) || '';

    if (draftContent) {
      this.setState({ content: draftContent });
    }
  }

  public componentDidUpdate(prevProps: Props) {
    const { discussion, comment, teamId } = this.props;

    if (
      discussion &&
      prevProps.discussion &&
      prevProps.discussion.discussionId !== discussion.discussionId
    ) {
      this.storageKey = `content-${teamId}-${
        discussion ? discussion.discussionId : 'new-discussion'
      }-${comment ? comment.commentId : 'new-comment'}`;

      const draftContent =
        (typeof localStorage !== 'undefined' && localStorage.getItem(this.storageKey)) || '';

      if (draftContent) {
        this.setState({ content: draftContent });
      }
    }
  }

  public render() {
    const { members, store, readOnly, comment, teamId, discussion, isMobile } = this.props;

    return (
      <div style={{ height: '100%', margin: '0px 0px 20px 40px' }}>
        <form style={{ width: '100%', height: '100%' }} onSubmit={this.onSubmit} autoComplete="off">
          <CommentEditor
            user={store.currentUser}
            readOnly={readOnly}
            content={this.state.content}
            onChanged={this.onContentChanged}
            members={members}
            textareaHeight="100%"
            teamId={teamId}
            discussionId={discussion && discussion.discussionId}
            comment={comment}
            onFileUploadProp1={this.onFileUpload}
            onLocalStorageUpdateProp1={this.onLocalStorageUpdate}
            isMobile={isMobile}
          />
          <p />
          {discussion && !comment ? (
            <div style={{ float: 'right', marginRight: isMobile ? '20px' : 'none' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={this.state.disabled}
              >
                Add comment
              </Button>

              {/* <Button
                variant="outlined"
                onClick={this.closeForm}
                disabled={this.state.disabled}
                style={{ marginLeft: '10px' }}
              >
                Cancel
              </Button> */}
              <p />
            </div>
          ) : null}
        </form>
      </div>
    );
  }

  private onContentChanged = (content: string) => {
    this.setState({ content });
    this.props.onContentChangeInCommentForm(content);

    if (typeof localStorage !== 'undefined' && this.storageKey && this.storageKey.includes('new')) {
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

  private onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { content } = this.state;
    const { comment, onFinished, discussion, teamId, store } = this.props;
    const isEditingComment = !!comment;

    if (!content) {
      notify('Please add content to your comment.');
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

    if (isEditingComment) {
      try {
        const data: {
          content: string;
          teamId: string;
          discussionId: string;
          id: string;
        } = {
          content,
          teamId,
          discussionId: discussion.discussionId,
          id: comment.commentId,
        };

        await discussion.addOrEditCommentStoreMethod(data);

        notify('You edited comment.');

        if (onFinished) {
          onFinished();
        }

        if (typeof localStorage !== 'undefined' && this.storageKey) {
          localStorage.removeItem(this.storageKey);
        }

        this.scrollToComment(comment.commentId);
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
    const storageKey = `files-${teamId}-${discussion.discussionId}-new-comment`;

    const filesForNewComment =
      (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem(storageKey))) || [];

    try {
      const newComment = await discussion.addOrEditCommentStoreMethod({
        content,
        teamId,
        discussionId: discussion.discussionId,
        id: null,
        files: filesForNewComment,
      });

      notify('You published a new comment.');

      if (onFinished) {
        onFinished();
      }

      // remove content and files from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`content-${teamId}-${discussion.discussionId}-new-comment`);
        localStorage.removeItem(`files-${teamId}-${discussion.discussionId}-new-comment`);
      }

      this.setState({ content: '' });
      this.onLocalStorageUpdate();

      this.scrollToComment(newComment.commentId);
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private scrollToComment = (commentId: string) => {
    setTimeout(() => {
      const wrapperElm = document.getElementById(`comment-${commentId}`);

      if (wrapperElm) {
        wrapperElm.scrollIntoView();
      }
    }, 0);
  };
}

export default inject('store')(observer(CommentForm));
