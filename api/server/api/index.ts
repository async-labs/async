import * as CryptoJS from 'crypto-js';
import * as express from 'express';
import logger from '../logs';

import publicApi from './public';
import teamLeaderApi from './team-leader';
import teamMemberApi from './team-member';

function handleError(err, _, res) {
  logger.error(err.stack);

  res.json({ error: err.message || err.toString() });
}

async function verifySignature(signature) {
  if (process.env.ENCRYPTION_KEY.length < 32) {
    throw new Error('Your encryption key must be 32 or more characters');
  }

  // check length at browser as well

  const originalMessage = await CryptoJS.AES.decrypt(
    signature,
    process.env.ENCRYPTION_KEY,
  ).toString(CryptoJS.enc.Utf8);

  return originalMessage === 'api-server';
}

async function checkRequest(req, res, next) {
  const signature = req.get('x-async-signature');

  if (!verifySignature(signature)) {
    res.status(201).json({
      error: 'You do not have permission 2',
    });
    return;
  }

  next();
}

export default function api(server: express.Express) {
  server.use('/api/v1/to-api-server/public', checkRequest, publicApi, handleError);
  server.use('/api/v1/to-api-server/team-leader', checkRequest, teamLeaderApi, handleError);
  server.use('/api/v1/to-api-server/team-member', checkRequest, teamMemberApi, handleError);
}
