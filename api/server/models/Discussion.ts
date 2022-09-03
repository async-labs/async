import * as mongoose from 'mongoose';

import logger from '../logs';

import Comment, { ICommentDocument } from './Comment';
import User from './User';

const mongoSchema = new mongoose.Schema({
  teamId: { type: String, required: true, index: true },
  discussionLeaderId: { type: String, required: true },
  discussionName: { type: String, required: true },
  discussionMemberIds: [{ type: String }],
  createdAt: { type: Date, required: true, default: Date.now },
  lastUpdatedAt: { type: Date, required: true, default: Date.now },
  isDiscussionArchived: { type: Boolean, required: true },
  firstCommentId: { type: String },
});

interface IDiscussionDocument extends mongoose.Document {
  teamId: string;
  discussionLeaderId: string;
  discussionName: string;
  discussionMemberIds: string[];
  createdAt: Date;
  lastUpdatedAt: Date;
  isDiscussionArchived: boolean;
  firstCommentId: string;
  initialComments: any[];
}

mongoSchema.index({ _id: 1, discussionName: 1 }, { unique: true });
mongoSchema.index({ teamId: 1, discussionName: 1 }, { unique: true });

interface IDiscussionModel extends mongoose.Model<IDiscussionDocument> {
  getActiveList({
    userId,
    teamId,
  }: {
    userId: string;
    teamId: string;
  }): Promise<IDiscussionDocument[]>;

  getArchivedList({
    userId,
    teamId,
  }: {
    userId: string;
    teamId: string;
  }): Promise<IDiscussionDocument[]>;

  createOrUpdate({
    discussionName,
    discussionMemberIds,
    userId,
    teamId,
    id,
    content,
    files,
  }: {
    discussionName: string;
    discussionMemberIds: string[];
    userId: string;
    teamId: string;
    id: string;
    content: string;
    files?: { fileName: string; fileUrl: string; addedAt: Date }[];
  }): Promise<{ newOrUpdatedDiscussion: IDiscussionDocument; initialComments: ICommentDocument[] }>;

  delete({
    userId,
    discussionId,
  }: {
    userId: string;
    discussionId: string;
  }): Promise<{ teamId: string }>;
  archive({
    userId,
    discussionId,
    action,
  }: {
    userId: string;
    discussionId: string;
    action: string;
  }): Promise<{ teamId: string }>;
  searchByContent({
    userId,
    teamId,
    whichList,
    query,
  }: {
    userId: string;
    teamId: string;
    whichList: string;
    query: string;
  }): Promise<IDiscussionDocument[]>;
}

class DiscussionClass extends mongoose.Model {
  // added isDiscussionArchived
  // false for Active list
  // true for Archived list
  public static async getActiveList(params) {
    const { userId, teamId } = params;

    await this.checkPermission({ userId, teamId });

    const filter = {
      teamId,
      discussionMemberIds: userId,
      isDiscussionArchived: false,
    };

    const discussions = await this.find(filter).sort({ _id: 1 }).setOptions({ lean: true });

    for (const discussion of discussions) {
      // Object.assign works
      Object.assign(discussion, {
        initialComments: await Comment.getList({
          userId,
          discussionId: discussion._id.toString(),
        }),
      });
    }

    return discussions;
  }

  public static async getArchivedList(params) {
    const { userId, teamId } = params;

    await this.checkPermission({ userId, teamId });

    const filter = {
      teamId,
      discussionMemberIds: userId,
      isDiscussionArchived: true,
    };

    const discussions = await this.find(filter).sort({ _id: 1 }).setOptions({ lean: true });

    for (const discussion of discussions) {
      // Object.assign works
      Object.assign(discussion, {
        initialComments: await Comment.getList({
          userId,
          discussionId: discussion._id.toString(),
        }),
      });
    }

    return discussions;
  }

  public static async createOrUpdate(data) {
    const { discussionName, discussionMemberIds = [], userId, teamId, id, content, files } = data;

    if (!discussionName || !teamId) {
      throw new Error('Bad data');
    }

    const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
      await User.getSubscriptionStatus(userId);

    if (isTrialPeriodOverForAccount && !isSubscriptionActiveForAccount) {
      throw new Error('This team is not subscribed to a paid plan');
    }

    await this.checkPermission({ userId, teamId });

    let newOrUpdatedDiscussion: IDiscussionDocument;
    let initialComments: ICommentDocument[];

    if (id) {
      newOrUpdatedDiscussion = await this.findOneAndUpdate(
        { _id: id },
        {
          discussionName,
          discussionMemberIds,
          lastUpdatedAt: new Date(),
        },
        { runValidators: true, new: true },
      );

      await Comment.addOrEdit({
        content,
        discussionId: newOrUpdatedDiscussion._id.toString(),
        teamId,
        userId,
        id: newOrUpdatedDiscussion.firstCommentId,
      });

      initialComments = await Comment.getList({
        userId,
        discussionId: id,
      });
    } else {
      const newDiscussion = await this.create({
        discussionName,
        discussionMemberIds,
        discussionLeaderId: userId,
        teamId,
        isDiscussionArchived: false,
      });

      const { comment } = await Comment.addOrEdit({
        content,
        discussionId: newDiscussion._id.toString(),
        teamId,
        userId,
        id: null,
        files,
      });

      newOrUpdatedDiscussion = await this.findOneAndUpdate(
        { _id: newDiscussion._id.toString() },
        {
          firstCommentId: comment._id.toString(),
          lastUpdatedAt: new Date(),
        },
        { runValidators: true, new: true },
      );

      initialComments = await Comment.getList({
        userId,
        discussionId: newDiscussion._id.toString(),
      });
    }

    return { newOrUpdatedDiscussion, initialComments };
  }

  // review
  public static async delete({ userId, discussionId }): Promise<any> {
    if (!discussionId) {
      throw new Error('Bad data');
    }

    const existingDiscussion = await this.findById(discussionId).setOptions({ lean: true });

    if (!existingDiscussion) {
      throw new Error('Not found');
    }

    await this.checkPermission({
      userId,
      teamId: existingDiscussion.teamId,
      discussion: existingDiscussion,
    });

    const commentsToBeRemoved = await Comment.find({
      discussionId: existingDiscussion._id.toString(),
    }).setOptions({ lean: true });

    const commentIdsToBeRemoved = commentsToBeRemoved.map((c) => {
      return c['_id'].toString();
    });

    // remove all comments and files if any
    for (const commentId of commentIdsToBeRemoved) {
      await Comment.delete({ userId, id: commentId, isDiscussionBeingDeleted: true });
    }

    // remove discussion document
    await this.deleteOne({ _id: discussionId });

    // remove commentId from each user's unreadCommentIds
    for (const id of existingDiscussion.discussionMemberIds.filter((id) => id !== userId)) {
      const user = await User.findOne({ _id: id }).setOptions({ lean: true });

      const unreadCommentIds = user.unreadCommentIds.filter((uci) => {
        return !commentIdsToBeRemoved.includes(uci);
      });

      await User.findOneAndUpdate(
        { _id: id },
        { $set: { unreadCommentIds } },
        { runValidators: true },
      ).setOptions({ lean: true });
    }

    return { teamId: existingDiscussion.teamId };
  }

  // inside `app`, make sure that Comment cannot be added to the Archived Discussion
  public static async archive({ userId, discussionId, action }): Promise<any> {
    if (!discussionId || !action) {
      throw new Error('Bad data');
    }

    const discussion = await this.findById(discussionId).setOptions({ lean: true });

    if (!discussion) {
      throw new Error('Not found');
    }

    await this.checkPermission({ userId, teamId: discussion.teamId, discussion });

    let isDiscussionArchived;

    if (action === 'archive') {
      isDiscussionArchived = true;
    } else if (action === 'unarchive') {
      isDiscussionArchived = false;
    }

    await this.findOneAndUpdate(
      { _id: discussionId },
      {
        isDiscussionArchived,
      },
      { runValidators: true, new: true },
    ).setOptions({ lean: true });

    return { teamId: discussion.teamId };
  }

  public static async searchByContent({ userId, teamId, whichList, query }) {
    await this.checkPermission({ userId, teamId });

    const words = query.split(/\s/).filter((s) => !!s);
    if (words.length === 0) {
      return [];
    }

    const regEx = new RegExp(words.map((s) => `\\b(${s})\\b`).join('|'));

    let isDiscussionArchived;
    if (whichList && whichList === 'active') {
      isDiscussionArchived = false;
    } else if (whichList && whichList === 'archived') {
      isDiscussionArchived = true;
    }

    const allDiscussionIds = await this.find({
      discussionMemberIds: userId,
      teamId,
      isDiscussionArchived,
    })
      .select('_id')
      .setOptions({ lean: true })
      .then((objs) => objs.map((o) => o._id.toString()));

    const discussionIds = await Comment.find({
      discussionId: { $in: allDiscussionIds },
      content: { $regex: regEx, $options: 'i' },
    })
      .sort({ createdAt: 1 })
      .select('discussionId')
      .setOptions({ lean: true })
      .then((objs) => objs.map((o) => o.discussionId));

    const discussions: any[] = await this.find({
      teamId,
      discussionMemberIds: userId,
      isDiscussionArchived,
      $or: [{ _id: { $in: discussionIds } }, { discussionName: { $regex: regEx, $options: 'i' } }],
    })
      .sort({ createdAt: 1 })
      .setOptions({ lean: true });

    await Promise.all(
      discussions.map(async (d) => {
        d.initialComments = await Comment.find({ discussionId: d._id })
          .sort({ createdAt: 1 })
          .setOptions({ lean: true });
        return d;
      }),
    );

    return discussions;
  }

  // check for Team Leader or Team Member
  // check for Discussion Leader or Discussion Member
  private static async checkPermission({ userId, teamId, discussion = null }) {
    if (!userId || !teamId) {
      throw new Error('Bad data. You have no permission.');
    }

    const teamLeader = await User.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    if (
      !discussion &&
      (teamLeader._id.toString() === userId || team.idsOfTeamMembers.includes(userId))
    ) {
      return { team };
    }

    if (
      discussion &&
      (teamLeader._id.toString() === userId || team.idsOfTeamMembers.includes(userId)) &&
      (discussion.discussionLeaderId === userId || discussion.discussionMemberIds.includes(userId))
    ) {
      return { team, discussion };
    }

    throw new Error('Permission denied');
  }
}

mongoSchema.loadClass(DiscussionClass);

const Discussion = mongoose.model<IDiscussionDocument, IDiscussionModel>('Discussion', mongoSchema);

Discussion.ensureIndexes((err) => {
  if (err) {
    logger.error(`Discussion.ensureIndexes: ${err.stack}`);
  }
});

export default Discussion;
export { IDiscussionDocument, IDiscussionModel };
