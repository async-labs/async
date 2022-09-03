import * as mongoose from 'mongoose';

import logger from '../logs';
import { markdownToHtml } from '../utils/markdownToHtml';

import { deleteFiles, moveFile } from '../aws-s3';

import Discussion from './Discussion';
import User from './User';

const mongoSchema = new mongoose.Schema({
  createdUserId: { type: String, required: true }, // make it index if you add Draft functionality
  content: { type: String, required: true },
  htmlContent: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  isEdited: { type: Boolean, default: false },
  lastEditedAt: { type: Date, required: true, default: Date.now },
  discussionId: { type: String, required: true, index: true },
  files: {
    type: [{ fileName: String, fileUrl: String, addedAt: Date }],
  },
});

interface ICommentDocument extends mongoose.Document {
  discussionId: string;
  createdUserId: string;
  content: string;
  htmlContent: string;
  isEdited: boolean;
  createdAt: Date;
  lastEditedAt: Date;
  files: [
    {
      fileName: string;
      fileUrl: string;
      addedAt: Date;
    },
  ];
}

interface ICommentModel extends mongoose.Model<ICommentDocument> {
  getList({
    userId,
    discussionId,
  }: {
    userId: string;
    discussionId: string;
  }): Promise<ICommentDocument[]>;

  addOrEdit({
    content,
    discussionId,
    teamId,
    userId,
    id,
    files,
  }: {
    content: string;
    discussionId: string;
    teamId: string;
    userId: string;
    id: string;
    files?: { fileName: string; fileUrl: string; addedAt: Date }[];
  }): Promise<{ comment: ICommentDocument; userIdsToNotify: string[] }>;

  edit({
    content,
    userId,
    teamId,
    id,
    socketId,
  }: {
    content: string;
    userId: string;
    teamId: string;
    id: string;
    socketId?: string;
  }): Promise<ICommentDocument>;

  delete({
    userId,
    id,
    isDiscussionBeingDeleted,
  }: {
    userId: string;
    id: string;
    isDiscussionBeingDeleted: boolean;
  }): Promise<{ userIdsToNotify: string[] }>;

  deleteFile({
    userId,
    commentId,
    fileUrl,
  }: {
    userId: string;
    commentId: string;
    fileUrl: string;
  }): Promise<void>;

  checkPermission({
    userId,
    discussionId,
    doc,
  }: {
    userId: string;
    discussionId: string;
    doc?: ICommentDocument;
  }): Promise<any>;

  addFile({
    userId,
    commentId,
    fileName,
    fileUrl,
  }: {
    userId: string;
    commentId: string;
    fileName: string;
    fileUrl: string;
  }): Promise<void>;
}

class CommentClass extends mongoose.Model {
  public static async getList({ userId, discussionId }) {
    await this.checkPermission({ userId, discussionId });

    const filter = { discussionId };

    return this.find(filter).sort({ createdAt: 1 }).setOptions({ lean: true });
  }

  // add arguments: teamId, socketId
  public static async addOrEdit({ content, discussionId, teamId, userId, id, files }) {
    if (!content || !teamId) {
      throw new Error('Bad data');
    }

    const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
      await User.getSubscriptionStatus(userId);

    if (isTrialPeriodOverForAccount && !isSubscriptionActiveForAccount) {
      throw new Error('This team is not subscribed to a paid plan and free trial period is over.');
    }

    if (id) {
      const editedComment = await this.edit({
        content,
        discussionId,
        userId,
        id,
      });

      // no realtime update for editing comment
      return { comment: editedComment, userIdsToNotify: [] };
    } else {
      const { discussion } = await this.checkPermission({ userId, discussionId });

      const htmlContent = markdownToHtml(content);

      const newComment = await this.create({
        createdUserId: userId,
        discussionId,
        content,
        htmlContent,
        isEdited: false,
        createdAt: new Date(),
        lastEditedAt: new Date(),
      });

      const isFirstComment =
        (await this.countDocuments({
          discussionId: newComment.discussionId,
        })) === 1;

      if (isFirstComment) {
        Discussion.updateOne(
          { _id: discussionId },
          { lastUpdatedAt: new Date(), $set: { firstCommentId: newComment._id.toString() } },
        ).exec();
      } else {
        Discussion.updateOne({ _id: discussionId }, { lastUpdatedAt: new Date() }).exec();
      }

      // add if of newComment to all participants of Discussion except this user

      await User.markCommentAsUnreadForParticipantsOfDiscussionAfterCommentIsAdded({
        userIdsToNotify: discussion.discussionMemberIds.filter((id) => id !== userId),
        commentId: newComment._id.toString(),
      });

      const movedFiles = [];
      for (const file of files) {
        const movedFile = await moveFile({
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          teamId,
          userId,
          discussionId,
          commentId: newComment._id.toString(),
          chatId: null,
          messageId: null,
        });

        movedFiles.push(movedFile);
      }

      const newCommentWithFiles = await this.findOneAndUpdate(
        { _id: newComment._id.toString() },
        {
          files: movedFiles,
        },
        { runValidators: true, new: true },
      );

      return {
        comment: newCommentWithFiles,
        userIdsToNotify: discussion.discussionMemberIds.filter((id) => id !== userId),
      };
    }
  }

  public static async edit(data) {
    const { content, userId, id } = data;

    if (!content || !id) {
      throw new Error('Bad data');
    }

    const doc = await this.findById(id).setOptions({ lean: true });

    if (!doc) {
      throw new Error('Not found');
    }

    await this.checkPermission({
      userId,
      discussionId: doc.discussionId,
      doc,
    });

    const htmlContent = markdownToHtml(content);

    const updatedObj = await this.findOneAndUpdate(
      { _id: id },
      {
        content,
        htmlContent,
        isEdited: true,
        lastEditedAt: new Date(),
      },
      { runValidators: true, new: true },
    );

    return updatedObj;
  }

  public static async delete({ userId, id, isDiscussionBeingDeleted }) {
    if (!id) {
      throw new Error('Bad data');
    }

    const doc = await this.findById(id).setOptions({ lean: true });

    if (!doc) {
      throw new Error('Not found');
    }

    const { discussion } = await this.checkPermission({ userId, discussionId: doc.discussionId });

    const isFirstDoc =
      (await this.countDocuments({ _id: { $lt: doc._id }, discussionId: doc.discussionId })) === 0;

    if (isFirstDoc && !isDiscussionBeingDeleted) {
      throw new Error(
        'You can not delete first comment of a discussion but you can delete discussion itself.',
      );
    }

    await this.deleteOne({ _id: id });

    const arrayOfFileUrls = doc.files.map((f) => {
      return f['fileUrl'];
    });

    if (arrayOfFileUrls.length > 0) {
      deleteFiles(arrayOfFileUrls).catch((err) => console.log(err));
    }

    await User.markCommentAsReadForParticipantsOfDiscussionAfterCommentIsDeleted({
      userIdsToNotify: discussion.discussionMemberIds.filter((id) => id !== userId),
      commentId: id,
    });

    return { userIdsToNotify: discussion.discussionMemberIds.filter((id) => id !== userId) };
  }

  public static async deleteFile({ userId, commentId, fileUrl }) {
    if (!commentId || !fileUrl) {
      throw new Error('Bad data');
    }

    const doc = await this.findById(commentId).setOptions({ lean: true });

    if (!doc) {
      throw new Error('Not found');
    }

    await this.checkPermission({ userId, discussionId: doc.discussionId });

    await this.findOneAndUpdate(
      { _id: commentId },
      {
        $pull: { files: { fileUrl } },
      },
      { runValidators: true },
    );

    const filesToDeleteFromS3 = [fileUrl];

    deleteFiles(filesToDeleteFromS3).catch((err) => console.log(err));
  }

  private static async checkPermission({ userId, discussionId, doc = null }) {
    if (!userId || !discussionId) {
      throw new Error('Bad data. You have no permission.');
    }

    if (doc && doc.createdUserId !== userId) {
      throw new Error('You do not have permission.');
    }

    const discussion = await Discussion.findById(discussionId).setOptions({ lean: true });

    logger.debug(discussion.teamId, typeof discussion.teamId);

    const teamLeader = await User.findOne({
      'teamsForTeamLeader.teamId': discussion.teamId,
    }).setOptions({
      lean: true,
    });

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === discussion.teamId;
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

  public static async addFile({ userId, commentId, fileName, fileUrl }) {
    if (!userId || !commentId || !fileName || !fileUrl) {
      throw new Error('Bad data');
    }

    const doc = await this.findOne({ _id: commentId }).setOptions({ lean: true });

    if (!doc) {
      throw new Error('Not found');
    }

    await this.checkPermission({ userId, discussionId: doc.discussionId });

    const commentWithFile = await this.findOneAndUpdate(
      { _id: commentId },
      {
        $push: {
          files: {
            fileName,
            fileUrl,
            addedAt: new Date(),
          },
        },
      },
      { runValidators: true, new: true },
    ).setOptions({
      lean: true,
    });

    return commentWithFile.files.find((f) => {
      return f.fileUrl === fileUrl;
    });
  }
}

mongoSchema.loadClass(CommentClass);

const Comment = mongoose.model<ICommentDocument, ICommentModel>('Comment', mongoSchema);

Comment.ensureIndexes((err) => {
  if (err) {
    logger.error(`Comment.ensureIndexes: ${err.stack}`);
  }
});

export default Comment;
export { ICommentDocument };
