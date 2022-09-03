import * as _ from 'lodash';
import * as dotenv from 'dotenv';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import Stripe from 'stripe';

import logger from '../logs';
import sendEmail from '../aws-ses';
import {
  reSubscribe,
  cancelSubscription,
  getListOfInvoicesFromStripe,
  retrieveSubscription,
  updateSubscription,
  updateCustomer,
} from '../stripe';

import getEmailTemplate from './EmailTemplate';

import Discussion from './Discussion';
import Comment from './Comment';

import Chat from './Chat';
import Message from './Message';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const URL_APP = dev ? process.env.URL_APP : process.env.PRODUCTION_URL_APP;

// keep trialPeriodStartDate, isSubscriptionActiveForTeam, isPaymentFailedForTeam
// inside teamsForTeamMember

const mongoSchema = new mongoose.Schema({
  // for TL
  teamsForTeamLeader: {
    type: [
      {
        teamLeaderEmail: String,
        initialMembers: [],
        teamId: { type: String, index: true },
        createdAt: Date,
        teamName: String,
        teamLogoUrl: String,
        status: String,
        idsOfTeamMembers: [String],
        removedTeamMembers: [
          {
            email: String,
            removalDate: Date,
            userName: String,
            userAvatarUrl: String,
            userId: String,
          },
        ],
        trialPeriodStartDate: Date,
        isSubscriptionActiveForTeam: { type: Boolean },
        isPaymentFailedForTeam: { type: Boolean },
      },
    ],
    // validate: (v) => Array.isArray(v) && v.length > 0,
    // default: undefined, // all Array fields get added as empty arrays to MongoDB doc unless default is set to undefined
  },
  // for TL
  stripeCustomer: {
    id: String,
    object: String,
    created: Number,
    currency: String,
    default_source: String,
    description: String,
  },
  stripeCard: {
    brand: String,
    funding: String,
    country: String,
    last4: String,
    exp_month: Number,
    exp_year: Number,
  },
  hasCardInformation: { type: Boolean, default: false },
  // for TM
  teamsForTeamMember: {
    type: [
      {
        teamLeaderEmail: String,
        initialMembers: [],
        teamId: String,
        joinedAt: Date,
        teamName: String,
        teamLogoUrl: String,
        status: String,
        trialPeriodStartDate: Date,
        isSubscriptionActiveForTeam: { type: Boolean },
        isPaymentFailedForTeam: { type: Boolean },
        removedTeamMembers: [
          {
            email: String,
            removalDate: Date,
            userName: String,
            userAvatarUrl: String,
            userId: String,
          },
        ],
      },
    ],
  },

  // both TL and TM
  defaultTeamId: { type: String },

  // both TL and TM
  email: { type: String, required: true, index: true },
  accountCreationDate: { type: Date, required: true },
  userName: String,
  userAvatarUrl: String,
  showDarkTheme: Boolean,

  onlineStatusByTeam: {
    type: [
      {
        teamId: String,
        status: Boolean,
      },
    ],
  },

  pinnedDiscussionIds: [{ type: String }],
  pinnedChatIds: [{ type: String }],

  unreadCommentIds: [{ type: String }],
  unreadByUserMessageIds: [{ type: String }],
  unreadBySomeoneMessageIds: [{ type: String }],

  numberOfUniqueActiveTeamMembers: { type: Number },

  trialPeriodStartDate: Date,

  isSubscriptionActiveForAccount: { type: Boolean, default: false },
  isPaymentFailedForAccount: { type: Boolean, default: false },
  stripeSubscription: {
    id: String,
    object: String,
    application_fee_percent: Number,
    billing: String,
    billing_cycle_anchor: Number,
    created: Number,
    cancel_at_period_end: Boolean,
    canceled_at: Number,
    cancel_at: Number,
  },
  stripeListOfInvoices: {
    object: String,
    has_more: Boolean,
    data: [
      {
        id: String,
        object: String,
        amount_paid: Number,
        created: Number,
        customer: String,
        subscription: String,
        hosted_invoice_url: String,
        status: String,
        paid: Boolean,
        number: String,
        period_end: Number,
        period_start: Number,
      },
    ],
  },
});

export interface IUserDocument extends mongoose.Document {
  // for TL
  teamsForTeamLeader: [
    {
      teamLeaderEmail: string;
      initialMembers: [];
      teamId: string;
      createdAt: Date;
      teamName: string;
      teamLogoUrl: string;
      status: string;
      idsOfTeamMembers: [string];
      removedTeamMembers: [
        {
          email: string;
          removalDate: Date;
          userName: string;
          userAvatarUrl: string;
          userId: string;
        },
      ];
      trialPeriodStartDate: Date;
      isSubscriptionActiveForTeam: boolean;
      isPaymentFailedForTeam: boolean;
    },
  ];
  // for TL
  numberOfUniqueActiveTeamMembers: number;
  stripeCustomer: {
    id: string;
    default_source: string;
    created: number;
    object: string;
    description: string;
  };
  stripeCard: {
    brand: string;
    country: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  };
  trialPeriodStartDate: Date;
  isSubscriptionActiveForAccount: boolean;
  isPaymentFailedForAccount: boolean;
  stripeSubscription: {
    id: string;
    object: string;
    application_fee_percent: number;
    billing: string;
    cancel_at_period_end: boolean;
    billing_cycle_anchor: number;
    canceled_at: number;
    cancel_at: number;
    created: number;
  };
  stripeListOfInvoices: {
    object: string;
    has_more: boolean;
    data: Array<{
      id: string;
      object: string;
      amount_paid: number;
      created: number;
      customer: string;
      subscription: string;
      hosted_invoice_url: string;
      status: string;
      paid: boolean;
      number: string;
      period_end: number;
      period_start: number;
    }>;
  };
  // for TM
  teamsForTeamMember: [
    {
      teamLeaderEmail: string;
      initialMembers: [];
      teamId: string;
      joinedAt: Date;
      teamName: string;
      teamLogoUrl: string;
      status: string;
      trialPeriodStartDate: Date;
      isSubscriptionActiveForTeam: boolean;
      isPaymentFailedForTeam: boolean;
      removedTeamMembers: [
        {
          email: string;
          removalDate: Date;
          userName: string;
          userAvatarUrl: string;
          userId: string;
        },
      ];
    },
  ];

  defaultTeamId: string;

  // Team Leader and Team Member
  email: string;
  accountCreationDate: Date;
  userName: string;
  userAvatarUrl: string;
  showDarkTheme: boolean;

  onlineStatusByTeam: [{ teamId: string; status: boolean }];

  pinnedDiscussionIds: string[];
  pinnedChatIds: string[];

  unreadCommentIds: string[];
  unreadByUserMessageIds: string[];
  unreadBySomeoneMessageIds: string[];
}

interface IUserModel extends mongoose.Model<IUserDocument> {
  publicFields(): string[];

  registerOrLogIn({
    uid,
    email,
    isLoginEvent,
    teamId,
  }: {
    uid: string;
    email: string;
    isLoginEvent: boolean;
    teamId?: string;
  }): Promise<IUserDocument>;

  updateUserProfile({
    email,
    userName,
    userAvatarUrl,
  }: {
    email: string;
    userName: string;
    userAvatarUrl: string;
  }): Promise<void>;

  createOrUpdateTeam({
    teamId,
    userId,
    teamName,
    teamLogoUrl,
  }: {
    teamId?: string;
    userId?: string;
    teamName: string;
    teamLogoUrl: string;
  }): Promise<any>;

  getTeamData(teamId: string): Promise<{ teamName: string; teamLogoUrl: string; error: string }>;

  getSubscriptionStatus(userId: string): Promise<{
    isSubscriptionActiveForAccount: boolean;
    isPaymentFailedForAccount: boolean;
    isTrialPeriodOverForAccount: boolean;
  }>;

  createOrUpdateInvitedUserAndAddToTeam({
    emailOfInvitee,
    teamId,
    userId,
  }: {
    emailOfInvitee: string;
    teamId: string;
    userId: string;
  }): Promise<IUserDocument>;

  revokeInvitation({
    revokedInvitationEmail,
    teamId,
  }: {
    revokedInvitationEmail: string;
    teamId: string;
  }): Promise<string>;

  removeTeamMember({
    removedUserEmail,
    teamId,
  }: {
    removedUserEmail: string;
    teamId: string;
  }): Promise<{
    email: string;
    removalDate: Date;
    userName: string;
    userAvatarUrl: string;
    userId: string;
  }>;

  // subscriptions

  getListOfInvoicesForAccount({ userId }: { userId: string }): Promise<any>;
  subscribeToPaidPlan({
    session,
    teamLeader,
  }: {
    session: Stripe.Checkout.Session;
    teamLeader: IUserDocument;
  }): Promise<void>;
  changeStripeCard({
    session,
    teamLeader,
  }: {
    session: Stripe.Checkout.Session;
    teamLeader: IUserDocument;
  }): Promise<void>;
  cancelSubscriptionForAccount({ userId }: { userId: string }): Promise<IUserDocument>;
  reSubscribeToPaidPlan({ userId }: { userId: string }): Promise<IUserDocument>;
  cancelSubscriptionForAccountAfterFailedPayment({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<IUserDocument>;

  toggleTheme({ userId, showDarkTheme }: { userId: string; showDarkTheme: boolean }): Promise<void>;

  pinDiscussion({ userId, discussionId }: { userId: string; discussionId: string }): Promise<void>;
  unpinDiscussion({
    userId,
    discussionId,
  }: {
    userId: string;
    discussionId: string;
  }): Promise<void>;

  readComment({ userId, commentId }: { userId: string; commentId: string }): Promise<void>;
  unreadComment({ userId, commentId }: { userId: string; commentId: string }): Promise<void>;

  markCommentAsUnreadForParticipantsOfDiscussionAfterCommentIsAdded({
    userIdsToNotify,
    commentId,
  }: {
    userIdsToNotify: string[];
    commentId: string;
  }): Promise<void>;

  markCommentAsReadForParticipantsOfDiscussionAfterCommentIsDeleted({
    userIdsToNotify,
    commentId,
  }: {
    userIdsToNotify: string[];
    commentId: string;
  }): Promise<void>;

  pinChat({ userId, chatId }: { userId: string; chatId: string }): Promise<void>;
  unpinChat({ userId, chatId }: { userId: string; chatId: string }): Promise<void>;

  messagesWereSeen({
    userId,
    messageIds,
  }: {
    userId: string;
    messageIds: string[];
  }): Promise<[{ userId: string; messageId: string }]>;

  markMessageAsUnreadForParticipantsOfChatAfterMessageIsAddedByUser({
    userIdsToNotify,
    messageId,
  }: {
    userIdsToNotify: string[];
    messageId: string;
  }): Promise<void>;

  markMessageAsReadForParticipantsOfChatAfterMessageIsDeletedByUser({
    userIdsToNotify,
    messageId,
  }: {
    userIdsToNotify: string[];
    messageId: string;
  }): Promise<void>;

  changeOnlineStatusForTeam({
    userId,
    status,
    teamId,
  }: {
    userId: string;
    status: boolean;
    teamId: string;
  }): Promise<void>;

  deleteTeam({ teamId, userId }: { teamId: string; userId: string }): Promise<void>;
}

class UserClass extends mongoose.Model {
  // review if you need this method at private-api
  public static publicFields(): string[] {
    return [
      '_id',
      'id',
      'email',
      'accountCreationDate',
      'userName',
      'userAvatarUrl',
      'showDarkTheme',

      'onlineStatusByTeam',

      'teamsForTeamLeader',
      'teamsForTeamMember',
      'defaultTeamId',

      'stripeCard',
      'stripeCustomer',

      'pinnedDiscussionIds',
      'pinnedChatIds',

      'unreadCommentIds',
      'unreadByUserMessageIds',
      'unreadBySomeoneMessageIds',

      'trialPeriodStartDate',
      'isSubscriptionActiveForAccount',
      'isPaymentFailedForAccount',
      'stripeSubscription',
      'stripeListOfInvoices',
      'numberOfUniqueActiveTeamMembers',
    ];
  }

  public static async registerOrLogIn({ uid, email, isLoginEvent, teamId }) {
    const user = await this.findOne({ email }).setOptions({ lean: true });

    let template;

    if (user && isLoginEvent) {
      if (!teamId) {
        return user;
      }

      // teamId is truthy means this is an invitation event
      // teamId is truthy means user has teamsForTeamMember

      const team = user.teamsForTeamMember.find((team) => {
        return team.teamId === teamId;
      });

      let updatedUser = user;

      if (team && team.status === 'invited') {
        // tested
        updatedUser = await this.findOneAndUpdate(
          { email, 'teamsForTeamMember.teamId': teamId },
          {
            $set: {
              'teamsForTeamMember.$.status': 'team-member',
              'teamsForTeamMember.$.joinedAt': new Date(),
              'teamsForTeamMember.$.trialPeriodStartDate': team.trialPeriodStartDate,
              'teamsForTeamMember.$.isSubscriptionActiveForTeam': team.isSubscriptionActiveForTeam,
              'teamsForTeamMember.$.isPaymentFailedForTeam': team.isPaymentFailedForTeam,
            },
            defaultTeamId: !user.defaultTeamId ? teamId : user.defaultTeamId,
          },
          { runValidators: true, new: true },
        ).setOptions({ lean: true });

        const teamLeader = await this.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
          lean: true,
        });

        // update numberOfUniqueActiveTeamMembers
        const updatedTeamLeader = await this.findOneAndUpdate(
          { 'teamsForTeamLeader.teamId': teamId },
          {
            $inc: {
              numberOfUniqueActiveTeamMembers: 1,
            },
          },
          { runValidators: true, new: true },
        );

        const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
          await this.getSubscriptionStatus(teamLeader._id.toString());

        if (isTrialPeriodOverForAccount && !isSubscriptionActiveForAccount) {
          throw new Error(
            'Associated account is not subscribed to a paid plan or free trial period is over.',
          );
        }

        if (isSubscriptionActiveForAccount) {
          const subscription = await retrieveSubscription(teamLeader.stripeSubscription.id);

          await updateSubscription(teamLeader.stripeSubscription.id, {
            items: [
              {
                id: subscription.items.data[0].id,
                quantity: updatedTeamLeader.numberOfUniqueActiveTeamMembers,
              },
            ],
          });
        }

        template = await getEmailTemplate('successfully-accepted-invitation', {
          emailAddress: email,
          teamLeaderEmail: teamLeader.email,
        });

        try {
          await sendEmail({
            from: `From <${process.env.FROM_EMAIL_ADDRESS}>`,
            to: [email],
            subject: template.subject,
            body: template.message,
          });
        } catch (err) {
          logger.error('Email sending error:', err);
        }
      }

      return updatedUser;
    }

    // logger.info('user does not exist, this is registration event: ' + email);

    // 32 characters
    const generatedTeamId =
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10);

    const newUser = await this.create({
      _id: uid,
      accountCreationDate: new Date(),
      email,
      showDarkTheme: true,
      userName: '',
      userAvatarUrl: '',

      defaultTeamId: generatedTeamId,

      numberOfUniqueActiveTeamMembers: 1,
      trialPeriodStartDate: new Date(),
      isSubscriptionActiveForAccount: false,
      isPaymentFailedForAccount: false,

      teamsForTeamLeader: [
        {
          teamId: generatedTeamId,
          createdAt: new Date(),
          teamName: '',
          teamLogoUrl: '',
          status: 'team-leader',
          idsOfTeamMembers: [],
          customerId: '',
          subscriptionId: '',
          invoices: [],
          initialMembers: [],
          teamLeaderEmail: email,
        },
      ],
      onlineStatusByTeam: [{ teamId: generatedTeamId, status: false }],
    });

    if (!isLoginEvent) {
      template = await getEmailTemplate('successfully-registered', {
        emailAddress: email,
      });
    }

    try {
      await sendEmail({
        from: `From <${process.env.FROM_EMAIL_ADDRESS}>`,
        to: [email],
        subject: template.subject,
        body: template.message,
      });
    } catch (err) {
      logger.error('Email sending error:', err);
    }

    return _.pick(newUser, this.publicFields());
  }

  // retire checkPermission
  // because you have middleware for Team Leader and Team Member

  // only Team Leader can use it
  // test
  public static async createOrUpdateTeam({ teamId, userId, teamName, teamLogoUrl }) {
    if (!teamName) {
      throw new Error('Bad data');
    }

    if (teamId && teamId !== 'new-team') {
      // update Team Leader's teamsForTeamLeader
      await this.updateOne(
        { 'teamsForTeamLeader.teamId': teamId },
        {
          $set: {
            'teamsForTeamLeader.$.teamName': teamName,
            'teamsForTeamLeader.$.teamLogoUrl': teamLogoUrl,
          },
        },
        { runValidators: true },
      );

      // update all Team Members's teamsForTeamMember
      await this.updateMany(
        { 'teamsForTeamMember.teamId': teamId },
        {
          $set: {
            'teamsForTeamMember.$.teamName': teamName,
            'teamsForTeamMember.$.teamLogoUrl': teamLogoUrl,
          },
        },
        { runValidators: true },
      );

      return;
    } else {
      const generatedTeamId =
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10);

      const teamLeader = await this.findById(userId).setOptions({
        lean: true,
      });

      const updateTeamLeader = await this.findOneAndUpdate(
        { _id: userId },
        {
          $push: {
            teamsForTeamLeader: {
              teamId: generatedTeamId,
              createdAt: new Date(),
              teamName,
              teamLogoUrl,
              status: 'team-leader',
              idsOfTeamMembers: [],
              customerId: '',
              subscriptionId: '',
              invoices: [],
              initialMembers: [],
              teamLeaderEmail: teamLeader.email,
            },
          },
        },
        { runValidators: true, new: true },
      );

      const team = updateTeamLeader.teamsForTeamLeader.find((team) => {
        return team.teamId === generatedTeamId;
      });

      return team;
    }
  }

  // both Team Leader and Team Member can use it
  // test
  public static async updateUserProfile({ email, userName, userAvatarUrl }) {
    if (!email) {
      throw new Error('Bad data');
    }

    // logger.info(email);

    await this.updateOne({ email }, { userName, userAvatarUrl }, { runValidators: true });
  }

  // test
  // public API, make checks
  public static async getTeamData(teamId) {
    const teamLeader = await this.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    if (!teamLeader) {
      return { error: 'no-team', teamName: '', teamLogoUrl: '' };
    }

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    return { teamName: team.teamName, teamLogoUrl: team.teamLogoUrl, error: '' };
  }

  // test
  public static async getSubscriptionStatus(userId) {
    if (!userId) {
      throw new Error('Bad data');
    }

    const teamLeader = await this.findOne({ _id: userId }).setOptions({
      lean: true,
    });

    if (!teamLeader) {
      throw new Error('Team Leader not found');
    }

    // isSubscriptionActiveForTeam: true or false
    return {
      isSubscriptionActiveForAccount: teamLeader.isSubscriptionActiveForAccount,
      isPaymentFailedForAccount: teamLeader.isPaymentFailedForAccount,
      isTrialPeriodOverForAccount: moment(new Date()).isAfter(
        moment(teamLeader.trialPeriodStartDate).add(30, 'days'),
      ),
    };
  }

  // test
  public static async createOrUpdateInvitedUserAndAddToTeam({ emailOfInvitee, teamId, userId }) {
    if (!emailOfInvitee || !teamId) {
      throw new Error('Bad data');
    }

    const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
      await this.getSubscriptionStatus(userId);

    if (isTrialPeriodOverForAccount && !isSubscriptionActiveForAccount) {
      throw new Error('This team is not subscribed to a paid plan and free trial period is over.');
    }

    const teamLeader = await this.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    const existingUser = await this.findOne({ email: emailOfInvitee }).setOptions({ lean: true });

    let invitedUser;
    if (existingUser) {
      const teamMember = await this.findOne({
        email: emailOfInvitee,
        'teamsForTeamMember.teamId': teamId,
      }).setOptions({
        lean: true,
      });

      const status =
        teamMember && teamMember.teamsForTeamMember.find((t) => t.teamId === teamId).status;

      if (teamMember && status === 'removed') {
        invitedUser = await this.findOneAndUpdate(
          { email: emailOfInvitee, 'teamsForTeamMember.teamId': teamId },
          {
            $set: {
              'teamsForTeamMember.$.status': 'invited',
            },
          },
          { runValidators: true, new: true },
        ).setOptions({ lean: true });
      } else {
        invitedUser = await this.findOneAndUpdate(
          { email: emailOfInvitee },
          {
            $push: {
              teamsForTeamMember: {
                teamId,
                joinedAt: new Date(),
                teamName: team.teamName,
                teamLogoUrl: team.teamLogoUrl,
                status: 'invited',
                trialPeriodStartDate: teamLeader.accountCreationDate,
                isSubscriptionActiveForTeam: teamLeader.isSubscriptionActiveForAccount,
                isPaymentFailedForTeam: teamLeader.isPaymentFailedForAccount,
                initialMembers: [],
                teamLeaderEmail: teamLeader.email,
              },
              onlineStatusByTeam: { teamId, status: false },
            },
          },
          { runValidators: true, new: true },
        ).setOptions({
          lean: true,
        });
      }
    } else {
      invitedUser = await this.create({
        email: emailOfInvitee,
        accountCreationDate: new Date(),
        userName: '',
        userAvatarUrl: '',
        showDarkTheme: true,
        teamsForTeamMember: [
          {
            teamId,
            joinedAt: new Date(),
            teamName: team.teamName,
            teamLogoUrl: team.teamLogoUrl,
            status: 'invited',
            trialPeriodStartDate: teamLeader.accountCreationDate,
            isSubscriptionActiveForTeam: teamLeader.isSubscriptionActiveForAccount,
            isPaymentFailedForTeam: teamLeader.isPaymentFailedForAccount,
            initialMembers: [],
            teamLeaderEmail: teamLeader.email,
          },
        ],
        defaultTeamId: teamId,
        onlineStatusByTeam: [{ teamId, status: false }],
        trialPeriodStartDate: new Date(),
        isSubscriptionActiveForAccount: false,
        isPaymentFailedForAccount: false,
      });
    }

    // logger.info(invitedUser._id.toString());

    // test
    await this.updateOne(
      { 'teamsForTeamLeader.teamId': teamId },
      {
        $push: {
          'teamsForTeamLeader.$.idsOfTeamMembers': invitedUser._id.toString(),
        },
        $pull: { 'teamsForTeamLeader.$.removedTeamMembers': { email: emailOfInvitee } },
      },
    );

    const template = await getEmailTemplate('invitation', {
      teamLeaderEmail: teamLeader.email,
      loginPageUrl: `${URL_APP}/login?teamId=${encodeURIComponent(teamId)}`,
      teamName: team.teamName,
    });

    // logger.info('subject, message: ' + template.subject + template.message);

    try {
      await sendEmail({
        from: `From <${process.env.FROM_EMAIL_ADDRESS}>`,
        to: [emailOfInvitee], // tested, works
        subject: template.subject,
        body: template.message,
      });
    } catch (err) {
      logger.error('Email sending error:', err);
    }

    invitedUser.teamId = team.teamId;
    invitedUser.teamName = team.teamName;
    invitedUser.teamLogoUrl = team.teamLogoUrl;

    return invitedUser;
  }

  // works
  public static async revokeInvitation({ revokedInvitationEmail, teamId }) {
    if (!revokedInvitationEmail || !teamId) {
      throw new Error('Bad data');
    }

    const teamMember = await this.findOne({ email: revokedInvitationEmail }).setOptions({
      lean: true,
    });

    const team = teamMember.teamsForTeamMember.find((team) => {
      return team.teamId === teamId;
    });

    // update Team Leader
    await this.updateOne(
      { 'teamsForTeamLeader.teamId': teamId },
      { $pull: { 'teamsForTeamLeader.$.idsOfTeamMembers': teamMember._id.toString() } },
      { runValidators: true },
    );

    // update Team Member
    await this.updateOne(
      { email: revokedInvitationEmail },
      { $pull: { teamsForTeamMember: team } },
      { runValidators: true },
    );

    const teamLeader = await this.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    const template = await getEmailTemplate('revoked-invitation', {
      teamLeaderEmail: teamLeader.email,
      teamName: team.teamName,
      revokedInvitationEmail,
    });

    try {
      await sendEmail({
        from: `From <${process.env.FROM_EMAIL_ADDRESS}>`,
        to: [revokedInvitationEmail],
        cc: [teamLeader.email],
        subject: template.subject,
        body: template.message,
      });
    } catch (err) {
      logger.error('Email sending error:', err);
    }

    return teamMember._id.toString();
  }

  // test
  public static async removeTeamMember({ removedUserEmail, teamId }) {
    if (!removedUserEmail || !teamId) {
      throw new Error('Bad data');
    }

    const teamMember = await this.findOne({ email: removedUserEmail }).setOptions({
      lean: true,
    });

    // Team Leader
    await this.updateOne(
      { 'teamsForTeamLeader.teamId': teamId },
      {
        $pull: { 'teamsForTeamLeader.$.idsOfTeamMembers': teamMember._id.toString() },
        $addToSet: {
          'teamsForTeamLeader.$.removedTeamMembers': {
            email: removedUserEmail,
            removalDate: new Date(),
            userName: teamMember.userName,
            userAvatarUrl: teamMember.userAvatarUrl,
            userId: teamMember._id.toString(),
          },
        },
        $inc: {
          numberOfUniqueActiveTeamMembers: -1,
        },
      },
      { runValidators: true },
    );

    const teamLeader = await this.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    if (teamLeader.isSubscriptionActiveForAccount) {
      const subscription = await retrieveSubscription(teamLeader.stripeSubscription.id);

      await updateSubscription(teamLeader.stripeSubscription.id, {
        items: [
          {
            id: subscription.items.data[0].id,
            quantity: teamLeader.numberOfUniqueActiveTeamMembers,
          },
        ],
      });
    }

    // Team Member
    // need fix, update defaultTeamId
    await this.updateOne(
      { email: removedUserEmail, 'teamsForTeamMember.teamId': teamId },
      { $set: { 'teamsForTeamMember.$.status': 'removed' } },
      { $pull: { 'onlineStatusByTeam.$.teamId': teamId } },
    );

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    const template = await getEmailTemplate('removed-member', {
      teamLeaderEmail: teamLeader.email,
      teamName: team.teamName,
      removedUserEmail,
    });

    try {
      await sendEmail({
        from: `From <${process.env.FROM_EMAIL_ADDRESS}>`,
        to: [removedUserEmail],
        cc: [teamLeader.email],
        subject: template.subject,
        body: template.message,
      });
    } catch (err) {
      logger.error('Email sending error:', err);
    }

    return {
      email: removedUserEmail,
      removalDate: new Date(),
      userName: teamMember.userName,
      userAvatarUrl: teamMember.userAvatarUrl,
      userId: teamMember._id.toString(),
    };
  }

  // paid subscriptions

  // use it on Billing page
  public static async getListOfInvoicesForAccount({ userId }) {
    const teamLeader = await this.findById(userId, 'stripeCustomer teamsForTeamLeader');

    const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
      await this.getSubscriptionStatus(userId);

    if (
      !teamLeader.stripeCustomer.id ||
      (!isSubscriptionActiveForAccount && !isTrialPeriodOverForAccount)
    ) {
      return;
    }

    const newListOfInvoices = await getListOfInvoicesFromStripe({
      customerId: teamLeader.stripeCustomer.id,
      subscriptionId: teamLeader.stripeSubscription.id,
    });

    if (newListOfInvoices.data === undefined || !newListOfInvoices.data.length) {
      throw new Error('You have no payment history.');
    }

    const updatedTeamLeader = await this.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          stripeListOfInvoices: newListOfInvoices,
        },
      },
      { runValidators: true, new: true },
    ).setOptions({ lean: true });

    return updatedTeamLeader.stripeListOfInvoices;
  }

  // used in Checkout
  public static async subscribeToPaidPlan({
    session,
    teamLeader,
  }: {
    session: Stripe.Checkout.Session;
    teamLeader: IUserDocument;
  }): Promise<void> {
    if (!session.subscription) {
      throw new Error('Not paid subscription inside session');
    }

    if (!teamLeader) {
      throw new Error('Team Leader is not found.');
    }

    if (teamLeader.isSubscriptionActiveForAccount) {
      throw new Error('Your account is already subscribed to paid plan.');
    }

    const stripeSubscription = await retrieveSubscription(session.subscription as string);
    if (stripeSubscription.cancel_at || stripeSubscription.canceled_at) {
      throw new Error('Canceled');
    }

    const stripeCard =
      (stripeSubscription.default_payment_method &&
        (stripeSubscription.default_payment_method as Stripe.PaymentMethod).card) ||
      undefined;

    const hasCardInformation = !!stripeCard;

    // Team Leader
    await this.updateOne(
      { _id: teamLeader._id.toString() },
      {
        $set: {
          stripeCustomer: stripeSubscription.customer,
          stripeCard,
          hasCardInformation,
          stripeSubscription: stripeSubscription,
          isSubscriptionActiveForAccount: true,
          isPaymentFailedForAccount: false,
        },
      },
    );

    // do it for all teams of TL
    for (const team of teamLeader.teamsForTeamLeader) {
      for (const idOfTeamMember of team.idsOfTeamMembers) {
        await this.updateOne(
          { _id: idOfTeamMember, 'teamsForTeamMember.teamId': team.teamId },
          {
            $set: {
              'teamsForTeamMember.$.isSubscriptionActiveForTeam': true,
              'teamsForTeamMember.$.isPaymentFailedForTeam': false,
            },
          },
        );
      }
    }
  }

  // used in Checkout
  public static async changeStripeCard({
    session,
    teamLeader,
  }: {
    session: Stripe.Checkout.Session;
    teamLeader: IUserDocument;
  }): Promise<void> {
    if (!teamLeader) {
      throw new Error('User not found.');
    }

    const si: Stripe.SetupIntent = session.setup_intent as Stripe.SetupIntent;
    const pm: Stripe.PaymentMethod = si.payment_method as Stripe.PaymentMethod;

    if (!pm.card) {
      throw new Error('No card found.');
    }

    await updateCustomer(teamLeader.stripeCustomer.id, {
      invoice_settings: { default_payment_method: pm.id },
    });

    await updateSubscription(teamLeader.stripeSubscription.id, {
      default_payment_method: pm.id,
    });

    await this.updateOne(
      { _id: teamLeader._id.toString() },
      { stripeCard: pm.card, hasCardInformation: true },
    );
  }

  public static async cancelSubscriptionForAccount({ userId }) {
    const teamLeader = await this.findById(userId).setOptions({ lean: true });

    if (!teamLeader.isSubscriptionActiveForAccount) {
      throw new Error('This account is not subscribed to paid plan.');
    }

    const cancelledSubscriptionObj = await cancelSubscription({
      subscriptionId: teamLeader.stripeSubscription.id,
    });

    // do it for all teams of TL
    for (const team of teamLeader.teamsForTeamLeader) {
      for (const idOfTeamMember of team.idsOfTeamMembers) {
        await this.updateOne(
          { _id: idOfTeamMember, 'teamsForTeamMember.teamId': team.teamId },
          {
            $set: {
              'teamsForTeamMember.$.isSubscriptionActiveForTeam': false,
            },
          },
        );
      }
    }

    // Team Leader
    return this.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          stripeSubscription: cancelledSubscriptionObj,
          isSubscriptionActiveForAccount: false,
        },
      },
      { runValidators: true, new: true },
    ).setOptions({ lean: true });
  }

  // use it on Billing page
  public static async reSubscribeToPaidPlan({ userId }) {
    const teamLeader = await this.findById(userId).setOptions({ lean: true });

    if (!teamLeader.stripeSubscription) {
      throw new Error('No active subscription found for this Account');
    }

    if (!teamLeader.stripeSubscription.cancel_at) {
      throw new Error('Paid subscription is not cancelled');
    }

    const subscriptionObj = await reSubscribe({ subscriptionId: teamLeader.stripeSubscription.id });

    // do it for all teams of TL
    for (const team of teamLeader.teamsForTeamLeader) {
      for (const idOfTeamMember of team.idsOfTeamMembers) {
        await this.updateOne(
          { _id: idOfTeamMember, 'teamsForTeamMember.teamId': team.teamId },
          {
            $set: {
              'teamsForTeamMember.$.isSubscriptionActiveForTeam': true,
              'teamsForTeamMember.$.isPaymentFailedForTeam': false,
            },
          },
        );
      }
    }

    // TL
    return this.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          stripeSubscription: subscriptionObj,
          isSubscriptionActiveForAccount: true,
        },
      },
      { runValidators: true, new: true },
    ).setOptions({ lean: true });
  }

  // used in webhook
  public static async cancelSubscriptionForAccountAfterFailedPayment({ subscriptionId }) {
    const teamLeader = await this.findOne({
      'stripeSubscription.id': subscriptionId,
    }).setOptions({
      lean: true,
    });

    if (!teamLeader) {
      throw new Error('Team Leader is not found');
    }

    if (!teamLeader.isSubscriptionActiveForAccount) {
      throw new Error('Account is not subscribed to paid plan.');
    }

    const cancelledSubscriptionObj = await cancelSubscription({
      subscriptionId,
    });

    // do it for all teams of TL
    for (const team of teamLeader.teamsForTeamLeader) {
      for (const idOfTeamMember of team.idsOfTeamMembers) {
        await this.updateOne(
          { _id: idOfTeamMember, 'teamsForTeamMember.teamId': team.teamId },
          {
            $set: {
              'teamsForTeamMember.$.isSubscriptionActiveForTeam': false,
              'teamsForTeamMember.$.isPaymentFailedForTeam': true,
            },
          },
        );
      }
    }

    return this.findOneAndUpdate(
      { _id: teamLeader._id.toString() },
      {
        $set: {
          stripeSubscription: cancelledSubscriptionObj,
          isSubscriptionActiveForAccount: false,
          isPaymentFailedForAccount: true,
        },
      },
      { runValidators: true, new: true },
    ).setOptions({ lean: true });
  }

  public static async toggleTheme({ userId, showDarkTheme }) {
    if (!userId) {
      throw new Error('Bad data.');
    }

    await this.updateOne({ _id: userId }, { showDarkTheme: !!showDarkTheme });
  }

  public static async pinDiscussion({ userId, discussionId }) {
    if (!userId || !discussionId) {
      throw new Error('Bad data.');
    }

    await this.updateOne(
      { _id: userId },
      {
        $push: {
          pinnedDiscussionIds: discussionId,
        },
      },
    );
  }

  public static async unpinDiscussion({ userId, discussionId }) {
    if (!userId || !discussionId) {
      throw new Error('Bad data.');
    }

    await this.updateOne(
      { _id: userId },
      {
        $pull: {
          pinnedDiscussionIds: discussionId,
        },
      },
    );
  }

  public static async readComment({ userId, commentId }) {
    if (!userId || !commentId) {
      throw new Error('Bad data.');
    }

    await this.updateOne(
      { _id: userId },
      {
        $pull: {
          unreadCommentIds: commentId,
        },
      },
    );
  }

  public static async unreadComment({ userId, commentId }) {
    if (!userId || !commentId) {
      throw new Error('Bad data.');
    }

    await this.updateOne(
      { _id: userId },
      {
        $push: {
          unreadCommentIds: commentId,
        },
      },
    );
  }

  // marks one Comment as unread for participants of Discussion
  public static async markCommentAsUnreadForParticipantsOfDiscussionAfterCommentIsAdded({
    userIdsToNotify,
    commentId,
  }) {
    if (!commentId) {
      throw new Error('Bad data');
    }

    await this.updateMany(
      { _id: { $in: userIdsToNotify } },
      { $push: { unreadCommentIds: commentId } },
    );
  }

  // marks Comment as read for all members of Discussion when Comment is deleted
  public static async markCommentAsReadForParticipantsOfDiscussionAfterCommentIsDeleted({
    userIdsToNotify,
    commentId,
  }) {
    if (!commentId) {
      throw new Error('Bad data');
    }

    await this.updateMany(
      { _id: { $in: userIdsToNotify } },
      { $pull: { unreadCommentIds: commentId } },
    );
  }

  public static async pinChat({ userId, chatId }) {
    if (!userId || !chatId) {
      throw new Error('Bad data.');
    }

    await this.updateOne(
      { _id: userId },
      {
        $push: {
          pinnedChatIds: chatId,
        },
      },
    );
  }

  public static async unpinChat({ userId, chatId }) {
    if (!userId || !chatId) {
      throw new Error('Bad data.');
    }

    await this.updateOne(
      { _id: userId },
      {
        $pull: {
          pinnedChatIds: chatId,
        },
      },
    );
  }

  public static async messagesWereSeen({ userId, messageIds }) {
    if (!userId || !messageIds) {
      throw new Error('Bad data.');
    }

    const user = await this.findOne({ _id: userId })
      .select('unreadByUserMessageIds')
      .setOptions({ lean: true });

    const unreadByUserMessageIds = user.unreadByUserMessageIds.filter(
      (id) => !messageIds.includes(id),
    );

    await this.updateOne(
      { _id: userId },
      {
        $set: {
          unreadByUserMessageIds,
        },
      },
    );

    // update unreadBySomeoneMessageIds for each user whose message was seen
    const seenMessages = await Message.find({
      _id: { $in: messageIds },
    }).setOptions({ lean: true });

    const affectedUserIdsAndMessageIds: { userId: string; messageId: string }[] = [];
    for (const message of seenMessages) {
      const creatorOfMessage = await this.findOne({ _id: message.createdUserId })
        .select('unreadBySomeoneMessageIds')
        .setOptions({ lean: true });

      const unreadBySomeoneMessageIds = creatorOfMessage.unreadBySomeoneMessageIds.filter(
        (id) => id !== message._id.toString(),
      );

      await this.updateOne(
        { _id: message.createdUserId },
        {
          $set: {
            unreadBySomeoneMessageIds,
          },
        },
      );

      affectedUserIdsAndMessageIds.push({
        userId: message.createdUserId,
        messageId: message._id.toString(),
      });
    }

    return affectedUserIdsAndMessageIds;
  }

  // marks one Message as unread for participants of Chat minus actor user
  public static async markMessageAsUnreadForParticipantsOfChatAfterMessageIsAddedByUser({
    userIdsToNotify,
    messageId,
  }) {
    if (!messageId) {
      throw new Error('Bad data');
    }

    // add parentMessageId

    const addedMessage = await Message.findById(messageId).setOptions({ lean: true });

    if (addedMessage.parentMessageId) {
      await this.updateMany(
        { _id: { $in: userIdsToNotify } },
        {
          $addToSet: {
            unreadByUserMessageIds: { $each: [messageId, addedMessage.parentMessageId] },
          },
        },
      );
    } else {
      await this.updateMany(
        { _id: { $in: userIdsToNotify } },
        { $addToSet: { unreadByUserMessageIds: messageId } },
      );
    }
  }

  // marks Message as read for all participants of Chat when Message is deleted
  public static async markMessageAsReadForParticipantsOfChatAfterMessageIsDeletedByUser({
    userIdsToNotify,
    messageId,
  }) {
    if (!messageId) {
      throw new Error('Bad data');
    }

    const allThreadMessages = await Message.find({
      parentMessageId: messageId,
    }).setOptions({
      lean: true,
    });

    if (allThreadMessages.length > 0) {
      const arrayOfMessageIdsToPull = [];

      for (const threadMessage of allThreadMessages) {
        arrayOfMessageIdsToPull.push(threadMessage._id.toString());
      }

      arrayOfMessageIdsToPull.push(messageId);

      await this.updateMany(
        { _id: { $in: userIdsToNotify } },
        { $pull: { unreadByUserMessageIds: { $in: arrayOfMessageIdsToPull } } },
      );
    } else {
      await this.updateMany(
        { _id: { $in: userIdsToNotify } },
        { $pull: { unreadByUserMessageIds: messageId } },
      );
    }
  }

  // define:

  // markMessageAsReadForUserAfterMessageIsAddedByUser

  // markMessageAsReadForUserAfterMessageIsDeletedByUser

  public static async changeOnlineStatusForTeam({ userId, status, teamId }) {
    if (!userId) {
      throw new Error('Bad data.');
    }

    const user = await this.findOne({ _id: userId }).setOptions({
      lean: true,
    });

    const team =
      (user.onlineStatusByTeam.length > 0 &&
        user.onlineStatusByTeam.find((t) => t.teamId === teamId)) ||
      null;

    if (team) {
      await this.findOneAndUpdate(
        { _id: userId, 'onlineStatusByTeam.teamId': teamId },
        {
          $set: {
            'onlineStatusByTeam.$.status': status,
          },
        },
        { runValidators: true, new: true },
      );
    } else {
      await this.findOneAndUpdate(
        { _id: userId },
        {
          $push: {
            onlineStatusByTeam: { teamId, status },
          },
        },
        { runValidators: true, new: true },
      ).setOptions({ lean: true });
    }
  }

  public static async deleteTeam({ teamId, userId }) {
    if (!userId || !teamId) {
      throw new Error('Bad data.');
    }

    // remove all Discussions and Comments
    const discussionsOfTeam = await Discussion.find({ teamId }).setOptions({
      lean: true,
    });

    for (const discussion of discussionsOfTeam) {
      const discussionId = discussion._id.toString();

      const commentsToBeRemoved = await Comment.find({
        discussionId,
      }).setOptions({ lean: true });

      const commentIdsToBeRemoved = commentsToBeRemoved.map((c) => {
        return c['_id'].toString();
      });

      // remove all comments and files if any
      for (const commentId of commentIdsToBeRemoved) {
        await Comment.delete({ userId, id: commentId, isDiscussionBeingDeleted: true });
      }

      await Discussion.deleteOne({ _id: discussionId });
    }

    // remove all Chats and Messages
    const chatsOfTeam = await Chat.find({ teamId }).setOptions({
      lean: true,
    });

    for (const chat of chatsOfTeam) {
      const chatId = chat._id.toString();

      const messagesToBeRemoved = await Message.find({
        chatId,
      }).setOptions({ lean: true });

      const messageIdsToBeRemoved = messagesToBeRemoved.map((m) => {
        return m['_id'].toString();
      });

      // remove all comments and files if any
      for (const messageId of messageIdsToBeRemoved) {
        await Message.delete({ userId, id: messageId });
      }

      await Chat.deleteOne({ _id: chatId });
    }

    const teamLeader = await this.findById(userId).setOptions({ lean: true });

    const teamToBeDeleted = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    // remove team from teamsForTeamLeader for team leader
    await this.updateOne(
      { _id: userId },
      { $pull: { teamsForTeamLeader: teamToBeDeleted } },
      { runValidators: true },
    );

    const teamMembersOfDeletedTeam = await User.find({
      'teamsForTeamMember.teamId': teamId,
    });

    // remove team from teamsForTeamMember for all team members (regardless of status)
    for (const teamMember of teamMembersOfDeletedTeam) {
      const teamForTeamMember = teamMember.teamsForTeamMember.find((t) => {
        return t.teamId === teamId;
      });

      if (teamMember.teamsForTeamMember.length > 1 || teamMember.teamsForTeamLeader.length > 0) {
        const filteredTeamsForTeamLeader = teamMember.teamsForTeamLeader.filter(
          (t) => t.teamId !== teamId,
        );
        const filteredTeamsForTeamMember = teamMember.teamsForTeamMember.filter(
          (t) => t.teamId !== teamId,
        );

        const firstTeamForTeamLeader =
          filteredTeamsForTeamLeader.length > 0 && filteredTeamsForTeamLeader[0];
        const firstTeamForTeamMember =
          filteredTeamsForTeamMember.length > 0 && filteredTeamsForTeamMember[0];

        await this.updateOne(
          { _id: teamMember._id.toString() },
          {
            defaultTeamId: firstTeamForTeamLeader.teamId || firstTeamForTeamMember.teamId,
            $pull: { teamsForTeamMember: teamForTeamMember },
          },
          { runValidators: true },
        );
      } else {
        await this.deleteOne({ _id: teamMember._id.toString() });
      }
    }
  }
}

mongoSchema.loadClass(UserClass);

const User = mongoose.model<IUserDocument, IUserModel>('User', mongoSchema);

User.ensureIndexes((err) => {
  if (err) {
    logger.error(`User.ensureIndexes: ${err.stack}`);
  }
});

export default User;
