import * as dotenv from 'dotenv';
import * as express from 'express';
import Stripe from 'stripe';

import logger from './logs';
import User from './models/User';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';

const API_KEY = dev ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_LIVE_SECRET_KEY;

const appPort = process.env.APP_PORT || 3000;
const URL_APP = dev ? `http://localhost:${appPort}` : process.env.PRODUCTION_URL_APP;

const apiPort = process.env.API_PORT || 8000;
const URL_API = dev ? `http://localhost:${apiPort}` : process.env.PRODUCTION_API_SERVER_ENDPOINT;

const stripeInstance = new Stripe(API_KEY, { apiVersion: '2022-08-01' });

function createSession({
  email,
  customerId,
  mode,
  quantity,
}: {
  email: string;
  customerId: string;
  mode: Stripe.Checkout.SessionCreateParams.Mode;
  quantity: number;
}) {
  const params: Stripe.Checkout.SessionCreateParams = {
    customer_email: customerId ? undefined : email,
    customer: customerId,
    payment_method_types: ['card'],
    mode,
    success_url: `${URL_API}/stripe/checkout-completed/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${URL_APP}/settings/my-billing?message=You%20did%20not%20complete%20payment%20at%20the%20Stripe%20Checkout%20page%2E`,
    metadata: { email },
  };

  const price_per_seat = dev ? process.env.STRIPE_TEST_PRICE_ID : process.env.STRIPE_LIVE_PRICE_ID;

  if (mode === 'subscription') {
    params.line_items = [{ price: price_per_seat, quantity }];
  } else if (mode === 'setup') {
    if (!customerId) {
      // logger.info('customerId is required');
      throw new Error('customerId is required');
    }

    params.setup_intent_data = {
      metadata: { customer_id: customerId },
    };
  }

  return stripeInstance.checkout.sessions.create(params);
}

function retrieveSession({ sessionId }: { sessionId: string }) {
  return stripeInstance.checkout.sessions.retrieve(sessionId, {
    expand: ['setup_intent', 'setup_intent.payment_method'],
  });
}

// review below methods
// add teamId
function cancelSubscription({ subscriptionId }) {
  logger.debug('cancel subscription', subscriptionId);
  return stripeInstance.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

function reSubscribe({ subscriptionId }) {
  logger.debug('re subscribe', subscriptionId);
  return stripeInstance.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}

function retrieveSubscription(subscriptionId: string) {
  logger.debug('retrieve subscription', subscriptionId);
  return stripeInstance.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'customer'],
  });
}

function updateCustomer(customerId: string, params: Stripe.CustomerUpdateParams) {
  logger.debug('updating customer' + customerId + params);
  return stripeInstance.customers.update(customerId, params);
}

// use it to update quantity
function updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams) {
  logger.debug('updating subscription' + subscriptionId + params);
  return stripeInstance.subscriptions.update(subscriptionId, params);
}

function getListOfInvoicesFromStripe({ customerId, subscriptionId }) {
  logger.debug('getting list of invoices for customer' + customerId + subscriptionId);
  return stripeInstance.invoices.list({
    customer: customerId,
    subscription: subscriptionId,
    status: 'paid',
    limit: 100,
  });
}

function verifyWebHook(request) {
  const endpointSecret = process.env.STRIPE_LIVE_ENDPOINT_SECRET;

  const event: any = stripeInstance.webhooks.constructEvent(
    request.body,
    request.headers['stripe-signature'],
    endpointSecret,
  );

  return event;
}

// can be tested in production only
// express.raw usage: https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/node-express/express.js
function stripeWebHookAndCheckoutCallback({ server }) {
  server.post(
    '/api/v1/public/stripe-invoice-payment-failed',
    express.raw({ type: 'application/json' }),
    async (req, res, next) => {
      // logger.info('express route is called');

      try {
        const event = await verifyWebHook(req);
        // logger.info(`${event.id}, ${event.type}`);

        if (event.type === 'invoice.payment_failed') {
          const { subscription } = event.data.object;
          // logger.info(JSON.stringify(subscription));

          // define
          await User.cancelSubscriptionForAccountAfterFailedPayment({
            subscriptionId: JSON.stringify(subscription),
          });
        }

        res.sendStatus(200);
      } catch (err) {
        next(err);
      }
    },
  );

  server.get('/stripe/checkout-completed/:sessionId', async (req: any, res) => {
    const { sessionId } = req.params;

    const session = await retrieveSession({ sessionId });

    if (!session || !session.metadata) {
      throw new Error('Wrong session.');
    }

    const email = session.metadata.email;

    try {
      const teamLeader = await User.findOne({ email }).setOptions({
        lean: true,
      });

      if (!teamLeader) {
        throw new Error('Team Leader not found.');
      }

      if (session.mode === 'setup' && session.setup_intent) {
        await User.changeStripeCard({ session, teamLeader });
        res.redirect(
          `${URL_APP}/settings/my-account?message=You%20successfully%20updated%20card%21`,
        );
      } else if (session.mode === 'subscription') {
        await User.subscribeToPaidPlan({ session, teamLeader });
        res.redirect(
          `${URL_APP}/settings/my-billing?message=You%20successfully%20subscribed%20team%21`,
        );
      } else {
        throw new Error('Wrong session.');
      }
    } catch (err) {
      console.error(err);
      if (session.mode === 'setup' && session.setup_intent) {
        res.redirect(`${URL_APP}/settings/my-account?message=${err.message || err.toString()}`);
      } else if (session.mode === 'subscription') {
        res.redirect(`${URL_APP}/settings/my-billing?message=${err.message || err.toString()}`);
      }
    }
  });
}

export {
  createSession,
  retrieveSession,
  stripeWebHookAndCheckoutCallback,
  cancelSubscription,
  reSubscribe,
  retrieveSubscription,
  updateCustomer,
  updateSubscription,
  getListOfInvoicesFromStripe,
};
