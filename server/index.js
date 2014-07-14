/* jshint node: true */
'use strict';

/**
 * @namespace ffwd
 */

/**
 * @namespace ffwd.server
 */

/**
 * Server setup for use with grunt-express task
 * @memberof ffwd
 * @module server
 */

var path        = require('path');
var express     = require('express');
var path        = require('path');
var utils       = require('ffwd-utils/server');
var _           = utils._;

var projectDir  = process.cwd();//path.resolve(__dirname, '..');

var appSettings = {
  appDir: projectDir
};

function noopReq(req, res, next) {
  next();
}

function staticDirs(conf, app) {
  _.each(conf.staticContent || {}, function(route, dir) {
    var directory = path.join(conf.projectDir, dir);
    var middleware = express.static(directory);

    if (route) {
      app.use(route, middleware);
    }
    else {
      app.use(middleware);
    }
  });
}

function useFeature(app, feature, name) {
  if (_.isArray(feature)) {
    if (_.isString(feature[0]) || _.isFunction(feature[0])) {
      return app.use.apply(app, feature);
    }

    return _.each(feature, function(feat) {
      useFeature(app, feat, name);
    });
  }

  app.use(feature.request || noopReq);
}

function noop(){};

var silentLogger = {
  warn: noop,
  info: noop,
  log: noop,
  debug: noop,
  trace: noop,
  error: noop
};


module.exports = function(settings) {
  settings = settings || {};

  var app = express();
  // app.logger = (settings.logger === 'silent' || settings.silent) ?
  //               silentLogger :
  //               settings.logger || console;

  var server = require('http').createServer(app);
  server.use = function() {
    app.use.apply(app, arguments);
  };
  
  var io = app.io = require('socket.io').listen(server);

  appSettings = settings;
  
  _.defaults(appSettings, {
    port:               settings.port || process.env.PORT || 3000,
    livereloadPort:     settings.livereloadPort || parseInt(settings.port || process.env.PORT || 3000) + 1,
    projectDir:         projectDir,
    logLevel:           'dev',
    views:              'client/templates',
    language:           'en-US',
    basePath:           '/',
    locals:             {},
    staticContent:      { 'dist': '/' },
    appName:            'FFWD',
    googleAnalyticsUA:  ''
  });

  var morgan          = require('morgan');
  var bodyParser      = require('body-parser');
  // var methodOverride  = require('method-override');
  var errorHandler    = require('errorhandler');

  var engines         = require('consolidate');

  // app.engine('hbs', engines.handlebars);
  app.engine('tpl', engines.underscore);

  app.set('view engine', 'tpl');

  app.set('port', appSettings.port);

  // app.set('views', path.join(projectDir, appSettings.views));
  app.set('views', appSettings.views);

  app.set('appName', appSettings.appName);



  _.each(appSettings.locals, app.locals, app);


  // serves 
  staticDirs(appSettings, app);


  app.use(morgan(appSettings.logLevel));
  // app.use(bodyParser());
  // app.use(methodOverride());
  app.use(bodyParser.urlencoded());
  app.use(bodyParser.json());
  // app.use(bodyParser.urlencoded({
  //   extended: true
  // }));

  // set default value for some response locals
  app.use(function(req, res, next) {
    // res.locals = _.defaults(res.locals || {}, {
    _.defaults(res.locals, {
      language:           appSettings.language,
      basePath:           appSettings.basePath,
      appName:            appSettings.appName,
      googleAnalyticsUA:  appSettings.googleAnalyticsUA,
      title:              '',
      description:        '',
      navigation:         {}
    });

    next();
  });

  // we attach the features to the app too!
  var features = app.features = utils.loadFeatures(appSettings.features, {
    subject: app.features
  });

  // compile the settings
  _.each(features, function(feature, name) {
    
    useFeature(app, feature, name);

    _.each(['routes', 'params', 'locals'], function(prop) {
      appSettings[prop] = _.extend(appSettings[prop] || {}, feature[prop] || {});
    });
  });

  // http://expressjs.com/4x/api.html#app.param
  _.each(appSettings.params, function(callback, name) {
    app.param(name, callback);
  });

  _.each(appSettings.routes, function(methods, urlPath) {
    _.each(methods, function(cb, method) {
      method = method.toLowerCase();
      // http://expressjs.com/4x/api.html#app.route
      app.route(urlPath)[method](cb);
    });
  });

  // http://expressjs.com/4x/api.html#app.locals
  _.extend(app.locals, appSettings.locals);

  if (appSettings.env === 'dev') {
    app.use(errorHandler());
  }

  return server;
};
