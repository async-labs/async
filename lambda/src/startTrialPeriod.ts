import sendEmail from './api/aws-ses';
import getEmailTemplate, { EmailTemplate } from './api/models/EmailTemplate';
import User from './api/models/User';

// getEmailTemplate startTrialPeriodEmail
// we could have placed it to `api` server but `api` server has no demo data
// startTrialPeriodEmail requires API Gateway to run


// combine startTrialPeriod and isTrialPeriodOver functions into one function
// https://stackoverflow.com/questions/41425511/aws-api-gateway-lambda-multiple-endpoint-functions-vs-single-endpoint

// secure API Gateway using AWS WAF https://aws.amazon.com/blogs/compute/protecting-your-api-using-amazon-api-gateway-and-aws-waf-part-2/

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
            username: user.userName, // get from `private-api` or remove
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
            username: user.userName, // get from `private-api` or remove
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
