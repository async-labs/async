import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import CircleIcon from '@mui/icons-material/Circle';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

import Link from 'next/link';
import { observer } from 'mobx-react';
import * as React from 'react';

import { Store, Chat } from 'lib/store';

type Props = {
  store: Store;
  href: string;
  as: string;
  text?: string;
  isSelected: boolean;
  isUnread?: boolean;
  isPinned?: boolean;
  discussionId?: string;
  teamId: string;
  isDiscussionArchived?: boolean;
  isChat?: boolean;
  chat?: Chat;
  isMobile: boolean;
};

type State = {
  isPinnedIconVisible: boolean;
};

class SidebarListItem extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      isPinnedIconVisible: false,
    };
  }

  public render() {
    const {
      store,
      href,
      as,
      text,
      isSelected,
      isPinned,
      isDiscussionArchived,
      isUnread,
      isChat,
      chat,
      isMobile,
    } = this.props;

    const isThemeDark = store.currentUser.showDarkTheme === true;

    const isSelectedItemBorder = isThemeDark ? '1px #fff solid' : '1px #222 solid';

    let paddingStyle = '10px 11px 10px 11px';

    if (isChat) {
      paddingStyle = '0px 11px 10px 11px';
    }

    return (
      <div style={{ display: 'flex' }}>
        {isUnread ? (
          <CircleIcon
            style={{
              fontSize: '8px',
              marginTop: '3px',
              marginLeft: '-10px',
              marginRight: '3px',
            }}
          />
        ) : null}
        {href.includes('/team-settings') ? (
          <Paper
            style={{
              marginBottom: '10px',
              padding: paddingStyle,
              border: isSelected ? isSelectedItemBorder : 'none',
              flex: isSelected ? '1 1 95%' : '1 1 100%',
              fontSize: '14px',
              fontWeight: isSelected ? 600 : 400,
              textAlign: !isChat ? 'left' : 'match-parent',
            }}
            elevation={isSelected ? 4 : 1}
            onMouseOver={this.onMouseOver}
            onMouseOut={this.onMouseOut}
          >
            {isDiscussionArchived ? null : href.includes('/settings/') ||
              isChat ? null : isPinned ? (
              <PushPinIcon
                style={{ fontSize: '13px', float: 'right', marginRight: '-3px', zIndex: 1000 }}
                onClick={this.pinDiscussion}
              />
            ) : (
              <PushPinOutlinedIcon
                style={{
                  fontSize: '14px',
                  float: 'right',
                  marginRight: '-3px',
                  zIndex: 1000,
                  opacity: 0.7,
                  visibility: this.state.isPinnedIconVisible ? 'visible' : 'hidden',
                }}
                onClick={this.pinDiscussion}
              />
            )}
            {!isChat && !chat && text && text.length > 22 ? (
              <>
                {text.substring(0, 20)}
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {' '}
                  ...
                </span>
              </>
            ) : (
              text
            )}
            <div
              style={{
                flexBasis: isMobile ? '100%' : '90%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isChat && chat
                ? chat.members.map((m) => (
                    <div
                      key={m._id + '-avatar-list-of-chats'}
                      style={{
                        marginTop: '-4px',
                      }}
                    >
                      <CircleIcon
                        style={{
                          fontSize: '10px',
                          color: m.isTeamMemberOnline ? '#00c900' : 'gray',
                          marginLeft: '23px',
                          marginBottom: '-10px',
                        }}
                      />
                      <Avatar
                        src={m.userAvatarUrl}
                        sx={{
                          // verticalAlign: 'middle',
                          marginRight: '5px',
                        }}
                      />
                    </div>
                  ))
                : null}
            </div>
          </Paper>
        ) : (
          <Link href={href} as={as}>
            <Paper
              style={{
                marginBottom: '10px',
                padding: paddingStyle,
                border: isSelected ? isSelectedItemBorder : 'none',
                flex: isSelected ? '1 1 95%' : '1 1 100%',
                fontSize: '14px',
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                textAlign: !isChat ? 'left' : 'match-parent',
              }}
              elevation={isSelected ? 4 : 1}
              onMouseOver={this.onMouseOver}
              onMouseOut={this.onMouseOut}
            >
              {isDiscussionArchived ? null : href.includes('/settings/') ||
                isChat ? null : isPinned ? (
                <PushPinIcon
                  style={{ fontSize: '13px', float: 'right', marginRight: '-3px', zIndex: 1000 }}
                  onClick={this.pinDiscussion}
                />
              ) : (
                <PushPinOutlinedIcon
                  style={{
                    fontSize: '14px',
                    float: 'right',
                    marginRight: '-3px',
                    zIndex: 1000,
                    opacity: 0.7,
                    visibility: this.state.isPinnedIconVisible ? 'visible' : 'hidden',
                  }}
                  onClick={this.pinDiscussion}
                />
              )}
              {!isChat && !chat && text && text.length > 22 ? (
                <>
                  {text.substring(0, 20)}
                  <span
                    style={{
                      fontSize: '8px',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {' '}
                    ...
                  </span>
                </>
              ) : (
                text
              )}
              <div
                style={{
                  flexBasis: isMobile ? '100%' : '90%',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isChat && chat
                  ? chat.members.map((m) => (
                      <div
                        key={m._id + '-avatar-list-of-chats'}
                        style={{
                          marginTop: '-4px',
                        }}
                      >
                        <CircleIcon
                          style={{
                            fontSize: '10px',
                            color: m.isTeamMemberOnline ? '#00c900' : 'gray',
                            marginLeft: '23px',
                            marginBottom: '-10px',
                          }}
                        />
                        <Avatar
                          src={m.userAvatarUrl}
                          sx={{
                            // verticalAlign: 'middle',
                            marginRight: '5px',
                          }}
                        />
                      </div>
                    ))
                  : null}
              </div>
            </Paper>
          </Link>
        )}

        {isSelected ? (
          <div
            style={{
              fontSize: isChat ? '38px' : '30px',
              marginBottom: '8px',
              marginTop: isChat ? '1px' : '-3px',
            }}
          >
            |
          </div>
        ) : null}
      </div>
    );
  }

  private onMouseOver = (event) => {
    event.preventDefault();

    const { isPinned, isChat, href } = this.props;

    if (href.includes('/settings/') || isChat) {
      return;
    }

    if (!isPinned) {
      this.setState({ isPinnedIconVisible: true });
    }
  };

  private onMouseOut = (event) => {
    event.preventDefault();

    const { isPinned, isChat, href } = this.props;

    if (href.includes('/settings/') || isChat) {
      return;
    }

    if (!isPinned) {
      this.setState({ isPinnedIconVisible: false });
    }
  };

  private pinDiscussion = async (event) => {
    event.preventDefault();

    const { store, teamId, discussionId, isPinned, isChat, href } = this.props;
    const { currentUser } = store;

    if (!discussionId || href.includes('/settings/') || isChat) {
      return;
    }

    try {
      if (isPinned) {
        await currentUser.unpinDiscussionStoreMethod(discussionId, teamId);
      } else {
        await currentUser.pinDiscussionStoreMethod(discussionId, teamId);
      }
    } catch (error) {
      console.log(error);
    }
  };
}

export default observer(SidebarListItem);
