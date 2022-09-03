import sendEmail from './api/aws-ses';
import getEmailTemplate, { EmailTemplate } from './api/models/EmailTemplate';
import User from './api/models/User';

// we could have placed it to `api` server but `api` server may get blocked since this is frequently used API
// could be placed to `private-api` server but will be unreliable to detect inactive user
// updateLastActiveDate requires API Gateway to run

// use following logic
// public static async renewLastActiveDate(userId: string) {
//   const user = await this.findOne({ userId }).setOptions({ lean: true });

//   if (user) {
//     this.updateOne(
//       { _id: user._id },
//       { $set: { lastActiveDate: new Date(), isFirstDeletionWarningEmailSent: false } },
//     ).catch((err) => logger.error(err));
//   }
// }

async function checkCardExpiration(productionUrl: string) {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();

  const expiringUsers = await User.find({
    'stripeCard.exp_month': thisMonth,
    'stripeCard.exp_year': thisYear,
  })
    .select(['emailAtApi', 'stripeCard'])
    .setOptions({ lean: true });

  const expiredUsers = await User.find({
    $or: [
      { 'stripeCard.exp_year': { $lt: thisYear } },
      {
        'stripeCard.exp_month': { $lt: thisMonth },
        'stripeCard.exp_year': thisYear,
      },
    ],
  })
    .select(['emailAtApi', 'stripeCard'])
    .setOptions({ lean: true });

  const expiringEmailTemplate = await EmailTemplate.findOne({
    name: 'cardExpirationEmail',
  }).setOptions({
    lean: true,
  });

  const expiredEmailTemplate = await EmailTemplate.findOne({
    name: 'cardExpiredEmail',
  }).setOptions({
    lean: true,
  });

  await Promise.all(
    expiringUsers.map(async (user) => {
      try {
        const template = await getEmailTemplate(
          'cardExpirationEmail',
          {
            userEmail: user.emailAtApi, // get from `private-api` or remove
            billingUrl: `${productionUrl}/settings/billing`,
          },
          expiringEmailTemplate,
        );

        await sendEmail({
          from: `From async-await.com <${process.env.EMAIL_ADDRESS_FOR_SES}>`,
          to: [user.emailAtApi],
          subject: template.subject,
          body: template.message,
        });
      } catch (error) {
        console.error(error.stack);
      }
    }),
  );

  await Promise.all(
    expiredUsers.map(async (user) => {
      try {
        const template = await getEmailTemplate(
          'cardExpiredEmail',
          {
            userEmail: user.emailAtApi, // get from `private-api` or remove
            billingUrl: `${productionUrl}/settings/billing`,
          },
          expiredEmailTemplate,
        );

        await sendEmail({
          from: `From async-await.com <${process.env.EMAIL_ADDRESS_FOR_SES}>`,
          to: [user.emailAtApi],
          subject: template.subject,
          body: template.message,
        });
      } catch (error) {
        console.error(error.stack);
      }
    }),
  );
}

export { checkCardExpiration };
