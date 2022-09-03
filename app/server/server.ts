import express from 'express';
// import helmet from 'helmet';
import { enableStaticRendering } from 'mobx-react';
import next from 'next';
import { loadEnvConfig } from '@next/env';
// import * as path from 'path';

// https://github.com/vercel/next.js/issues/12269
loadEnvConfig('./', process.env.NODE_ENV !== 'production');

// eslint-disable-next-line react-hooks/rules-of-hooks
enableStaticRendering(typeof window === 'undefined');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const URL_APP = dev ? process.env.NEXT_PUBLIC_URL_APP : process.env.NEXT_PUBLIC_PRODUCTION_URL_APP;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // give all Nextjs's request to Nextjs before anything else
  server.get('/_next/*', (req, res) => {
    handle(req, res);
  });

  // public folder for public resources
  server.get('/public/*', (req, res) => {
    handle(req, res);
  });

  // server.use(helmet());
  // server.use(express.json());

  if (!dev) {
    server.set('trust proxy', 1); // sets req.hostname, req.ip
  }

  // server.get('/robots.txt', (_, res) => {
  //   res.sendFile(path.join(__dirname, './', 'robots.txt'));
  // });

  // req.user is always undefined
  // redirect to /login
  // then logic inside MyApp.componentDidMount runs
  server.get('/', async (req: any, res) => {
    let redirectUrl;

    console.log('/', req.user);

    if (req.user) {
      redirectUrl = `teams/${req.user.defaultTeamSlug}/settings/team-settings`;
    } else {
      redirectUrl = 'login';
    }

    res.redirect(`${URL_APP}/${redirectUrl}`);
  });

  server.get('/register', (req, res) => {
    app.render(req, res, '/public/register');
  });

  server.get('/login', (req, res) => {
    const { teamId, error } = req.query;

    app.render(req, res, '/public/login', { teamId, error });
  });

  server.get('/teams/:teamId/settings/team-settings', (req, res) => {
    const { teamId } = req.params;
    app.render(req, res, '/settings/team-settings', { teamId });
  });

  server.get('/settings/my-account', (req, res) => {
    const { message } = req.query;
    app.render(req, res, '/settings/my-account', { message });
  });

  server.get('/settings/my-billing', (req, res) => {
    const { teamId } = req.params;
    const { message } = req.query;
    app.render(req, res, '/settings/my-billing', { teamId, message });
  });

  server.get('/teams/:teamId/discussions/:discussionId', (req, res) => {
    const { teamId, discussionId } = req.params;
    app.render(req, res, '/discussion', { teamId, discussionId });
  });

  server.get('/teams/:teamId/chats/:chatId', (req, res) => {
    const { teamId, chatId } = req.params;
    const { parentMessageId } = req.query;
    app.render(req, res, '/chat', { teamId, chatId, parentMessageId });
  });

  server.get('*', (req, res) => {
    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on ${URL_APP}, ${port}`);
  });
});
