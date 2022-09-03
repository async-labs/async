import * as express from 'express';
// import logger from '../logs';

import User from '../models/User';

const router = express.Router();

router.get('/get-user', (req: any, res) => {
  // logger.info('/get-user ' + req.user.email);
  // logger.info(req.user);
  res.json({ userFromApiServer: req.user || null });
});

// for-invitation-page
router.get('/get-team-data-for-invitation-page', async (req: any, res, next) => {
  let teamId;

  if (req.get('x-async-t') === 'null' || req.get('x-async-t') === null) {
    teamId = null;
  } else {
    teamId = req.get('x-async-t');
  }

  try {
    const { teamName, teamLogoUrl, error } = await User.getTeamData(teamId);

    // logger.info(teamName + teamLogoUrl + error);

    res.json({ teamName, teamLogoUrl, errorFromServer: error });
  } catch (err) {
    next(err);
  }
});

export default router;
