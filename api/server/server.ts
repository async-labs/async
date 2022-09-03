import * as compression from 'compression';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
import * as express from 'express';
import helmet from 'helmet';
import * as httpModule from 'http';
import * as mongoose from 'mongoose';
import mongoSessionStore = require('connect-mongo');
import * as session from 'express-session';

// import * as path from 'path';
// import * as url from 'url';

import api from './api';
import { stripeWebHookAndCheckoutCallback } from './stripe';
import { setupPasswordless } from './passwordless';
import { setupSockets } from './sockets';

import { insertTemplates } from './models/EmailTemplate';

import logger from './logs';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 8000;
const ROOT_URL = dev ? `http://localhost:${port}` : process.env.PRODUCTION_API_SERVER_ENDPOINT;

const MONGO_URL = dev ? process.env.MONGO_URL_TEST : process.env.MONGO_URL;

const appPort = process.env.APP_PORT || 3000;
const { PRODUCTION_URL_APP } = process.env;
const URL_APP = dev ? `http://localhost:${appPort}` : PRODUCTION_URL_APP;

// const options = {
//   keepAlive: true,
//   useNewUrlParser: true,
//   useCreateIndex: true,
//   useFindAndModify: false,
//   useUnifiedTopology: true,
// };

// mongoose.connect(MONGO_URL, options);

// check connection
(async () => {
  try {
    await mongoose.connect(MONGO_URL);
    logger.info('connected to db');
    await insertTemplates();
    logger.info('inserted email templates');
  } catch (err) {
    console.log('error: ' + err);
  }
})();

const server = express();

server.use(
  cors({ origin: URL_APP, credentials: true, methods: 'GET,HEAD,PUT,OPTIONS,POST,DELETE' }),
);

server.use(helmet());
server.use(compression());

stripeWebHookAndCheckoutCallback({ server });

server.use(express.json());

const sessionOptions = {
  name: process.env.SESSION_NAME,
  secret: process.env.SESSION_SECRET,
  store: mongoSessionStore.create({
    mongoUrl: MONGO_URL,
    ttl: 14 * 24 * 60 * 60, // save session 14 days
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000, // expires in 14 days
    domain: dev ? 'localhost' : '.async-await.com',
  } as any,
};

if (!dev) {
  server.set('trust proxy', 1); // sets req.hostname, req.ip
  sessionOptions.cookie.secure = true; // sets cookie over HTTPS only
}

// server.get('/robots.txt', (_, res) => {
//   res.sendFile(path.join(__dirname, './', 'robots.txt'));
// });

const sessionMiddleware = session(sessionOptions);
server.use(sessionMiddleware);

setupPasswordless({ server, ROOT_URL });

api(server);

const httpServer = httpModule.createServer(server);
setupSockets({
  httpServer,
  origin: dev ? process.env.URL_APP : process.env.PRODUCTION_URL_APP,
  sessionMiddleware,
});

server.get('*', (_, res) => {
  res.sendStatus(403);
});

httpServer.listen(port, () => {
  logger.info(`> Ready on ${ROOT_URL}, ${port}`);
});
