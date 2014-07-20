'use strict';
/*!
 * Versatile storage based on
 * Connect - session - DBStore
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var utils = require('ffwd-utils/server');
var _ = utils._;
var noop = utils.noopNext;
var debug = utils.debug('ffwd-net/memory');
var Store = require('express-session/session/store');
var MStorage;

function getMongoose(app) {
  if (!app._mongoose) {
    debug('no mongoose');
    return;
  }
  if (MStorage) { return MStorage; }

  var findOrCreate = require('mongoose-findorcreate');
  var Schema = app._mongoose.Schema;
  var MSchema = new Schema({
    sid: String,
    data: Schema.Types.Mixed
  });
  MSchema.plugin(findOrCreate);
  MStorage = app._mongoose.model('SessionStorage', MSchema);

  return MStorage;
}

/**
 * Shim setImmediate for node.js < 0.10
 */

/* istanbul ignore next */
var defer = typeof setImmediate === 'function' ?
            setImmediate :
            function(fn){ process.nextTick(fn.bind.apply(fn, arguments)); };

/**
 * Initialize a new `DBStore`.
 *
 * @api public
 */

var DBStore = module.exports = function DBStore(app) {
  this.sessions = Object.create(null);
  this.app = app;
};

/**
 * Inherit from `Store.prototype`.
 */

_.extend(DBStore.prototype, Store.prototype);

/**
 * Attempt to fetch session by the given `sid`.
 *
 * @param {String} sid
 * @param {Function} fn
 * @api public
 */

DBStore.prototype.get = function(sid, fn){
  var self = this;
  fn = fn || noop;
  function done(err, data, created) {
    debug('found session %s %s', sid, err ? err.stack : 'ok', created);
    fn(err, data, created);
  }

  debug('get session %s', sid);

  var MongooseStorage = getMongoose(this.app);
  if (MongooseStorage) {
    MongooseStorage.findOrCreate({
      sid: sid
    }, {
      sid:sid,
      data: {}
    }, function(err, stored, created) {
      if (err) { return done(err); }

      if (created) {
        return done(null, stored.data, true);
      }


      var cookieData = (stored.data || {}).cookie;
      if (cookieData) {
        var expires = typeof cookieData.expires === 'string' ?
        new Date(cookieData.expires) :
          cookieData.expires;

        // destroy expired session
        if (expires && expires <= Date.now()) {
          return self.destroy(sid, fn);
        }
      }

      done(null, stored.data);
    });
  }
};

/**
 * Commit the given `sess` object associated with the given `sid`.
 *
 * @param {String} sid
 * @param {Session} sess
 * @param {Function} fn
 * @api public
 */

DBStore.prototype.set = function(sid, sess, fn){
  fn = fn || noop;

  var MongooseStorage = getMongoose(this.app);

  debug('set session %s', sid, sess);

  if (MongooseStorage) {
    MongooseStorage.findOrCreate({
      sid: sid
    }, {
      sid: sid,
      data: sess
    }, function(err, stored, created) {
      if (err) { return fn(err); }

      if (created) {
        debug('created session %s', sid);
        return fn(null, sess, created);
      }

      stored.update({data: sess}, function(err) {
        if (err) { return fn(err); }

        debug('updated session %s', sid);
        fn(null, sess, created);
      });
    });
  }
};

/**
 * Destroy the session associated with the given `sid`.
 *
 * @param {String} sid
 * @api public
 */

DBStore.prototype.destroy = function(sid, fn){
  fn = fn || noop;
  var self = this;
  function done(err) {
    debug('deleted session %s %s', sid, !err);
    delete self.sessions[sid];
    fn(err);
  }
  debug('delete session %s', sid);

  var MongooseStorage = getMongoose(this.app);
  if (MongooseStorage) {
    return MongooseStorage.findOneAndRemove({sid: sid}, done);
  }
};

/**
 * Invoke the given callback `fn` with all active sessions.
 *
 * @param {Function} fn
 * @api public
 */

DBStore.prototype.all = function(fn){
  debug('all sessions');
  var obj = {};
  if (fn) { defer(fn, null, obj); }
};

/**
 * Clear all sessions.
 *
 * @param {Function} fn
 * @api public
 */

DBStore.prototype.clear = function(fn){
  this.sessions = {};
  if (fn) { defer(fn); }
};

/**
 * Fetch number of sessions.
 *
 * @param {Function} fn
 * @api public
 */

DBStore.prototype.length = function(fn){
  var len = Object.keys(this.sessions).length;
  defer(fn, null, len);
};
