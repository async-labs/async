import * as aws from 'aws-sdk';
import * as pathModule from 'path';

import Discussion from './models/Discussion';
import Comment from './models/Comment';

import Chat from './models/Chat';
import Message from './models/Message';

import User from './models/User';

import { slugify } from './utils/slugify';
// import logger from './logs';

async function checkIdsAndDocs(
  teamId: string,
  userId: string,
  discussionId: string,
  commentId: string,
  chatId: string,
  messageId: string,
) {
  if (!process.env.BUCKET_FOR_FILES) {
    throw new Error('Missing environmental variable BUCKET_FOR_FILES.');
  }

  if (teamId && teamId !== 'new-team') {
    const teamLeader = await User.findOne({ 'teamsForTeamLeader.teamId': teamId }).setOptions({
      lean: true,
    });

    const team = teamLeader.teamsForTeamLeader.find((team) => {
      return team.teamId === teamId;
    });

    if (!teamId || !team) {
      throw new Error('Wrong data 1.');
    }
  }

  // check if user exists for avatar upload
  if (userId && !discussionId && !chatId) {
    const user = await User.findById(userId).setOptions({ lean: true });
    if (!user) {
      throw new Error('Wrong data 2.');
    }
  }

  if (discussionId && discussionId !== 'new-discussion') {
    const discussion = await Discussion.findById(discussionId).setOptions({ lean: true });

    if (!discussion) {
      throw new Error('Wrong data 31.');
    }
  }

  if (commentId && commentId !== 'new-comment') {
    const comment = await Comment.findById(commentId).setOptions({ lean: true });

    if (!comment) {
      throw new Error('Wrong data 32.');
    }
  }

  if (chatId && chatId !== 'new-chat') {
    const chat = await Chat.findById(chatId).setOptions({ lean: true });

    if (!chat) {
      throw new Error('Wrong data 33.');
    }
  }

  if (messageId && messageId !== 'new-message') {
    const message = await Message.findById(messageId).setOptions({ lean: true });

    if (!message) {
      throw new Error('Wrong data 34.');
    }
  }
}

async function signRequestForUpload({
  fileName,
  fileType,
  teamId,
  userId,
  discussionId,
  commentId,
  chatId,
  messageId,
}) {
  // teamSlug is not necessary for user avatar
  // no file upload in projects

  await checkIdsAndDocs(teamId, userId, discussionId, commentId, chatId, messageId);

  aws.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESSKEYID,
    secretAccessKey: process.env.AWS_SECRETACCESSKEY,
  });

  const s3 = new aws.S3({ apiVersion: 'latest' });

  const fileExt = pathModule.extname(fileName);
  const fileNameWithoutExtension = pathModule.basename(fileName, fileExt);
  // logger.info('name, extension: ' + fileNameWithoutExtension, fileExt);

  const randomString20 =
    Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);

  let key;
  if (discussionId && !chatId) {
    key = `team-${teamId}/discussion-${discussionId}/comment-${commentId}/user-${userId}/${randomString20}/${slugify(
      fileNameWithoutExtension,
    )}${fileExt}`;
  } else if (!discussionId && chatId) {
    key = `team-${teamId}/chat-${chatId}/message-${messageId}/user-${userId}/${randomString20}/${slugify(
      fileNameWithoutExtension,
    )}${fileExt}`;
  } else if (!discussionId && !chatId) {
    key = `team-${teamId}/avatars/user-${userId}/${randomString20}/${slugify(
      fileNameWithoutExtension,
    )}${fileExt}`;
  }

  // bucket must be private

  // acl should be `public-read` for avatars
  // acl should be `authenticated-read` for project- and chat-related files
  // to access objects with `authenticated-read`, we need to sign request
  // test it before finishing UI at `app`
  // take signed GET request and paste it into browser's tab
  const params: any = {
    Bucket: process.env.BUCKET_FOR_FILES,
    Key: key,
    Expires: 300, // 5 minutes, sufficient for uploading
    ContentType: fileType,
    ACL: 'public-read',
  };

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
  // About Key: https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html
  // > You must ensure that you have static or previously resolved credentials
  // > if you call this method synchronously (with no callback), otherwise it may not properly sign the request

  return new Promise((resolve, reject) => {
    s3.getSignedUrl('putObject', params, (err, data) => {
      const returnedDataFromS3 = {
        signedRequest: data,
        path: key as string,
        url: `https://${process.env.BUCKET_FOR_FILES}.s3.amazonaws.com/${key}`,
      };

      if (err) {
        reject(err);
      } else {
        resolve(returnedDataFromS3);
      }
    });
  });
}

// define `signRequestForGet`

// async function signRequestForGet({ userId, keyForFile }) {
//   aws.config.update({
//     region: process.env.AWS_REGION,
//     accessKeyId: process.env.AWS_ACCESSKEYID,
//     secretAccessKey: process.env.AWS_SECRETACCESSKEY,
//   });

//   const s3 = new aws.S3({ apiVersion: 'latest' });

//   // bucket is private

//   if (keyForFile.includes('/discussion-') && keyForFile.includes('/comment-')) {
//     const discussionId = keyForFile.substring(
//       keyForFile.lastIndexOf('/discussion-') + 1,
//       keyForFile.lastIndexOf('/comment-'),
//     );

//     const discussion = await Discussion.findById(discussionId)
//       .select('discussionMemberIds')
//       .setOptions({ lean: true });

//     if (!discussion || discussion.discussionMemberIds.indexOf(userId) === -1) {
//       throw new Error('Permission denied.');
//     }
//   }

//   if (keyForFile.includes('/chat-') && keyForFile.includes('/message-')) {
//     const chatId = keyForFile.substring(
//       keyForFile.lastIndexOf('/chat-') + 1,
//       keyForFile.lastIndexOf('/message-'),
//     );

//     const chat = await Chat.findById(chatId).select('chatMemberIds').setOptions({ lean: true });

//     if (!chat || chat.chatMemberIds.indexOf(userId) === -1) {
//       throw new Error('Permission denied.');
//     }
//   }

//   const params: any = {
//     Bucket: process.env.BUCKET_FOR_FILES,
//     Key: keyForFile,
//     Expires: 300, // 5 minutes, sufficient for getting file
//   };

//   // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
//   // About Key: https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html
//   // > Note: You must ensure that you have static or previously resolved credentials
//   // if you call this method synchronously (with no callback), otherwise it may not properly sign the request.
//   // If you cannot guarantee this (you are using an asynchronous credential provider, i.e., EC2 IAM roles),
//   // you should always call this method with an asynchronous callback.

//   // https://stackoverflow.com/questions/38831829/nodejs-aws-sdk-s3-generate-presigned-url

//   return new Promise((resolve, reject) => {
//     s3.getSignedUrl('getObject', params, (err, data) => {
//       const returnedDataFromS3 = {
//         signedRequest: data,
//         path: keyForFile,
//         url: `https://${process.env.BUCKET_FOR_FILES}.s3.amazonaws.com/${keyForFile}`,
//       };

//       if (err) {
//         reject(err);
//       } else {
//         resolve(returnedDataFromS3);
//       }
//     });
//   });
// }

// this method is used in Comment and Message models
function deleteFiles(files: string[]) {
  aws.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESSKEYID,
    secretAccessKey: process.env.AWS_SECRETACCESSKEY,
  });

  const s3 = new aws.S3({ apiVersion: 'latest' });

  const params = {
    Bucket: process.env.BUCKET_FOR_FILES,
    Delete: {
      Objects: files.map((f) => ({ Key: f.split('.s3.amazonaws.com/')[1] })),
    },
  };

  return new Promise((resolve, reject) => {
    s3.deleteObjects(params, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

// this method is used in Comment and Message models
async function moveFile({
  fileUrl,
  fileName,
  teamId,
  userId,
  discussionId,
  commentId,
  chatId,
  messageId,
}: {
  fileUrl: string;
  fileName: string;
  teamId: string;
  userId: string;
  discussionId?: string;
  commentId?: string;
  chatId?: string;
  messageId?: string;
}) {
  aws.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESSKEYID,
    secretAccessKey: process.env.AWS_SECRETACCESSKEY,
  });

  const s3 = new aws.S3({ apiVersion: 'latest' });

  const randomString20 =
    Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);

  const fileExt = pathModule.extname(fileName);
  const fileNameWithoutExtension = pathModule.basename(fileName, fileExt);

  let key: string;
  if (discussionId && !chatId) {
    key = `team-${teamId}/discussion-${discussionId}/comment-${commentId}/user-${userId}/${randomString20}/${slugify(
      fileNameWithoutExtension,
    )}${fileExt}`;
  } else if (!discussionId && chatId) {
    key = `team-${teamId}/chat-${chatId}/message-${messageId}/user-${userId}/${randomString20}/${slugify(
      fileNameWithoutExtension,
    )}${fileExt}`;
  }

  const copyParams = {
    Bucket: process.env.BUCKET_FOR_FILES,
    CopySource: process.env.BUCKET_FOR_FILES + '/' + fileUrl.split('.s3.amazonaws.com/')[1],
    Key: key,
    ACL: 'public-read',
  };

  await s3.copyObject(copyParams).promise();

  const deleteParams = {
    Bucket: process.env.BUCKET_FOR_FILES,
    Key: fileUrl.split('.s3.amazonaws.com/')[1],
  };

  await s3.deleteObject(deleteParams).promise();

  if (discussionId && !chatId) {
    return {
      fileName,
      fileUrl: `https://${
        process.env.BUCKET_FOR_FILES
      }.s3.amazonaws.com/team-${teamId}/discussion-${discussionId}/comment-${commentId}/user-${userId}/${randomString20}/${slugify(
        fileNameWithoutExtension,
      )}${fileExt}`,
      addedAt: new Date(),
    };
  } else if (!discussionId && chatId) {
    return {
      fileName,
      fileUrl: `https://${
        process.env.BUCKET_FOR_FILES
      }.s3.amazonaws.com/team-${teamId}/chat-${chatId}/message-${messageId}/user-${userId}/${randomString20}/${slugify(
        fileNameWithoutExtension,
      )}${fileExt}`,
      addedAt: new Date(),
    };
  }
}

export { signRequestForUpload, deleteFiles, moveFile };
