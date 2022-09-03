/* eslint-disable */

function TokenStore() {}

/**
 * Checks if the provided token / user id combination exists and is
 * valid in terms of time-to-live. If yes, the method provides the
 * the stored referrer URL if any.
 * @param  {String}   token to be authenticated
 * @param  {String}   uid Unique identifier of an user
 * @param  {Function} callback in the format (error, valid, referrer).
 * In case of error, error will provide details, valid will be false and
 * referrer will be null. If the token / uid combination was not found
 * found, valid will be false and all else null. Otherwise, valid will
 * be true, referrer will (if provided when the token was stored) the
 * original URL requested and error will be null.
 */

// @ts-ignore 
TokenStore.prototype.authenticate = function (token, uid, callback) {
  throw new Error('TokenStore shall never be called in its abstract form');
};

/**
 * Stores a new token / user ID combination or updates the token of an
 * existing user ID if that ID already exists. Hence, a user can only
 * have one valid token at a time
 * @param  {String}   token Token that allows authentication of _uid_
 * @param  {String}   uid Unique identifier of an user
 * @param  {Number}   msToLive Validity of the token in ms
 * @param  {String}   originUrl Originally requested URL or null
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */

// @ts-ignore
TokenStore.prototype.storeOrUpdate = function (token, uid, msToLive, originUrl, callback) {
  throw new Error('TokenStore shall never be called in its abstract form');
};

/**
 * Invalidates and removes a user and the linked token
 * @param  {String}   uid User ID for which the record shall be removed
 * @param  {Function} callback called with callback(error) in case of an
 * error or as callback() if the uid was successully invalidated
 */

// @ts-ignore
TokenStore.prototype.invalidateUser = function (uid, callback) {
  throw new Error('TokenStore shall never be called in its abstract form');
};

/**
 * Removes and invalidates all token
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */

// @ts-ignore
TokenStore.prototype.clear = function (callback) {
  throw new Error('TokenStore shall never be called in its abstract form');
};

/**
 * Number of tokens stored (no matter the validity)
 * @param  {Function} callback Called with callback(null, count) in case
 * of success or with callback(error) in case of an error
 */

// @ts-ignore
TokenStore.prototype.length = function (callback) {
  throw new Error('TokenStore shall never be called in its abstract form');
};

export default TokenStore;