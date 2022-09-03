import * as express from 'express';

import User from '../models/User';

// import logger from '../logs';
import { createSession } from '../stripe';
import { teamDeleted } from '../sockets';

const router = express.Router();

// edit middleware
router.use(async (req: any, res, next) => {
  if (!req.user) {
    res.status(201).json({ error: 'You are logged out. Please log in or register or sign up.' });
    return;
  }

  let teamId;

  if (req.get('x-async-t') === 'null' || req.get('x-async-t') === null) {
    teamId = null;
  } else {
    teamId = req.get('x-async-t');
  }

  let teamLeader;
  let team;

  if (teamId && teamId !== 'new-team') {
    teamLeader = await User.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    if (!teamLeader) {
      res.status(401).json({ error: 'Unauthorized: Team Leader 1' });
      return;
    }

    if (teamLeader._id.toString() !== req.user.id) {
      res.status(401).json({ error: 'Unauthorized: Team Leader 2' });
      return;
    }

    req.teamLeader = teamLeader;
    req.team = team;
  }

  next();
});

router.post('/user/create-or-update-team', async (req: any, res, next) => {
  try {
    const { teamName, teamLogoUrl } = req.body;

    const teamIdFromHeader = req.get('x-async-t');

    const team = await User.createOrUpdateTeam({
      teamId: teamIdFromHeader,
      userId: req.user.id,
      teamName,
      teamLogoUrl,
    });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

router.post('/user/invite-member', async (req: any, res, next) => {
  try {
    const { emailOfInvitee } = req.body;

    const invitedUser = await User.createOrUpdateInvitedUserAndAddToTeam({
      emailOfInvitee,
      teamId: req.team.teamId,
      userId: req.user.id,
    });

    res.json({ invitedUser });
  } catch (err) {
    next(err);
  }
});

router.post('/user/revoke-invitation', async (req: any, res, next) => {
  const { revokedInvitationEmail } = req.body;

  try {
    const userId = await User.revokeInvitation({
      revokedInvitationEmail,
      teamId: req.team.teamId,
    });

    res.json({ userId });
  } catch (err) {
    next(err);
  }
});

router.post('/user/remove-team-member', async (req: any, res, next) => {
  const { removedUserEmail } = req.body;

  try {
    const removedTeamMember = await User.removeTeamMember({
      removedUserEmail,
      teamId: req.team.teamId,
    });

    res.json({ removedTeamMember });
  } catch (err) {
    next(err);
  }
});

// test
router.post('/user/stripe/fetch-checkout-session', async (req: any, res, next) => {
  const { mode } = req.body;

  // mode is either subscription or setup

  try {
    const teamLeader = await User.findById(req.user.id)
      .select(['stripeCustomer', 'email', 'numberOfUniqueActiveTeamMembers'])
      .setOptions({ lean: true });

    const session = await createSession({
      email: teamLeader.email,
      customerId: (teamLeader.stripeCustomer && teamLeader.stripeCustomer.id) || undefined,
      mode,
      quantity: teamLeader.numberOfUniqueActiveTeamMembers,
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

// test
router.get('/user/stripe/get-list-of-invoices-for-account', async (req: any, res, next) => {
  try {
    const stripeListOfInvoices = await User.getListOfInvoicesForAccount({
      userId: req.user.id,
    });

    res.json({ stripeListOfInvoices: stripeListOfInvoices || null });
  } catch (err) {
    next(err);
  }
});

// test
router.post('/user/stripe/cancel-subscription-for-account', async (req: any, res, next) => {
  try {
    const teamLeader = await User.cancelSubscriptionForAccount({
      userId: req.user.id,
    });

    res.json({
      isSubscriptionActiveForTeam: teamLeader.isSubscriptionActiveForAccount,
      stripeSubscription: teamLeader.stripeSubscription,
    });
  } catch (err) {
    next(err);
  }
});

// test
router.post('/user/stripe/re-subscribe-account', async (req: any, res, next) => {
  try {
    const teamLeader = await User.reSubscribeToPaidPlan({
      userId: req.user.id,
    });

    res.json({
      isSubscriptionActiveForTeam: teamLeader.isSubscriptionActiveForAccount,
      stripeSubscription: teamLeader.stripeSubscription,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/user/delete-team', async (req: any, res, next) => {
  try {
    const { socketId } = req.body;

    await User.deleteTeam({ userId: req.user.id, teamId: req.team.teamId });

    // remove deleted team from other connected browsers
    teamDeleted({ socketId, teamId: req.team.teamId, userId: req.user.id });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

export default router;
