import * as mongoose from 'mongoose';

import logger from '../logs';

import Message, { IMessageDocument } from './Message';
import User from './User';

const mongoSchema = new mongoose.Schema({
  teamId: { type: String, required: true },
  chatCreatorId: { type: String, required: true },
  chatParticipantIds: [{ type: String, required: true }],
  createdAt: { type: Date, required: true, default: Date.now },
  lastUpdatedAt: { type: Date, required: true, default: Date.now },
});

// subArray match causes error: E11000 duplicate key error collection
// https://stackoverflow.com/questions/57569581/e11000-duplicate-key-error-when-inserting-array-with-existing-first-element-in-a
// mongoSchema.index({ teamId: 1, chatParticipantIds: 1 }, { unique: true });

mongoSchema.index({ teamId: 1 });
// mongoSchema.index({ teamId: 1, chatParticipantIds: 1 }, { unique: true });

interface IChatDocument extends mongoose.Document {
  teamId: string;
  chatCreatorId: string;
  chatParticipantIds: string[];
  createdAt: Date;
  lastUpdatedAt: Date;
  initialMessages: any[];
  numberOfMessagesPerChat: number;
}

interface IChatModel extends mongoose.Model<IChatDocument> {
  getChatList({ userId, teamId }: { userId: string; teamId: string }): Promise<IChatDocument[]>;

  createOrUpdate({
    chatParticipantIds,
    userId,
    teamId,
    id,
    content,
  }: {
    chatParticipantIds: string[];
    userId: string;
    teamId: string;
    id: string;
    content: string;
  }): Promise<{ newOrUpdatedChat: IChatDocument; initialMessages: IMessageDocument[] }>;

  delete({ userId, chatId }: { userId: string; chatId: string }): Promise<{ teamId: string }>;

  clearHistory({ userId, chatId }: { userId: string; chatId: string }): Promise<{ teamId: string }>;

  searchWithinChat({
    userId,
    teamId,
    chatId,
    query,
  }: {
    userId: string;
    teamId: string;
    chatId: string;
    query: string;
  }): Promise<{ foundMessages: IMessageDocument[]; contextMessages: IMessageDocument[] }>;

  checkPermission({
    userId,
    teamId,
    chat,
  }: {
    userId: string;
    teamId: string;
    chat?: IChatDocument;
  }): Promise<any>;
}

class ChatClass extends mongoose.Model {
  public static async getChatList(params) {
    const { userId, teamId } = params;

    await this.checkPermission({ userId, teamId });

    const filter = {
      teamId,
      chatParticipantIds: userId,
    };

    const chats = await this.find(filter).sort({ _id: 1 }).setOptions({ lean: true });

    for (const chat of chats) {
      const messages = await Message.getList({
        userId,
        chatId: chat._id.toString(),
        batchNumberForMessages: 1,
        limit: 25,
      });

      const allMessagesPerChat = await Message.find({ chatId: chat._id.toString() }).setOptions({
        lean: true,
      });

      const numberOfMessagesPerChat = allMessagesPerChat.filter((m) => !m.parentMessageId).length;

      // Object.assign works
      Object.assign(chat, {
        initialMessages: messages.reverse(),
        numberOfMessagesPerChat,
      });
    }

    return chats;
  }

  public static async createOrUpdate(data) {
    const { chatParticipantIds = [], userId, teamId, id } = data;

    if (!teamId) {
      throw new Error('Bad data');
    }

    const { isSubscriptionActiveForAccount, isTrialPeriodOverForAccount } =
      await User.getSubscriptionStatus(userId);

    if (isTrialPeriodOverForAccount && !isSubscriptionActiveForAccount) {
      throw new Error('This team is not subscribed to a paid plan and free trial period is over.');
    }

    await this.checkPermission({ userId, teamId });

    let newOrUpdatedChat: IChatDocument;
    let initialMessages: IMessageDocument[];

    console.log(chatParticipantIds);

    const chatThatExists = await this.findOne({
      teamId,
      chatParticipantIds,
    }).setOptions({
      lean: true,
    });

    console.log(chatThatExists);

    if (chatThatExists) {
      return { newOrUpdatedChat: null, initialMessages: [] };
    }

    if (id) {
      newOrUpdatedChat = await this.findOneAndUpdate(
        { _id: id },
        {
          chatParticipantIds,
          lastUpdatedAt: new Date(),
        },
        { runValidators: true, new: true },
      );

      initialMessages = await Message.getList({
        userId,
        chatId: id,
        batchNumberForMessages: 1,
        limit: 25,
      });
    } else {
      newOrUpdatedChat = await this.create({
        chatParticipantIds,
        chatCreatorId: userId,
        teamId,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      });

      initialMessages = await Message.getList({
        userId,
        chatId: newOrUpdatedChat._id.toString(),
        batchNumberForMessages: 1,
        limit: 25,
      });
    }

    return { newOrUpdatedChat, initialMessages: initialMessages.reverse() };
  }

  // review
  public static async delete({ userId, chatId }): Promise<{ teamId: string }> {
    if (!chatId) {
      throw new Error('Bad data');
    }

    const existingChat = await this.findById(chatId).setOptions({ lean: true });

    if (!existingChat) {
      throw new Error('Not found');
    }

    await this.checkPermission({
      userId,
      teamId: existingChat.teamId,
      chat: existingChat,
    });

    const messagesToBeRemoved = await Message.find({
      chatId: existingChat._id.toString(),
    }).setOptions({ lean: true });

    const messageIdsToBeRemoved = messagesToBeRemoved.map((m) => {
      return m['_id'].toString();
    });

    // remove all messages and files if any
    for (const messageId of messageIdsToBeRemoved) {
      await Message.delete({ userId, id: messageId });
    }

    // remove chat document
    await this.deleteOne({ _id: chatId });

    // remove messageId from each user's unreadByUserMessageIds
    for (const id of existingChat.chatParticipantIds.filter((id) => id !== userId)) {
      const user = await User.findOne({ _id: id }).setOptions({ lean: true });

      const unreadByUserMessageIds = user.unreadByUserMessageIds.filter((uci) => {
        return !messageIdsToBeRemoved.includes(uci);
      });

      await User.findOneAndUpdate(
        { _id: id },
        { $set: { unreadByUserMessageIds } },
        { runValidators: true },
      ).setOptions({ lean: true });
    }

    return { teamId: existingChat.teamId };
  }

  public static async clearHistory({ userId, chatId }): Promise<{ teamId: string }> {
    if (!chatId) {
      throw new Error('Bad data');
    }

    const existingChat = await this.findById(chatId).setOptions({ lean: true });

    if (!existingChat) {
      throw new Error('Not found');
    }

    await this.checkPermission({
      userId,
      teamId: existingChat.teamId,
      chat: existingChat,
    });

    const messagesToBeRemoved = await Message.find({ chatId }).setOptions({ lean: true });

    const messageIdsToBeRemoved = messagesToBeRemoved.map((m) => {
      return m['_id'].toString();
    });

    // remove all messages and files if any
    for (const messageId of messageIdsToBeRemoved) {
      await Message.deleteForClearHistory({ userId, id: messageId });
    }

    // remove messageId from each user's unreadByUserMessageIds
    for (const id of existingChat.chatParticipantIds.filter((id) => id !== userId)) {
      const user = await User.findOne({ _id: id }).setOptions({ lean: true });

      const unreadByUserMessageIds = user.unreadByUserMessageIds.filter((uci) => {
        return !messageIdsToBeRemoved.includes(uci);
      });

      await User.findOneAndUpdate(
        { _id: id },
        { $set: { unreadByUserMessageIds } },
        { runValidators: true },
      ).setOptions({ lean: true });
    }

    return { teamId: existingChat.teamId };
  }

  // search within one Chat
  // add chatId as argument
  // refactor to return messages
  public static async searchWithinChat({ chatId, userId, teamId, query }) {
    await this.checkPermission({ userId, teamId });

    const words = query.split(/\s/).filter((s) => !!s);
    if (words.length === 0) {
      return [];
    }

    const regEx = new RegExp(words.map((s) => `\\b(${s})\\b`).join('|'));

    const foundMessages = await Message.find({
      chatId,
      content: { $regex: regEx, $options: 'i' },
    })
      .sort({ createdAt: -1, _id: 1 })
      .setOptions({ lean: true });

    if (!foundMessages || foundMessages.length === 0) {
      return { foundMessages: [], contextMessages: [] };
    } else {
      const oldestMessage = foundMessages[foundMessages.length - 1];

      const contextMessages = await Message.find({
        chatId,
        createdAt: { $gte: oldestMessage.createdAt },
      })
        .sort({ createdAt: -1, _id: 1 })
        .setOptions({ lean: true });

      return { foundMessages, contextMessages };
    }
  }

  // check for Team Leader or Team Member
  // check for Chat creator or Chat participant
  private static async checkPermission({ userId, teamId, chat = null }) {
    if (!userId || !teamId) {
      throw new Error('Bad data. You have no permission.');
    }

    const teamLeader = await User.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
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

mongoSchema.loadClass(ChatClass);

const Chat = mongoose.model<IChatDocument, IChatModel>('Chat', mongoSchema);

Chat.ensureIndexes((err) => {
  if (err) {
    logger.error(`Chat.ensureIndexes: ${err.stack}`);
  }
});

export default Chat;
export { IChatDocument, IChatModel };
