import * as moment from 'moment';

import { putObject } from './api/aws-s3';
import sendEmail from './api/aws-ses';
import getEmailTemplate, {
  EmailTemplate,
  IEmailTemplateDocument,
} from './api/models/EmailTemplate';
import Project from './api/models/Project';
import User, { IUserDocument } from './api/models/User';

// no need to send export data

async function sendExportDataAndFirstWarningEmail(
  user: IUserDocument,
  emailTemplate: IEmailTemplateDocument,
) {
  const userData = await User.exportData({ userId: user._id });
  const bucket = process.env.BUCKET_FOR_EXPORTED_USER_DATA;

  const randomStringForPrefix =
    Math.random()
      .toString(36)
      .substring(2, 12) +
    Math.random()
      .toString(36)
      .substring(2, 12);

  const path = `${user.githubUsername}-${randomStringForPrefix}.json`;
  const dataUrl = `https://${bucket}.s3.amazonaws.com/${path}`;

  await putObject({ bucket, path, body: JSON.stringify(userData), acl: 'public-read' });

  const template = await getEmailTemplate(
    'firstDeletionWarningEmail',
    {
      username: user.githubUsername,
      dataUrl,
      loginUrl: `${process.env.PRODUCTION_URL_APP}/login`,
    },
    emailTemplate,
  );

  try {
    await sendEmail({
      from: `From async-await.com <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
      to: [user.email],
      subject: template.subject,
      body: template.message,
    });
  } catch (err) {
    console.error('Email sending error:', err);
  }

  return { exportedDataFilePath: dataUrl };
}

async function sendLastDeletionEmail(user: IUserDocument, emailTemplate: IEmailTemplateDocument) {
  const template = await getEmailTemplate(
    'lastDeletionEmail',
    {
      username: user.githubUsername,
      dataUrl: user.exportedDataFilePath,
    },
    emailTemplate,
  );

  try {
    await sendEmail({
      from: `From async-await.com <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
      to: [user.email],
      subject: template.subject,
      body: template.message,
    });
  } catch (err) {
    console.error('Email sending error:', err);
  }
}

async function checkUserInactivity() {
  const sixtyDaysAgo = moment().subtract(60, 'days');

  const inactiveUsers = await User.find({ lastActiveDate: { $lt: sixtyDaysAgo } }).select([
    'githubUsername',
    'email',
    'lastActiveDate',
    'isFirstDeletionWarningEmailSent',
    'exportedDataFilePath',
  ]);

  const projects = await Project.find({
    ownerUserId: { $in: inactiveUsers.map((u) => u._id) },
  }).select(['ownerUserId']);

  const ownerIds = projects.map((r) => r.ownerUserId);
  const inactiveOwners = inactiveUsers.filter((u) => ownerIds.includes(u._id.toString()));

  const firstEmailTemplate = await EmailTemplate.findOne({
    name: 'firstDeletionWarningEmail',
  }).setOptions({
    lean: true,
  });

  const secondEmailTemplate = await EmailTemplate.findOne({
    name: 'lastDeletionEmail',
  }).setOptions({
    lean: true,
  });

  await Promise.all(
    inactiveOwners.map(async (user) => {
      try {
        if (!user.isFirstDeletionWarningEmailSent) {
          const { exportedDataFilePath } = await sendExportDataAndFirstWarningEmail(
            user,
            firstEmailTemplate,
          );

          await User.findByIdAndUpdate(user._id, {
            exportedDataFilePath,
            isFirstDeletionWarningEmailSent: true,
          });
        } else {
          const sixtySevenDaysAgo = moment().subtract(67, 'days');
          if (moment(user.lastActiveDate).isBefore(sixtySevenDaysAgo)) {
            await sendLastDeletionEmail(user, secondEmailTemplate);
            // mark user for deletion
            // set isMarkedForDeletionDueToInactivity to true
          }
        }
      } catch (error) {
        console.error(error.stack);
      }
    }),
  );
}

export { checkUserInactivity };
