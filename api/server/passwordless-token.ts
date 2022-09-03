// https://www.npmjs.com/package/passwordless-mongostore-bcrypt-node

import * as bcrypt from 'bcryptjs';
import * as mongoose from 'mongoose';
import TokenStore from './passwordless-tokenstore';
import * as util from 'util';

import User from './models/User';

interface TokenDocument extends mongoose.Document {
  hashedToken: string;
  uid: string;
  ttl: Date;
  originUrl: string;
  email: string;
  isLoginEvent: boolean;
  teamId: string;
}

const mongoSchema = new mongoose.Schema({
  hashedToken: {
    type: String,
    required: true,
  },
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  ttl: {
    type: Date,
    required: true,
    expires: 0,
  },
  originUrl: String,
  email: String,
  isLoginEvent: {
    type: Boolean,
    required: true,
  },
  teamId: String,
});

const PasswordlessToken = mongoose.model<TokenDocument>(
  'PasswordlessToken',
  mongoSchema,
  'passwordless-token',
);

function MongoStore(options = {}) {
  TokenStore.call(this);

  this._options = options || {};
}

util.inherits(MongoStore, TokenStore);

MongoStore.prototype.authenticate = async function authenticate(token, uid, callback) {
  if (!token || !uid || !callback) {
    throw new Error('TokenStore:authenticate called with invalid parameters');
  }

  try {
    const tokenDoc = await PasswordlessToken.findOne({ uid, ttl: { $gt: new Date() } });

    if (tokenDoc) {
      const res = await bcrypt.compare(token, tokenDoc.hashedToken);
      if (res) {
        if (tokenDoc.email) {
          await User.registerOrLogIn({
            uid,
            email: tokenDoc.email,
            isLoginEvent: tokenDoc.isLoginEvent,
            teamId: tokenDoc.teamId,
          });
        }

        callback(null, true, tokenDoc.originUrl);
      } else {
        callback(null, false, null);
      }
    } else {
      callback(null, false, null);
    }
  } catch (error) {
    callback(error, false, null);
  }
};

MongoStore.prototype.storeOrUpdate = async function storeOrUpdate(
  token,
  uid,
  msToLive,
  originUrl,
  callback,
) {
  if (!token || !uid || !msToLive || !callback) {
    throw new Error('TokenStore:storeOrUpdate called with invalid parameters');
  }

  const saltRounds = 10;

  try {
    const hashedToken = await bcrypt.hash(token, saltRounds);
    const newRecord = { hashedToken, uid, ttl: new Date(Date.now() + msToLive), originUrl };

    await PasswordlessToken.updateOne(
      { uid },
      { $set: newRecord },
      { upsert: true, runValidators: true },
    );
    callback();
  } catch (error) {
    callback(error);
  }
};

MongoStore.prototype.storeOrUpdateByEmail = async function addEmail(
  email: string,
  isLoginEvent: boolean,
  teamId?: string,
) {
  if (!email) {
    throw new Error('TokenStore:addEmail called with invalid parameters');
  }

  const obj = await PasswordlessToken.findOne({ email }).select('uid').setOptions({ lean: true });

  if (obj) {
    return obj.uid;
  }

  let uid;
  const user = await User.findOne({ email }).setOptions({ lean: true });

  if (user) {
    uid = user._id.toString();
  } else {
    uid = new mongoose.Types.ObjectId().toHexString();
  }
  await PasswordlessToken.updateOne({ uid }, { email, teamId, isLoginEvent }, { upsert: true });

  return uid;
};

MongoStore.prototype.invalidateUser = async function invalidateUser(uid, callback) {
  if (!uid || !callback) {
    throw new Error('TokenStore:invalidateUser called with invalid parameters');
  }

  try {
    await PasswordlessToken.deleteOne({ uid });
    callback();
  } catch (error) {
    callback(error);
  }
};

MongoStore.prototype.clear = async function clear(callback) {
  if (!callback) {
    throw new Error('TokenStore:clear called with invalid parameters');
  }

  try {
    await PasswordlessToken.deleteMany({});
    callback();
  } catch (error) {
    callback(error);
  }
};

MongoStore.prototype.length = function length(callback) {
  PasswordlessToken.countDocuments(callback);
};

export default MongoStore;
