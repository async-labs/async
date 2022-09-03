import * as _ from 'lodash';
import * as mongoose from 'mongoose';

// import logger from '../logs';

interface IEmailTemplateDocument extends mongoose.Document {
  name: string;
  subject: string;
  message: string;
}

const EmailTemplate = mongoose.model<IEmailTemplateDocument>(
  'EmailTemplate',
  new mongoose.Schema({
    name: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  }),
);

// EmailTemplate.collection
//   .createIndexes([
//     {
//       key: { name: 1 },
//       unique: true,
//       partialFilterExpression: { name: { $exists: true } },
//     },
//   ])
//   .catch((err) => {
//     logger.error(`Invitation.createIndex: ${err.stack}`);
//   });

// EmailTemplate.ensureIndexes((err) => {
//   if (err) {
//     logger.error(`EmailTemplate.ensureIndexes: ${err.stack}`);
//   }
// });

// fix up

async function insertTemplates() {
  const templates = [
    // {
    //   name: 'emailTest',
    //   subject: '[Async] <%= subject %>',
    //   message: `
    //     <p><%= message %></p><p>You tested API endpoint: <%= apiEndpoint %></p>`,
    // },
    {
      name: 'to-be-registered',
      subject: '[Async] To complete registration',
      message: `
        <p>To complete registration at Async, click this login link: <a href="<%= loginUrl %>"><%= loginUrl %></a></p>`,
    },
    {
      name: 'successfully-registered',
      subject: '[Async] Successful registration',
      message: `Hello <%= emailAddress %>,
        <p>
          Thank you registering on Async!
        </p>
        <p>
          We built Async to help small teams like yours to communicate asynchronously and synchronously.
        </p>
        <p>
          IMPORTANT: Your 30-day free trial period has started. You have access to all features of Async and, as a Team Leader, you can invite any number of team members.
        </p>
        <p>
          If you have feedback or suggestions, please send us an email at team@async-await.com. We, actual developers and owners of Async, will read your email.
        </p>
        Kelly and Timur, creators and maintainers of Async
      `,
    },
    {
      name: 'successfully-accepted-invitation',
      subject: '[Async] You joined team',
      message: `Hello <%= emailAddress %>,
        <p>
          You have successfully become a Team Member of the team owned by <%= teamLeaderEmail %>.
        </p>
      `,
    },
    {
      name: 'login',
      subject: '[Async] Login link',
      message: `
        <p>Log into your Async account by clicking this login link:</p> <p><a href="<%= loginUrl %>"><%= loginUrl %></a></p>
        <p>
          This login link may not work if you send it via messenger service that prefetches or previews links. If you need to send a login link, we recommend forwarding email, then copying and pasting the login link directly into a browser.
        </p>`,
    },
    {
      name: 'invitation',
      subject: '[Async] You are invited to join a team owned by <%= teamLeaderEmail %>',
      message: `Team Leader (<%= teamLeaderEmail %>) has invited you to join "<%= teamName %>" team at Async.
            <p>Click on this invitation link:</p> <p><a href="<%= loginPageUrl %>"><%= loginPageUrl %></a></p>
            <p>If you are on your smartphone, copy and paste the above invitation link to your favorite mobile browser.</p>
            <p>To accept the invitation, log in or sign up on the loaded page.</p>
          `,
    },
    {
      name: 'revoked-invitation',
      subject: '[Async] Invitation to join team has been revoked as Async',
      message: `Team Leader (<%= teamLeaderEmail %>) has revoked invitation from <%= revokedInvitationEmail %> to join "<%= teamName %>" team at Async.`,
    },
    {
      name: 'removed-member',
      subject: '[Async] Team member has been removed from team at Async',
      message: `Team Leader (<%= teamLeaderEmail %>) has removed <%= removedUserEmail %> from "<%= teamName %>" team at Async.`,
    },
  ];

  for (const t of templates) {
    const et = await EmailTemplate.findOne({ name: t.name });
    const message = t.message.replace(/\n/g, '').replace(/[ ]+/g, ' ').trim();

    if (!et) {
      EmailTemplate.create(Object.assign({}, t, { message }));
    } else if (et.subject !== t.subject || et.message !== message) {
      EmailTemplate.updateOne({ _id: et._id }, { $set: { message, subject: t.subject } }).exec();
    }
  }
}

// insertTemplates();

export default async function getEmailTemplate(
  name: string,
  params: any,
  template?: IEmailTemplateDocument,
) {
  const source = template || (await EmailTemplate.findOne({ name }).setOptions({ lean: true }));

  if (!source) {
    throw new Error('Email Template is not found.');
  }

  return {
    message: _.template(source.message)(params),
    subject: _.template(source.subject)(params),
  };
}

// no need for index, collection is small

export { EmailTemplate, IEmailTemplateDocument, insertTemplates };
