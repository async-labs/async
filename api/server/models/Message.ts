import * as mongoose from 'mongoose';

import logger from '../logs';
import { markdownToHtml } from '../utils/markdownToHtml';

import { deleteFiles, moveFile } from '../aws-s3';

import Chat from './Chat';
import User from './User';

const mongoSchema = new mongoose.Schema({
  createdUserId: { type: String, required: true }, // make it index if you add Draft functionality
  content: { type: String, required: true },
  htmlContent: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  isEdited: { type: Boolean, default: false },
  lastEditedAt: { type: Date, required: true, default: Date.now },
  chatId: { type: String, required: true, index: true },
  files: {
    type: [{ fileName: String, fileUrl: String, addedAt: Date }],
  },
  parentMessageId: { type: String }, // index ?
});

interface IMessageDocument extends mongoose.Document {
  chatId: string;
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
  parentMessageId: string;
}

interface IMessageModel extends mongoose.Model<IMessageDocument> {
  getList({
    userId,
    chatId,
    batchNumberForMessages,
    limit,
  }: {
    userId: string;
    chatId: string;
    batchNumberForMessages: number;
    limit: number;
  }): Promise<IMessageDocument[]>;

  getListForThread({
    userId,
    chatId,
    messageId,
  }: {
    userId: string;
    chatId: string;
    messageId: string;
  }): Promise<IMessageDocument[]>;

  addOrEdit({
    content,
    chatId,
    teamId,
    userId,
    id,
    files,
    parentMessageId,
  }: {
    content: string;
    chatId: string;
    teamId: string;
    userId: string;
    id: string;
    files?: { fileName: string; fileUrl: string; addedAt: Date }[];
    parentMessageId: string;
  }): Promise<{ message: IMessageDocument; userIdsToNotify: string[] }>;

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
  }): Promise<IMessageDocument>;

  deleteForClearHistory({
    userId,
    id,
  }: {
    userId: string;
    id: string;
  }): Promise<{ userIdsToNotify: string[]; parentMessageId: string }>;

  delete({
    userId,
    id,
  }: {
    userId: string;
    id: string;
  }): Promise<{ userIdsToNotify: string[]; parentMessageId: string }>;

  deleteFile({
    userId,
    messageId,
    fileUrl,
  }: {
    userId: string;
    messageId: string;
    fileUrl: string;
  }): Promise<void>;

  addFile({
    userId,
    messageId,
    fileName,
    fileUrl,
  }: {
    userId: string;
    messageId: string;
    fileName: string;
    fileUrl: string;
  }): Promise<void>;

  checkPermission({
    userId,
    chatId,
    doc,
  }: {
    userId: string;
    chatId: string;
    doc?: IMessageDocument;
  }): Promise<any>;
}

class MessageClass extends mongoose.Model {
  public static async getList({ userId, chatId, batchNumberForMessages, limit }) {
    await this.checkPermission({ userId, chatId });

    const filter = { chatId, parentMessageId: null };

    const messages = await this.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((batchNumberForMessages - 1) * limit)
      .limit(limit)
      .setOptions({ lean: true });

    // use for...of instead of forEach
    // forEach does not care about promises from await
    for (const message of messages) {
      const threadMessages = await this.find({
        parentMessageId: message._id.toString(),
      });

      message.countOfThreadMessages = threadMessages.length;
    }

    return messages;
  }

  public static async getListForThread({ userId, chatId, messageId }) {
    await this.checkPermission({ userId, chatId });

    const filter = { chatId, parentMessageId: messageId };

    return this.find(filter).sort({ createdAt: 1, _id: 1 }).setOptions({ lean: true });
  }

  // done: add parentMessageId
  public static async addOrEdit({ content, chatId, teamId, userId, id, files, parentMessageId }) {
    if (!content || !teamId) {
      throw new Error('Bad data');
    }

    const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
      await User.getSubscriptionStatus(userId);

    if (isTrialPeriodOverForAccount && !isSubscriptionActiveForAccount) {
      throw new Error('This team is not subscribed to a paid plan and free trial period is over.');
    }

    await Chat.updateOne({ _id: chatId }, { lastUpdatedAt: new Date() });

    if (id) {
      const editedMessage = await this.edit({
        content,
        chatId,
        userId,
        id,
      });

      // no realtime update for editing message
      return { message: editedMessage, userIdsToNotify: [] };
    } else {
      const { chat } = await this.checkPermission({ userId, chatId });

      const htmlContent = markdownToHtml(content);

      const newMessage = await this.create({
        createdUserId: userId,
        chatId,
        content,
        htmlContent,
        isEdited: false,
        createdAt: new Date(),
        lastEditedAt: new Date(),
        parentMessageId: parentMessageId || null,
      });

      // add messageId to all participants of Chat except actor user

      await User.markMessageAsUnreadForParticipantsOfChatAfterMessageIsAddedByUser({
        userIdsToNotify: chat.chatParticipantIds.filter((id) => id !== userId),
        messageId: newMessage._id.toString(),
      });

      // call markMessageAsUneadBySomeoneAfterMessageIsAddedByUser
      await User.updateOne(
        { _id: userId },
        {
          $addToSet: {
            unreadBySomeoneMessageIds: newMessage._id.toString(),
          },
        },
      );

      // update moveFile
      const movedFiles = [];
      for (const file of files) {
        const movedFile = await moveFile({
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          teamId,
          userId,
          chatId,
          messageId: newMessage._id.toString(),
          discussionId: null,
          commentId: null,
        });

        movedFiles.push(movedFile);
      }

      const newMessageWithFiles = await this.findOneAndUpdate(
        { _id: newMessage._id.toString() },
        {
          files: movedFiles,
        },
        { runValidators: true, new: true },
      );

      return {
        message: newMessageWithFiles,
        userIdsToNotify: chat.chatParticipantIds.filter((id) => id !== userId),
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
      chatId: doc.chatId,
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

  public static async deleteForClearHistory({ userId, id }) {
    if (!id) {
      throw new Error('Bad data');
    }

    const messageToBeDeleted = await this.findOne({ _id: id }).setOptions({ lean: true });

    if (!messageToBeDeleted) {
      throw new Error(id);
    }

    const { chat } = await this.checkPermission({ userId, chatId: messageToBeDeleted.chatId });

    //
    await User.markMessageAsReadForParticipantsOfChatAfterMessageIsDeletedByUser({
      userIdsToNotify: chat.chatParticipantIds.filter((id) => id !== userId),
      messageId: id,
    });

    // call markMessageAsReadBySomeoneAfterMessageIsDeletedByUser
    await User.updateOne(
      { _id: userId },
      {
        $pull: {
          unreadBySomeoneMessageIds: id,
        },
      },
    );

    // const allThreadMessages = await this.find({
    //   parentMessageId: id,
    // }).setOptions({ lean: true });

    // if (allThreadMessages.length > 0) {
    //   for (const threadMessage of allThreadMessages) {
    //     await this.deleteOne({ _id: threadMessage._id.toString() });

    //     const arrayOfFileUrls = threadMessage.files.map((f) => {
    //       return f['fileUrl'];
    //     });

    //     if (arrayOfFileUrls.length > 0) {
    //       deleteFiles(arrayOfFileUrls).catch((err) => console.log(err));
    //     }
    //   }
    // }

    await this.deleteOne({ _id: id });

    const arrayOfFileUrls = messageToBeDeleted.files.map((f) => {
      return f['fileUrl'];
    });

    if (arrayOfFileUrls.length > 0) {
      deleteFiles(arrayOfFileUrls).catch((err) => console.log(err));
    }

    // 2 browsers, same user fix
    return {
      userIdsToNotify: chat.chatParticipantIds,
      parentMessageId: messageToBeDeleted.parentMessageId || null,
    };
  }

  public static async delete({ userId, id }) {
    if (!id) {
      throw new Error('Bad data');
    }

    const messageToBeDeleted = await this.findOne({ _id: id }).setOptions({ lean: true });

    if (!messageToBeDeleted) {
      throw new Error(id);
    }

    const { chat } = await this.checkPermission({ userId, chatId: messageToBeDeleted.chatId });

    //
    await User.markMessageAsReadForParticipantsOfChatAfterMessageIsDeletedByUser({
      userIdsToNotify: chat.chatParticipantIds.filter((id) => id !== userId),
      messageId: id,
    });

    // call markMessageAsReadBySomeoneAfterMessageIsDeletedByUser
    await User.updateOne(
      { _id: userId },
      {
        $pull: {
          unreadBySomeoneMessageIds: id,
        },
      },
    );

    const allThreadMessages = await this.find({
      parentMessageId: id,
    }).setOptions({ lean: true });

    if (allThreadMessages.length > 0) {
      for (const threadMessage of allThreadMessages) {
        await this.deleteOne({ _id: threadMessage._id.toString() });

        const arrayOfFileUrls = threadMessage.files.map((f) => {
          return f['fileUrl'];
        });

        if (arrayOfFileUrls.length > 0) {
          deleteFiles(arrayOfFileUrls).catch((err) => console.log(err));
        }
      }
    }

    await this.deleteOne({ _id: id });

    const arrayOfFileUrls = messageToBeDeleted.files.map((f) => {
      return f['fileUrl'];
    });

    if (arrayOfFileUrls.length > 0) {
      deleteFiles(arrayOfFileUrls).catch((err) => console.log(err));
    }

    // 2 browsers, same user fix
    return {
      userIdsToNotify: chat.chatParticipantIds,
      parentMessageId: messageToBeDeleted.parentMessageId || null,
    };
  }

  public static async deleteFile({ userId, messageId, fileUrl }) {
    if (!messageId || !fileUrl) {
      throw new Error('Bad data');
    }

    const doc = await this.findById(messageId).setOptions({ lean: true });

    if (!doc) {
      throw new Error('Not found');
    }

    await this.checkPermission({ userId, chatId: doc.chatId });

    await this.findOneAndUpdate(
      { _id: messageId },
      {
        $pull: { files: { fileUrl } },
      },
      { runValidators: true },
    );

    const filesToDeleteFromS3 = [fileUrl];

    deleteFiles(filesToDeleteFromS3).catch((err) => console.log(err));
  }

  public static async addFile({ userId, messageId, fileName, fileUrl }) {
    if (!userId || !messageId || !fileName || !fileUrl) {
      throw new Error('Bad data');
    }

    const doc = await this.findOne({ _id: messageId }).setOptions({ lean: true });

    if (!doc) {
      throw new Error('Not found');
    }

    await this.checkPermission({ userId, chatId: doc.chatId });

    const messageWithFile = await this.findOneAndUpdate(
      { _id: messageId },
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

    return messageWithFile.files.find((f) => {
      return f.fileUrl === fileUrl;
    });
  }

  private static async checkPermission({ userId, chatId, doc = null }) {
    if (!userId || !chatId) {
      throw new Error('Bad data. You have no permission.');
    }

    if (doc && doc.createdUserId !== userId) {
      throw new Error('You do not have permission.');
    }

    const chat = await Chat.findById(chatId).setOptions({ lean: true });

    const teamLeader = await User.findOne({
      'teamsForTeamLeader.teamId': chat.teamId,
    }).setOptions({
      lean: true,
    });

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === chat.teamId;
    });

    if (!chat && (teamLeader._id.toString() === userId || team.idsOfTeamMembers.includes(userId))) {
      return { team };
    }

    if (
      chat &&
      (teamLeader._id.toString() === userId || team.idsOfTeamMembers.includes(userId)) &&
      (chat.chatParticipantIds === userId || chat.chatParticipantIds.includes(userId))
    ) {
      return { team, chat };
    }

    throw new Error('Permission denied');
  }
}

mongoSchema.loadClass(MessageClass);

const Message = mongoose.model<IMessageDocument, IMessageModel>('Message', mongoSchema);

Message.ensureIndexes((err) => {
  if (err) {
    logger.error(`Message.ensureIndexes: ${err.stack}`);
  }
});

export default Message;
export { IMessageDocument };
