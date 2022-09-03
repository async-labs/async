import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'mobx-react';
import App from 'next/app';
import Router, { NextRouter, withRouter } from 'next/router';
import NProgress from 'nprogress';
import React from 'react';
import Head from 'next/head';

import { themeDark, themeLight } from '../lib/theme';
import { getUserFromApiServerApiMethod } from '../lib/api/to-api-server-public';

import { getInitialDataApiMethod } from '../lib/api/to-api-server-team-member';
import { isMobile } from '../lib/isMobile';
import { initializeStore, Store, getStore } from '../lib/store';

import Confirmer from '../components/common/Confirmer';
import Notifier from '../components/common/Notifier';

const dev = process.env.NODE_ENV !== 'production';
const API_SERVER_ENDPOINT = dev
  ? process.env.NEXT_PUBLIC_API_SERVER_ENDPOINT
  : process.env.NEXT_PUBLIC_PRODUCTION_API_SERVER_ENDPOINT;

Router.events.on('routeChangeStart', () => {
  NProgress.start();
});

Router.events.on('routeChangeComplete', (url) => {
  if (url.includes('/chats')) {
    document.body.style.overflow = 'hidden';
    document.getElementById('__next').style.position = 'fixed';
  } else {
    document.body.style.overflow = 'visible';
    document.getElementById('__next').style.position = 'inherit';
  }
  NProgress.done();
});

Router.events.on('routeChangeError', () => NProgress.done());

// final `app` will not have server
// thus no server-side rendering
// thus reloading tab for page without teamId query will not throw errors

class MyApp extends App<{ router: NextRouter; initialState: any }> {
  public static async getInitialProps({ Component, ctx }) {
    const chatId = (ctx && ctx.query && ctx.query.chatId) || null;
    const discussionId = (ctx && ctx.query && ctx.query.discussionId) || null;
    const teamId = (ctx && ctx.query && ctx.query.teamId) || null;
    const parentMessageId = (ctx && ctx.query && ctx.query.parentMessageId) || null;

    let userRequired;

    if (ctx.pathname.includes('/register') || ctx.pathname.includes('/login')) {
      userRequired = false;
    } else {
      userRequired = true;
    }

    const pageProps = {
      isMobile: isMobile({ req: ctx.req }),
      discussionId,
      chatId,
      teamId,
      parentMessageId,
      userRequired,
      isSelectedDiscussionArchived: false,
    };

    if (Component.getInitialProps) {
      Object.assign(pageProps, await Component.getInitialProps(ctx));
    }

    const appProps = { pageProps };

    let userObj = null;

    try {
      const { userFromApiServer } = await getUserFromApiServerApiMethod(ctx.req);

      if (userFromApiServer) {
        userObj = {
          ...userFromApiServer,
        };
      }
    } catch (error) {
      console.log(error);
    }

    if (ctx.pathname.includes('/my-billing') || ctx.pathname.includes('/my-account')) {
      const store = getStore();
      if (store) {
        appProps.pageProps.teamId = store.currentUser.currentTeam.teamId || null;
        return {
          ...appProps,
          initialState: {
            user: userObj,
            userRequired,
            teamId: store.currentUser.currentTeam.teamId || null,
            pathname: ctx.pathname,
          },
        };
      }
    }

    let initialData;

    if (userObj) {
      try {
        initialData = await getInitialDataApiMethod({
          request: ctx.req,
          discussionId,
          chatId,
          teamId: userRequired ? teamId : userObj.defaultTeamId,
        });
      } catch (error) {
        console.error(error);
      }
    }

    // initialData has initialTeams and teamId

    appProps.pageProps.teamId = teamId;
    appProps.pageProps.userRequired = userRequired;

    if (discussionId) {
      appProps.pageProps.isSelectedDiscussionArchived =
        initialData && initialData.isSelectedDiscussionArchived;
    }

    return {
      ...appProps,
      initialState: {
        teamId,
        ...initialData,
        user: userObj,
        userRequired,
        pathname: ctx.pathname,
      },
    };
  }

  private store: Store;

  constructor(props) {
    super(props);

    this.store = initializeStore(props.initialState);
  }

  public async componentDidMount() {
    const { user, userRequired, teamId, pathname } = this.props.initialState;

    if (pathname.includes('/chat')) {
      document.body.style.overflow = 'hidden';
      document.getElementById('__next').style.position = 'fixed';
    } else {
      document.body.style.overflow = 'visible';
      document.getElementById('__next').style.position = 'inherit';
    }

    if (userRequired && !user) {
      Router.push('/public/login', '/login');
      return;
    }

    if (!userRequired && user) {
      if (teamId) {
        Router.push(`${API_SERVER_ENDPOINT}/logout?teamId=${teamId}`);
        return;
      } else {
        Router.push(
          `/settings/team-settings?teamId=${user.defaultTeamId}`,
          `/teams/${user.defaultTeamId}/settings/team-settings`,
        );
        return;
      }
    }
  }

  public render() {
    const { Component, pageProps } = this.props;
    const store = this.store;
    const { currentUser } = store;

    const { user, userRequired } = this.props.initialState;

    if (userRequired && !user) {
      return null;
    }

    if (!userRequired && user) {
      return null;
    }

    const currentUrl = this.props.router.pathname;

    pageProps.currentUrl = currentUrl;

    let showDarkTheme;
    if (!currentUser || currentUrl.includes('/login') || currentUrl.includes('/register')) {
      showDarkTheme = true;
    } else {
      showDarkTheme = currentUser.showDarkTheme;
    }

    pageProps.showDarkTheme = showDarkTheme;

    // const isServer = typeof window === 'undefined';

    return (
      <CacheProvider value={createCache({ key: 'css' })}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <ThemeProvider theme={showDarkTheme ? themeDark : themeLight}>
          <CssBaseline />
          <Provider store={store}>
            <Component {...pageProps} store={store} />
          </Provider>
          <Notifier />
          <Confirmer showDarkTheme={showDarkTheme} />
        </ThemeProvider>
      </CacheProvider>
    );
  }
}

export default withRouter(MyApp);
