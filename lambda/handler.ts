import * as mongoose from 'mongoose';

import { checkCardExpiration as runCheckCardExpiration } from './src/checkCardExpiration';

export const checkCardExpiration = async (event: any) => {
  const dev = process.env.NODE_ENV !== 'production';

  const MONGO_URL = dev ? process.env.MONGO_URL_TEST : process.env.MONGO_URL;

  await mongoose.connect(MONGO_URL);

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
    await mongoose.connect(process.env.MONGO_URL2);

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
