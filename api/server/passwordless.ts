import * as dotenv from 'dotenv';
import * as passwordless from 'passwordless';

import sendEmail from './aws-ses';
import logger from './logs';
import User from './models/User';
import PasswordlessMongoStore from './passwordless-token';
import getEmailTemplate from './models/EmailTemplate';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const URL_APP = dev ? process.env.URL_APP : process.env.PRODUCTION_URL_APP;

function setupPasswordless({ server, ROOT_URL }) {
  const mongoStore = new PasswordlessMongoStore();
  passwordless.init(mongoStore);

  passwordless.addDelivery(async (tokenToSend, uidToSend, recipient, callback) => {
    const user = await User.findOne({ email: recipient }).setOptions({ lean: true });

    // logger.info('passwordless.addDelivery: ' + recipient);

    try {
      // review this logic
      const template = await getEmailTemplate(
        user ? 'login' : 'to-be-registered', // test
        {
          loginUrl: `${ROOT_URL}/auth/logged_in?token=${tokenToSend}&uid=${encodeURIComponent(
            uidToSend,
          )}`,
        },
      );

      // logger.debug(template.message);

      await sendEmail({
        from: `From <${process.env.FROM_EMAIL_ADDRESS}>`,
        to: [recipient],
        subject: template.subject,
        body: template.message,
      });

      callback();
    } catch (err) {
      logger.error('Email sending error:', err);
      callback(err);
    }
  });

  server.use(passwordless.sessionSupport());

  server.use((req, __, next) => {
    if (req.user && typeof req.user === 'string') {
      User.findById(req.user, User.publicFields()).exec((err, user) => {
        req.user = user;
        next(err);
      });
    } else {
      next();
    }
  });

  server.get(
    '/auth/logged_in',
    passwordless.acceptToken(),
    (req, __, next) => {
      if (req.user && typeof req.user === 'string') {
        User.findById(req.user, User.publicFields()).exec((err, user) => {
          req.user = user;
          next(err);
        });
      } else {
        next();
      }
    },
    async (req, res) => {
      if (!req.user) {
        res.redirect(`${URL_APP}/login?error=Invitation%20link%20has%20expired.`);
      } else {
        res.redirect(
          `${URL_APP}/teams/${encodeURIComponent(req.user.defaultTeamId)}/settings/team-settings`,
        );
      }
    },
  );

  // middleware for /auth/send-token
  async function checkUser(req: any, res, next) {
    // logger.info('passwordless middleware: ' + req.body.user);

    // teamId is only truthy for invitation event
    // const teamId = req.get('x-async-teamId');

    const { isLoginEvent, user } = req.body;

    // if login or signup event, check if user exist in database
    if (isLoginEvent) {
      const existingUser = await User.findOne({ email: user }).setOptions({ lean: true });

      // if user does not exist, respond with error object
      if (!existingUser) {
        // logger.info('You do not have permission to use this Login page.');
        res.status(201).json({
          error:
            'You do not have permission to use this Login page. Only registered and invited users can use this Login page.',
        });
        return;
      }

      // if user exists - then no error, call next and exit function early
      // functions in JS always return (undefined by default)
      next();
      return;
    }

    // if Registration event, no checks are needed
    next();
  }

  server.post(
    '/auth/send-token',
    [
      checkUser,
      passwordless.requestToken(async (email, _, callback, req) => {
        let teamId;

        if (req.get('x-async-t') === 'null' || req.get('x-async-t') === null) {
          teamId = null;
        } else {
          teamId = req.get('x-async-t');
        }

        const { isLoginEvent } = req.body;
        // logger.info('/auth/send-token, passwordless.requestToken, email: ' + req.body.user);
        // logger.info('/auth/send-token: ' + teamId + typeof teamId);

        // teamId is only truthy for invitation event
        try {
          const uid = await mongoStore.storeOrUpdateByEmail(email, isLoginEvent, teamId);
          callback(null, uid);
        } catch (error) {
          callback(error);
        }
      }),
    ],
    async (_, res) => {
      res.json({ done: 1 });
    },
  );

  // if user is logged-in and loads /login?teamId=...
  // user gets logged-out
  // then user gets redirected to /login?teamId=...
  server.get('/logout', passwordless.logout(), (req, res) => {
    const { teamId } = req.query;

    if (teamId) {
      res.redirect(`${URL_APP}/login?teamId=${teamId}`);
    } else {
      res.redirect(`${URL_APP}/login`);
    }
  });
}

export { setupPasswordless };
