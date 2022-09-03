import React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CircleIcon from '@mui/icons-material/Circle';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';

import { observer } from 'mobx-react';
import moment from 'moment';
import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';

import { deleteFileThatHasNoCommentApiMethod } from '../../lib/api/to-api-server-team-member';

import { Store } from '../../lib/store';
import confirm from '../../lib/confirm';
import notify from '../../lib/notify';
import { Discussion, Comment } from '../../lib/store';

import Loading from '../common/Loading';
import MemberChooser from '../common/MemberChooser';
import CommentDetail from '../comments/CommentDetail';
import CommentForm from '../comments/CommentForm';

// think where to add key

type Props = {
  store?: Store;
  discussion: Discussion;
  isServer: boolean;
  isMobile: boolean;
  teamId: string;
  onCreationOfNewDiscussion: () => void;
  whichList: string;
  onPlusIconClickPropForDD: () => void;
};

type State = {
  disabled: boolean;
  showMarkdownClicked: boolean;
  selectedComment: Comment;
  isScrollJumpNeeded: boolean;
  isEditing: boolean;
  isCreatingNew: boolean;
  // disabledForDiscussionForm: boolean;
  discussionName: string;
  discussionMemberIds: string[];
  contentForComment: string;
  filesForNewComment: { fileName: string; fileUrl: string; addedAt: Date }[];
  filesForFirstCommentOfNewDiscussion: { fileName: string; fileUrl: string; addedAt: Date }[];
};

// markCommentAsRead should be manual (not automattic) for Discussion
// define markCommentAsUnread

// function isCommentDivVisible(commentDiv: HTMLElement) {
//   const { top } = commentDiv.getBoundingClientRect();

//   const windowHeight = window.innerHeight || document.documentElement.clientHeight;

//   if (windowHeight - top >= 90) {
//     return true;
//   }

//   return false;
// }

class DiscussionDetail extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this._isMounted = false;

    const { discussion } = props;

    this.state = {
      disabled: false,
      showMarkdownClicked: false,
      selectedComment: null,
      isScrollJumpNeeded: true,
      isEditing: false,
      isCreatingNew: !discussion ? true : false,
      discussionName: discussion ? discussion.discussionName : '',
      discussionMemberIds: discussion ? discussion.discussionMemberIds : [],
      contentForComment: discussion ? discussion.firstComment.content : '',
      filesForNewComment: [],
      filesForFirstCommentOfNewDiscussion: [],
    };
  }

  private storageKey: string = null;
  private _isMounted: boolean;

  public async componentDidMount() {
    this._isMounted = true;

    const { isServer, discussion, teamId } = this.props;

    // if (discussion && !discussion.isLoadingComments) {
    //   this.scrollToUnreadOrLastComment(discussion);
    // }

    if (!discussion) {
      const filesForFirstCommentOfNewDiscussion =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(`files-${teamId}-new-discussion-new-comment`))) ||
        [];

      const contentForComment =
        (typeof localStorage !== 'undefined' &&
          localStorage.getItem(`content-${teamId}-new-discussion-new-comment`)) ||
        '';

      if (this._isMounted) {
        this.setState({ contentForComment, filesForFirstCommentOfNewDiscussion });
      }
    }

    if (discussion) {
      discussion.store.socket.on('commentEvent', this.handleCommentEvent);
      discussion.store.socket.on('reconnect', this.handleSocketReconnect);
      discussion.joinDiscussionSocketRoomStoreMethod();

      if (!isServer) {
        await discussion.loadCommentsStoreMethod().catch((e) => notify(e));
      }

      this.storageKey = `files-${teamId}-${discussion.discussionId}-new-comment`;

      const filesForNewComment =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];
      if (this._isMounted) {
        this.setState({ filesForNewComment });
      }
    }
  }

  public async componentDidUpdate(prevProps: Props) {
    const { discussion, teamId } = this.props;

    if (
      discussion &&
      prevProps.discussion &&
      this._isMounted &&
      prevProps.discussion.discussionId !== discussion.discussionId
    ) {
      this.setState({
        disabled: false,
        showMarkdownClicked: false,
        selectedComment: null,
        isScrollJumpNeeded: true,
        isEditing: false,
        isCreatingNew: !discussion ? true : false,
        discussionName: discussion ? discussion.discussionName : '',
        discussionMemberIds: discussion ? discussion.discussionMemberIds : [],
        contentForComment: discussion ? discussion.firstComment.content : '',
        filesForNewComment: [],
        filesForFirstCommentOfNewDiscussion: [],
      });

      prevProps.discussion.leaveDiscussionSocketRoomStoreMethod();
      discussion.joinDiscussionSocketRoomStoreMethod();

      await discussion.loadCommentsStoreMethod().catch((e) => notify(e));

      this.storageKey = `files-${teamId}-${discussion.discussionId}-new-comment`;

      const filesForNewComment =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];

      if (this._isMounted) {
        this.setState({ filesForNewComment });
      }

      // if (discussion && !discussion.isLoadingComments) {
      //   this.scrollToUnreadOrLastComment(discussion);
      // }
    }
  }

  public componentWillUnmount() {
    this._isMounted = false;

    const { discussion } = this.props;

    if (discussion) {
      discussion.leaveDiscussionSocketRoomStoreMethod();
      discussion.store.socket.off('commentEvent', this.handleCommentEvent);
      discussion.store.socket.off('reconnect', this.handleSocketReconnect);
    }
  }

  public render() {
    const { discussion, isMobile, store, teamId } = this.props;
    const { currentUser } = store;
    const { isCreatingNew, isEditing } = this.state;

    let title;

    if (isCreatingNew && !isEditing && !discussion) {
      title = 'Create discussion';
    } else if (isEditing && !isCreatingNew && discussion) {
      title = `Edit discussion: ${discussion && discussion.discussionName}`;
    } else {
      title = `Discussion: ${discussion && discussion.discussionName}`;
    }

    const firstComment =
      discussion && discussion.comments.find((c) => c.commentId === discussion.firstCommentId);

    return (
      <>
        <Head>
          <title>{title}</title>
        </Head>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{ flexBasis: isMobile ? '100%' : '50%', display: 'flex', alignItems: 'center' }}
          >
            <p>{title.length > 66 ? title.substring(0, 66) + '...' : title}</p>
          </div>
          <div
            style={{
              zIndex: 1000,
              cursor: 'pointer',
              marginLeft: 'auto',
              order: 2,
            }}
          >
            {discussion && isEditing && !isCreatingNew ? (
              <div>
                <Button
                  variant="contained"
                  color="secondary"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={this.deleteDiscussion}
                >
                  Delete
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={this.archiveDiscussion}
                  style={{ marginLeft: '15px' }}
                >
                  {discussion.isDiscussionArchived ? 'Unarchive' : 'Archive'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={this.createOrUpdateDiscussion}
                  style={{ marginLeft: '15px' }}
                >
                  Save changes
                </Button>
                <Button
                  variant="outlined"
                  type="button"
                  disabled={this.state.disabled}
                  onClick={() => {
                    if (this._isMounted) {
                      this.setState({ isEditing: false });
                    }
                  }}
                  style={{
                    marginLeft: '15px',
                    color: currentUser.showDarkTheme ? '#fff' : '#000',
                    border: currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
          <div
            style={{
              zIndex: 1000,
              cursor: 'pointer',
              marginLeft: isMobile ? 'none' : 'auto',
              marginRight: isMobile ? '15px' : 'none',
              order: 3,
              display: this.state.isEditing ? 'none' : 'inherit',
            }}
          >
            {discussion && discussion.discussionLeaderId === currentUser._id ? (
              <MoreVertIcon
                style={{
                  fontSize: '18px',
                }}
                onClick={() => {
                  if (this._isMounted) {
                    this.setState({ isEditing: true });
                  }
                }}
              />
            ) : null}
          </div>
        </div>
        {discussion ? (
          <div
            style={{
              display: isMobile ? 'block' : 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                flexBasis: isMobile ? '100%' : '10%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Creator:
              <Tooltip
                title={discussion.leader.userName || discussion.leader.email}
                placement="bottom"
                disableFocusListener
                disableTouchListener
              >
                <Avatar
                  src={discussion.leader.userAvatarUrl}
                  sx={{
                    verticalAlign: 'middle',
                    marginLeft: '5px',
                  }}
                />
              </Tooltip>
            </div>
            {isMobile ? <p /> : null}
            <div
              style={{
                flexBasis: isMobile ? '100%' : '90%',
                display: 'flex',
                alignItems: 'center',
                marginLeft: isMobile ? '0px' : '20px',
              }}
            >
              Participants:
              {discussion &&
                discussion.members.map((m) => (
                  <div key={m._id + '-tooltip-avatar'}>
                    <Tooltip
                      title={m.userName || m.email}
                      placement="bottom"
                      disableFocusListener
                      disableTouchListener
                    >
                      <Avatar
                        src={m.userAvatarUrl}
                        sx={{
                          verticalAlign: 'middle',
                          marginLeft: '5px',
                        }}
                      />
                    </Tooltip>
                  </div>
                ))}
              {discussion && discussion.discussionMemberIds.length < 2 ? (
                <span style={{ marginLeft: '10px' }}>No other participants</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <hr style={{ margin: '10px 0' }} />
        <p />

        <div style={{ margin: '10px 0' }}>
          {isEditing || isCreatingNew ? (
            <>
              <h4 style={{ marginBottom: '3px' }}>Discussion name (required)</h4>
              <TextField
                autoComplete="off"
                value={this.state.discussionName}
                onChange={(event) => {
                  if (this._isMounted) {
                    this.setState({ discussionName: event.target.value });
                  }
                }}
                placeholder="Provide discussion with short name"
                variant="outlined"
                style={{
                  fontFamily: 'Roboto, sans-serif',
                  margin: isMobile ? '0px' : '10px 0px',
                  width: '100%',
                  marginBottom: '20px',
                }}
              />
            </>
          ) : null}
          <p />
          {isEditing || isCreatingNew ? (
            <>
              <h4 style={{ marginBottom: '12px' }}>Select participants (optional)</h4>
              <MemberChooser
                label="Select participants to join discussion"
                placeholder="These team members will see and participate in this discussion"
                onChange={(discussionMemberIds) => {
                  if (this._isMounted) {
                    this.setState({ discussionMemberIds });
                  }
                }}
                members={currentUser.currentTeam.members.filter((m) => m._id !== currentUser._id)}
                selectedMemberIds={this.state.discussionMemberIds}
              />
            </>
          ) : null}
        </div>
        {discussion && firstComment && !isEditing && !isCreatingNew ? (
          <div
            style={
              {
                // maxHeight: 'calc(100% - 0px)',
              }
            }
          >
            <h4 style={{ marginTop: '0px' }}>First comment:</h4>
            <div
              style={{
                margin: '15px auto 0px 0px',
                display: 'flex',
                width: '100%',
              }}
              data-comment-id={firstComment.commentId}
            >
              <div
                style={{
                  minWidth: '11px',
                  minHeight: '10px',
                }}
              >
                {firstComment.isCommentUnreadForUser ? (
                  firstComment.createdUserId !== currentUser._id ? (
                    <CircleIcon
                      style={{
                        fontSize: '12px',
                        zIndex: 1000,
                        cursor: 'pointer',
                        marginRight: '2px',
                      }}
                      onClick={this.readComment}
                      data-comment-id={firstComment.commentId}
                    />
                  ) : null
                ) : firstComment.createdUserId !== currentUser._id ? (
                  <CircleOutlinedIcon
                    style={{
                      fontSize: '13px',
                      zIndex: 1000,
                      opacity: 0.33,
                      cursor: 'pointer',
                      marginRight: '2px',
                    }}
                    onClick={this.unreadComment}
                    data-comment-id={firstComment.commentId}
                  />
                ) : null}
              </div>
              <CommentDetail
                comment={firstComment}
                onEditClick={this.onEditClickCallback}
                onShowMarkdownClick={this.onShowMarkdownClickCallback}
                isMobile={this.props.isMobile}
                teamId={teamId}
                isUnread={firstComment.isCommentUnreadForUser}
                store={this.props.store}
                isCommentSelected={
                  this.state.selectedComment &&
                  this.state.selectedComment.commentId === firstComment.commentId
                    ? true
                    : false
                }
              />
            </div>
            <div style={{ fontSize: '13px', margin: '5px 0px 20px 25px' }}>
              {firstComment.files &&
                firstComment.files.map((f, i) => (
                  <div key={f.fileUrl + '-anchor-1'}>
                    <a
                      href={f.fileUrl}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                      style={{ color: '#0077ff', cursor: 'pointer' }}
                    >
                      {f.fileName}
                    </a>
                    {i === firstComment.files.length - 1 ? null : ' | '}
                  </div>
                ))}
            </div>{' '}
            <hr style={{ margin: '10px 0' }} />
          </div>
        ) : null}
        <div
          style={{
            // overflowY: 'auto',
            // maxHeight: 'calc(100% - 380px)',
            display: 'flex',
            flexDirection: 'column',
            // width: 'calc(83% - 54px)',
            // maxWidth: 'inherit',
            // position: 'fixed',
            padding: '10px 0px',
          }}
        >
          {isEditing || isCreatingNew ? null : this.renderComments()}
          {this.state.selectedComment ? null : this.renderCommentForm()}
          <p />
        </div>
        {!discussion && isCreatingNew ? (
          <div>
            <Button
              variant="contained"
              color="primary"
              type="button"
              disabled={this.state.disabled}
              onClick={this.createOrUpdateDiscussion}
              style={{ float: 'right' }}
            >
              Create discussion
            </Button>
            <Button
              variant="outlined"
              type="button"
              disabled={this.state.disabled}
              onClick={() => this.props.onPlusIconClickPropForDD()}
              style={{
                float: 'right',
                marginRight: '20px',
                color: currentUser.showDarkTheme ? '#fff' : '#000',
                border: currentUser.showDarkTheme ? '1px solid #fff' : '1px solid #000',
              }}
            >
              Cancel
            </Button>
            <p />
            <br />
          </div>
        ) : null}
        <p />
      </>
    );
  }

  private createOrUpdateDiscussion = async () => {
    const { currentUser } = this.props.store;
    const { discussionName, discussionMemberIds, contentForComment } = this.state;
    const { teamId } = this.props;

    if (!discussionName) {
      notify('Discussion must have name.');
      return;
    }

    if (!contentForComment) {
      notify('Discussion must have first comment.');
      return;
    }

    if (discussionMemberIds && !discussionMemberIds.includes(currentUser._id)) {
      discussionMemberIds.push(currentUser._id);
    }

    const { currentTeam } = currentUser;

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

    // get files from localStorage fo first comment of new discussion
    const storageKey = `files-${teamId}-new-discussion-new-comment`;

    const filesForFirstCommentOfNewDiscussion =
      (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem(storageKey))) || [];

    try {
      const discussion = await currentUser.createOrUpdateDiscussionStoreMethod({
        discussionName,
        discussionMemberIds,
        teamId,
        id: this.props.discussion ? this.props.discussion.discussionId : null,
        content: contentForComment,
        files: filesForFirstCommentOfNewDiscussion,
      });

      // remove content and files from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`content-${teamId}-new-discussion-new-comment`);
        localStorage.removeItem(`files-${teamId}-new-discussion-new-comment`);
      }

      if (this.props.discussion && this.props.discussion.discussionId) {
        notify('You updated discussion.');
        Router.push(
          `/discussion?teamId=${teamId}&discussionId=${discussion.discussionId}`,
          `/teams/${teamId}/discussions/${discussion.discussionId}`,
        );
      } else {
        notify('You created new discussion.');
        Router.push(
          `/discussion?teamId=${teamId}&discussionId=${discussion.discussionId}`,
          `/teams/${teamId}/discussions/${discussion.discussionId}`,
        );
      }
    } catch (error) {
      notify('A discussion with this name already exists.');
      // (error.message);
    } finally {
      this.setState({
        disabled: false,
      });

      if (this.state.isCreatingNew) {
        this.props.onPlusIconClickPropForDD();
      }

      NProgress.done();
    }
  };

  private deleteDiscussion = async () => {
    const { discussion, teamId, store, whichList } = this.props;

    const { currentUser } = store;

    if (!discussion) {
      return;
    }

    confirm({
      title: 'Delete discussion',
      message:
        'When you delete discussion, you delete all comments and all attached files within it. Are you sure?',
      okText: 'Yes, delete',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          await currentUser.deleteDiscussionStoreMethod({
            discussionId: discussion.discussionId,
            teamId,
            whichList,
          });

          notify(`You deleted discussion: '${this.props.discussion.discussionName}'.`);

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

  private archiveDiscussion = async () => {
    const { discussion, teamId, store } = this.props;

    const { currentUser } = store;

    if (!discussion) {
      return;
    }

    const { currentTeam } = currentUser;

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

    confirm({
      title:
        discussion && discussion.isDiscussionArchived
          ? 'Unarchive discussion'
          : 'Archive discussion',
      message:
        discussion && discussion.isDiscussionArchived
          ? 'Unarchiving discussion will move it to active list.'
          : 'Archiving discussion will move it to archived list.',
      okText: discussion && discussion.isDiscussionArchived ? 'Yes, unarchive' : 'Yes, archive',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          // define
          await currentUser.archiveDiscussionStoreMethod({
            discussionId: discussion.discussionId,
            teamId,
            action: discussion && discussion.isDiscussionArchived ? 'unarchive' : 'archive',
          });

          notify(`You archived discussion: '${this.props.discussion.discussionName}'.`);

          if (discussion && discussion.isDiscussionArchived) {
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
          } else if (discussion && !discussion.isDiscussionArchived) {
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
          }
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

  private renderComments() {
    const { isServer, discussion, teamId, store, isMobile } = this.props;
    const { selectedComment, showMarkdownClicked } = this.state;

    if (discussion && !discussion.isLoadingComments && discussion.comments.length === 0) {
      return <p>Empty Discussion.</p>;
    }

    let loading = 'loading Comments ...';
    if (discussion && discussion.comments.length > 0) {
      loading = 'checking for newer comments ...';
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          // maxHeight: this.state.selectedComment ? 'calc(100% - 200px)' : 'calc(100% - 480px)',
          // width: 'calc(83% - 54px)',
          // maxWidth: 'inherit',
          // marginTop: '10px',
        }}
      >
        {discussion
          ? discussion.comments.map((c) =>
              selectedComment && selectedComment.commentId === c.commentId ? (
                <div key={c.commentId + '-render-comments-1'}>
                  {discussion.firstCommentId === selectedComment.commentId ? null : (
                    <>
                      <CommentDetail
                        comment={c}
                        onEditClick={this.onEditClickCallback}
                        onShowMarkdownClick={this.onShowMarkdownClickCallback}
                        isMobile={this.props.isMobile}
                        teamId={teamId}
                        isUnread={c.isCommentUnreadForUser}
                        store={this.props.store}
                        isCommentSelected={
                          this.state.selectedComment &&
                          this.state.selectedComment.commentId === c.commentId
                            ? true
                            : false
                        }
                      />
                    </>
                  )}

                  <CommentForm
                    // key={c.commentId + 'cf'}
                    comment={c}
                    readOnly={showMarkdownClicked}
                    discussion={discussion}
                    members={discussion.members}
                    onFinished={() => {
                      setTimeout(() => {
                        if (this._isMounted) {
                          this.setState({ selectedComment: null, showMarkdownClicked: false });
                        }
                      }, 0);
                    }}
                    teamId={teamId}
                    onContentChangeInCommentForm={this.onContentChangedInDiscussionDetail}
                    onFileUploadProp2={this.onFileUpload}
                    onLocalStorageUpdate2={this.onLocalStorageUpdate}
                    isMobile={isMobile}
                  />
                  <div
                    style={{ fontSize: '13px', margin: '-5px 0px 15px 45px' }}
                    // key={c.commentId + '-div-4'}
                  >
                    {c &&
                      c.files &&
                      c.files.map((f, i) => (
                        <div key={c.commentId + f.fileUrl + '-anchor-2'}>
                          <a
                            href={f.fileUrl}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                            style={{ color: '#0077ff', cursor: 'pointer' }}
                          >
                            {f.fileName}
                          </a>
                          {this.state.selectedComment ? (
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
                          {i === c.files.length - 1 ? null : ' | '}
                        </div>
                      ))}
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      marginRight: '0px',
                      marginTop: '0px',
                      marginBottom: '40px',
                      float: 'right',
                    }}
                  >
                    <Button
                      variant="outlined"
                      type="button"
                      disabled={this.state.disabled}
                      onClick={() => {
                        if (this._isMounted) {
                          this.setState({ selectedComment: null });
                        }
                      }}
                      style={{
                        marginLeft: isMobile ? '40px' : '15px',
                        color: store.currentUser.showDarkTheme ? '#fff' : '#000',
                        border: store.currentUser.showDarkTheme
                          ? '1px solid #fff'
                          : '1px solid #000',
                      }}
                    >
                      Exit editing
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      type="button"
                      disabled={this.state.disabled}
                      onClick={this.deleteComment}
                      style={{ marginLeft: '20px' }}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      type="button"
                      disabled={
                        this.state.disabled ||
                        (this.state.selectedComment &&
                          this.state.selectedComment.content === this.state.contentForComment)
                          ? true
                          : false
                      }
                      onClick={this.editComment}
                      style={{
                        marginLeft: isMobile ? '40px' : '20px',
                        marginTop: isMobile ? '20px' : 'inherit',
                      }}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={c.commentId + '-render-comments-2'}>
                  {discussion.firstCommentId !== c.commentId ? (
                    <>
                      <div
                        style={{
                          margin: '15px auto 0px 0px',
                          display: 'flex',
                          width: '100%',
                        }}
                        // key={c.commentId + '-div-6'}
                        data-comment-id={c.commentId}
                      >
                        <div
                          style={{
                            minWidth: '11px',
                            minHeight: '10px',
                          }}
                          // key={c.commentId + '-icon-div-2'}
                        >
                          {c.isCommentUnreadForUser ? (
                            c.createdUserId !== store.currentUser._id ? (
                              <CircleIcon
                                style={{
                                  fontSize: '12px',
                                  zIndex: 1000,
                                  cursor: 'pointer',
                                  marginRight: '2px',
                                }}
                                onClick={this.readComment}
                                data-comment-id={c.commentId}
                                // key={c.commentId + '-icon-read-2'}
                              />
                            ) : null
                          ) : c.createdUserId !== store.currentUser._id ? (
                            <CircleOutlinedIcon
                              style={{
                                fontSize: '13px',
                                zIndex: 1000,
                                opacity: 0.33,
                                cursor: 'pointer',
                                marginRight: '2px',
                              }}
                              onClick={this.unreadComment}
                              data-comment-id={c.commentId}
                              // key={c.commentId + '-icon-unread-2'}
                            />
                          ) : null}
                        </div>
                        <CommentDetail
                          // key={c.commentId + 'cd'}
                          comment={c}
                          onEditClick={this.onEditClickCallback}
                          onShowMarkdownClick={this.onShowMarkdownClickCallback}
                          isMobile={this.props.isMobile}
                          teamId={teamId}
                          isUnread={c.isCommentUnreadForUser}
                          store={this.props.store}
                          isCommentSelected={
                            this.state.selectedComment &&
                            this.state.selectedComment.commentId === c.commentId
                              ? true
                              : false
                          }
                        />
                      </div>
                      <div
                        style={{ fontSize: '13px', margin: '5px 0px 20px 25px' }}
                        // key={c.commentId + '-div-7'}
                      >
                        {c &&
                          c.files &&
                          c.files.map((f, i) => (
                            <div key={c.commentId + f.fileUrl + '-anchor-3'}>
                              <a
                                href={f.fileUrl}
                                rel="nofollow noopener noreferrer"
                                target="_blank"
                                style={{ color: '#0077ff', cursor: 'pointer' }}
                              >
                                {f.fileName}
                              </a>
                              {i === c.files.length - 1 ? null : ' | '}
                            </div>
                          ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ),
            )
          : null}

        <Loading
          text={loading}
          style={{
            visibility:
              discussion && discussion.isLoadingComments && !isServer ? 'visible' : 'hidden',
            float: 'right',
          }}
        />
      </div>
    );
  }

  private renderCommentForm() {
    const { teamId, discussion } = this.props;
    const {
      selectedComment,
      isCreatingNew,
      isEditing,
      filesForNewComment,
      filesForFirstCommentOfNewDiscussion,
    } = this.state;

    if (discussion && discussion.isLoadingComments && discussion.comments.length === 0) {
      return null;
    }

    let textForCommentForm;

    if (discussion && !isEditing && !isCreatingNew) {
      textForCommentForm = discussion.isDiscussionArchived ? null : 'Add comment';
    } else if (discussion && isEditing && !isCreatingNew) {
      textForCommentForm = 'Edit first comment';
    } else if (!discussion && !isEditing && isCreatingNew) {
      textForCommentForm = 'First comment (required)';
    }

    return (
      <React.Fragment>
        <p style={{ marginTop: '0px' }}>{textForCommentForm}</p>

        {!selectedComment && isEditing && discussion && discussion.firstComment ? (
          <div>
            <CommentForm
              key={discussion.firstComment.commentId + '-first-comment-cf'}
              comment={discussion.firstComment}
              discussion={discussion}
              members={discussion.members}
              isMobile={this.props.isMobile}
              teamId={teamId}
              onContentChangeInCommentForm={this.onContentChangedInDiscussionDetail}
              onFileUploadProp2={this.onFileUpload}
              onLocalStorageUpdate2={this.onLocalStorageUpdate}
            />
            <div style={{ fontSize: '13px', margin: '0px 0px 15px 45px' }}>
              {discussion.firstComment.files &&
                discussion.firstComment.files.map((f, i) => (
                  <div key={f.fileUrl + '-anchor-4'}>
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
                      onClick={this.deleteFile}
                    />
                    {i === discussion.firstComment.files.length - 1 ? null : ' | '}
                  </div>
                ))}
            </div>
          </div>
        ) : discussion && discussion.isDiscussionArchived ? null : (
          <div>
            <CommentForm
              key={'cf-new'}
              comment={null}
              discussion={discussion}
              members={discussion && discussion.members}
              isMobile={this.props.isMobile}
              teamId={teamId}
              onContentChangeInCommentForm={this.onContentChangedInDiscussionDetail}
              onFileUploadProp2={this.onFileUpload}
              onLocalStorageUpdate2={this.onLocalStorageUpdate}
            />
            <div style={{ fontSize: '13px', margin: '-15px 0px 15px 45px' }}>
              {discussion &&
                !isEditing &&
                !isCreatingNew &&
                filesForNewComment.map((f, i) => (
                  <div key={f.fileUrl + '-anchor-5'}>
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
                      onClick={this.deleteFileThatHasNoComment}
                    />
                    {i === filesForNewComment.length - 1 ? null : ' | '}
                  </div>
                ))}
              {!discussion &&
                !isEditing &&
                isCreatingNew &&
                filesForFirstCommentOfNewDiscussion.map((f, i) => (
                  <div key={f.fileUrl + '-anchor-6'}>
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
                      onClick={this.deleteFileThatHasNoComment}
                    />
                    {i === filesForFirstCommentOfNewDiscussion.length - 1 ? null : ' | '}
                  </div>
                ))}
            </div>
          </div>
        )}
      </React.Fragment>
    );
  }

  private onContentChangedInDiscussionDetail = (content: string) => {
    if (this._isMounted) {
      this.setState({ contentForComment: content });
    }
  };

  private onFileUpload = (isFileUploading: boolean) => {
    if (this._isMounted) {
      this.setState({ disabled: isFileUploading });
    }
  };

  private onLocalStorageUpdate = () => {
    const { discussion, teamId } = this.props;

    if (discussion) {
      this.storageKey = `files-${teamId}-${discussion.discussionId}-new-comment`;

      const filesForNewComment =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];
      if (this._isMounted) {
        this.setState({ filesForNewComment });
      }
    } else if (!discussion) {
      this.storageKey = `files-${teamId}-new-discussion-new-comment`;

      const filesForFirstCommentOfNewDiscussion =
        (typeof localStorage !== 'undefined' &&
          JSON.parse(localStorage.getItem(this.storageKey))) ||
        [];

      if (this._isMounted) {
        this.setState({ filesForFirstCommentOfNewDiscussion });
      }
    }
  };

  private handleCommentEvent = (data) => {
    const { discussion } = this.props;
    if (discussion) {
      discussion.handleCommentRealtimeEventStoreMethod(data);
    }
  };

  private handleSocketReconnect = () => {
    const { discussion } = this.props;
    if (discussion) {
      discussion.loadCommentsStoreMethod().catch((err) => notify(err));
      discussion.joinDiscussionSocketRoomStoreMethod();
    }
  };

  private onEditClickCallback = (comment: Comment) => {
    const { store } = comment;
    if (store.currentUser && comment.createdUserId === store.currentUser._id && this._isMounted) {
      this.setState({
        selectedComment: comment,
        contentForComment: comment.content,
        showMarkdownClicked: false,
      });
    }
  };

  private onShowMarkdownClickCallback = (comment) => {
    this.setState({ selectedComment: comment, showMarkdownClicked: true });
  };

  private editComment = async () => {
    const { discussion, teamId, store } = this.props;
    const { selectedComment, contentForComment } = this.state;

    if (!selectedComment) {
      notify('Please select comment.');
      return;
    }

    if (!contentForComment) {
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

    const data: {
      content: string;
      teamId: string;
      discussionId: string;
      id: string;
    } = {
      content: contentForComment,
      teamId,
      discussionId: discussion.discussionId,
      id: selectedComment.commentId,
    };

    try {
      await discussion.addOrEditCommentStoreMethod(data);

      notify('You edited comment.');
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false, selectedComment: null });
      NProgress.done();
    }
  };

  private deleteComment = async () => {
    const { discussion, teamId } = this.props;
    const { selectedComment } = this.state;

    if (!discussion) {
      return;
    }

    confirm({
      title: 'Delete comment',
      message:
        'When you delete comment, you delete comment from discussion and all files attached to this comment (if any). Are you sure?',
      okText: 'Yes, delete',
      buttonColor: 'secondary',
      onAnswer: async (answer) => {
        if (!answer) {
          return;
        }

        NProgress.start();
        this.setState({ disabled: true });

        try {
          // call discussion.deleteCommentStoreMethod
          // edit CommentDetail

          await discussion.deleteCommentStoreMethod({ comment: selectedComment, teamId });

          notify(`You deleted comment.`);
        } catch (error) {
          console.error(error);
          notify(error);
        } finally {
          this.setState({ disabled: false, selectedComment: null });
          NProgress.done();
        }
      },
    });
  };

  private deleteFile = async (event) => {
    const { discussion, teamId } = this.props;
    const { selectedComment } = this.state;

    const fileUrl = event.currentTarget.dataset.id;

    if (!discussion) {
      return;
    }

    NProgress.start();
    this.setState({ disabled: true });

    try {
      if (selectedComment) {
        await selectedComment.deleteFileStoreMethod({
          commentId: selectedComment.commentId,
          teamId,
          fileUrl,
        });
      }

      if (!selectedComment && discussion.firstComment) {
        await discussion.firstComment.deleteFileStoreMethod({
          commentId: discussion.firstCommentId,
          teamId,
          fileUrl,
        });
      }

      notify(`You deleted file.`);
    } catch (error) {
      console.error(error);
      notify(error);
    } finally {
      this.setState({ disabled: false, selectedComment: null });
      NProgress.done();
    }
  };

  private deleteFileThatHasNoComment = async (event) => {
    const { discussion, teamId } = this.props;

    const fileUrl = event.currentTarget.dataset.id;

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await deleteFileThatHasNoCommentApiMethod({
        teamId,
        fileUrl,
      });

      // remove file from local storage
      if (
        typeof localStorage !== 'undefined' &&
        !discussion &&
        !this.state.selectedComment &&
        fileUrl
      ) {
        this.storageKey = `files-${teamId}-new-discussion-new-comment`;

        const filesForFirstCommentOfNewDiscussion = (
          JSON.parse(localStorage.getItem(this.storageKey)) || []
        ).filter((f) => f.fileUrl !== fileUrl);

        if (this.storageKey) {
          localStorage.setItem(
            this.storageKey,
            JSON.stringify(filesForFirstCommentOfNewDiscussion),
          );
        }

        this.setState({ filesForFirstCommentOfNewDiscussion });
      } else if (
        typeof localStorage !== 'undefined' &&
        discussion &&
        !this.state.selectedComment &&
        fileUrl
      ) {
        this.storageKey = `files-${teamId}-${discussion.discussionId}-new-comment`;

        const filesForNewComment = (JSON.parse(localStorage.getItem(this.storageKey)) || []).filter(
          (f) => f.fileUrl !== fileUrl,
        );

        if (this.storageKey) {
          localStorage.setItem(this.storageKey, JSON.stringify(filesForNewComment));
        }

        this.setState({ filesForNewComment });
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

  private unreadComment = async (event) => {
    event.preventDefault();

    const { currentUser } = this.props.store;

    const { commentId } = event.currentTarget.dataset;

    await currentUser.unreadCommentStoreMethod(commentId, this.props.teamId);

    const wrapperElm = document.getElementById(`comment-${commentId}`);

    if (!wrapperElm) {
      return;
    }

    const y = wrapperElm.offsetTop - wrapperElm.getBoundingClientRect().top;
    window.scrollTo({ top: y });
    this.setState({ isScrollJumpNeeded: false });
  };

  private readComment = async (event) => {
    event.preventDefault();

    const { currentUser } = this.props.store;

    const { commentId } = event.currentTarget.dataset;

    await currentUser.readCommentStoreMethod(commentId, this.props.teamId);

    const wrapperElm = document.getElementById(`comment-${commentId}`);

    if (!wrapperElm) {
      return;
    }

    const y = wrapperElm.offsetTop - wrapperElm.getBoundingClientRect().top;

    window.scrollTo({ top: y });
    this.setState({ isScrollJumpNeeded: false });
  };
}

export default observer(DiscussionDetail);
