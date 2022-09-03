import * as mongoose from 'mongoose';

import { checkCardExpiration as runCheckCardExpiration } from './src/checkCardExpiration';

// checkTrialPeriodExpiration

// use crypto-js
// verify signature
// function verifySignature({ signature, payload }) {
//   const secret = process.env.API_KEY_FOR_API_GATEWAY;

//   const computedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

//   return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
// }

export const checkCardExpiration = async (event: any) => {
  const dev = process.env.NODE_ENV !== 'production';

  const MONGO_URL = dev ? process.env.MONGO_URL_TEST : process.env.MONGO_URL;

  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useFindAndModify: false });

  try {
    await runCheckCardExpiration(process.env.PRODUCTION_URL_APP);
  } catch (error) {
    console.error(error.stack);

    return { error: error.message, event };
  } finally {
    await mongoose.disconnect();
  }

  if (
    !process.env.ONLY_MONGO_URL &&
    !dev &&
    process.env.MONGO_URL2 &&
    process.env.PRODUCTION_URL_APP2
  ) {
    await mongoose.connect(process.env.MONGO_URL2, {
      useNewUrlParser: true,
      useFindAndModify: false,
    });

    try {
      await runCheckCardExpiration(process.env.PRODUCTION_URL_APP2);
    } catch (error) {
      console.error(error.stack);

      return {
        error: error.message,
        event,
      };
    } finally {
      await mongoose.disconnect();
    }
  }

  return { message: 'Card expiration check run successfully!', event };
};

