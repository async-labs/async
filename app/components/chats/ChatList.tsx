import Avatar from '@mui/material/Avatar';
import CircleIcon from '@mui/icons-material/Circle';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

import ControlPointRoundedIcon from '@mui/icons-material/ControlPointRounded';

import { inject, observer } from 'mobx-react';
import Router, { NextRouter, withRouter } from 'next/router';
import React from 'react';
// import NProgress from 'nprogress';

import { Store } from '../../lib/store';
// import notify from '../../lib/notify';

import Loading from '../common/Loading';
import SidebarListItem from '../common/SidebarListItem';

type Props = {
  store?: Store;
  classes?: any;
  router: NextRouter;
  isMobile: boolean;
  teamId: string;
  onPlusIconClick: () => void;
};

class ChatList extends React.Component<Props> {
  public render() {
    const { store, isMobile, router, teamId } = this.props;
    const { asPath } = router;
    const { currentUser } = store;

    const isThemeDark = store.currentUser.showDarkTheme === true;

    if (!currentUser) {
      return null;
    }

    const orderedChats = currentUser.orderedChats;

    let loading = 'Loading...';

    if (orderedChats.length > 0) {
      loading = 'Loading chats...';
    }

    if (orderedChats.length === 0 && !currentUser.isLoadingChats) {
      loading = 'The chat list is empty.';
    }

    const selectedChat = asPath && orderedChats.find((c) => asPath.includes(`/chats/${c.chatId}`));

    return (
      <div
        style={{
          padding: '5px 5px 5px 10px',
          marginRight: isMobile ? '0px' : '5px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
          }}
        >
          {' '}
          <b>Chats</b>
          <ControlPointRoundedIcon
            onClick={this.showFormForNewChat}
            style={{
              cursor: 'pointer',
              margin: isMobile ? '-5px 10px 0px auto' : '-5px -10px 0px auto',
              opacity: '0.75',
            }}
          />
        </div>

        {isMobile ? (
          <FormControl
            style={{
              margin: isMobile ? '0px' : '10px 0px',
              width: isMobile ? '95%' : '380px',
            }}
            variant="outlined"
          >
            <InputLabel id="select-chat-outlined-label">Select chat</InputLabel>
            <Select
              labelId="select-chat-outlined-label"
              fullWidth
              style={{
                margin: '0px',
                background: isThemeDark ? 'none' : '#fff',
                height: isMobile ? '65px' : 'auto',
              }}
              value={(selectedChat && selectedChat.chatId) || ''}
              label="Select chat"
              onChange={(event) => {
                event.stopPropagation();
                const id = event.target.value;
                if (id) {
                  Router.push(
                    `/chat?chatId=${id}&teamId=${teamId}`,
                    `/teams/${teamId}/chats/${id}`,
                  );
                }
              }}
            >
              {orderedChats.map((c) => {
                return (
                  <MenuItem key={c.chatId + '-menu-item-chat'} value={c.chatId}>
                    Chat:{' '}
                    {c
                      ? c.members.map((cm) => (
                          <div key={cm._id}>
                            <CircleIcon
                              style={{
                                fontSize: '10px',
                                color: cm.isTeamMemberOnline ? '#00c900' : 'gray',
                                marginLeft: '33px',
                                marginBottom: '11px',
                              }}
                            />
                            <Avatar
                              src={cm.userAvatarUrl}
                              sx={{
                                margin: '-20px 0px 0px 8px',
                              }}
                            />
                          </div>
                        ))
                      : null}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        ) : (
          <ul style={{ listStyle: 'none', padding: '0px' }}>
            {orderedChats.map((c) => {
              const selected = asPath && asPath.includes(`/chats/${c.chatId}`);

              return (
                <SidebarListItem
                  store={store}
                  key={c.chatId + '-sidebar-list-item-chat'}
                  href={`/chat?chatId=${c.chatId}&teamId=${teamId}`}
                  as={`/teams/${teamId}/chats/${c.chatId}`}
                  isSelected={selected}
                  isPinned={c.isChatPinnedForUser}
                  discussionId={c.chatId}
                  teamId={teamId}
                  isDiscussionArchived={false}
                  isUnread={c.isChatUnreadForUser}
                  isChat={true}
                  chat={c}
                  isMobile={isMobile}
                />
              );
            })}
          </ul>
        )}
        <Loading
          text={loading}
          style={{
            visibility: currentUser.isLoadingChats || store.isServer ? 'visible' : 'hidden',
          }}
        />
      </div>
    );
  }

  private showFormForNewChat = (event) => {
    event.preventDefault();

    this.props.onPlusIconClick();
  };
}

export default withRouter<Props>(inject('store')(observer(ChatList)));
