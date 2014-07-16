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

var path          = require('path');
var express       = require('express');
var path          = require('path');
var http          = require('http');
var utils         = require('ffwd-utils/server');
var _             = utils._;
var morgan        = require('morgan');
var bodyParser    = require('body-parser');
var errorHandler  = require('errorhandler');
var engines       = require('consolidate');
var socketIo      = require('socket.io');


var projectDir    = process.cwd();

var appSettings   = { appDir: projectDir };

function noopReq(req, res, next) {
  next();
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
  else {
    app.use(feature.request || noopReq);
  }
}





module.exports = function(settings) {
  settings = _.clone(settings || {});


  var app             = settings.app || express();
  var server          = settings.server || http.Server(app);
  var io              = settings.io || socketIo(server);


  app._io = io;
  app._server = server;
  server._app = app;


  _.defaults(settings, {
    port:               process.env.NODE_PORT || 3000,
    livereloadPort:     parseInt(settings.port || process.env.NODE_PORT || 3000) + 1,
    _styles:            {},
    projectDir:         projectDir,
    logLevel:           'dev',
    views:              'client/templates',
    basePath:           '/',
    staticContent:      { 'dist': '/' },
    appName:            'FFWD',

    page:               {},
    i18n:               {}
  });

  _.defaults(settings._styles, {
    importPaths: [
      path.resolve(__dirname, './../client/styles'),
      path.resolve(__dirname, './../client/bower_components/bootstrap/less')
    ],
    // filename: path.resolve(__dirname, './../client/styles/styles.less'),
    filename: 'styles.less',
    filepath: path.resolve(__dirname, './../client/styles/styles.less')
  });

  _.defaults(settings.page, {
    _links: {},
    _embedded: {},
    appName: 'FFWD',
    title: '',
    description: '',
    author: '',
    body: ''
  });

  _.defaults(settings.i18n, {
    langCode: 'en',
    langName: 'English',
    langNameEn: 'English'
  });


  
  

  appSettings = settings;


  // app.engine('hbs', engines.handlebars);
  app.engine('tpl', engines.underscore);

  app.set('view engine', 'tpl');

  app.set('port', settings.port);

  // app.set('views', path.join(projectDir, settings.views));
  app.set('views', settings.views);

  app.set('appName', settings.appName);

  // [
  //   'port',
  //   'livereloadPort',
  //   'basePath'
  // ].forEach(function() {
  //   app.set()
  // });



  _.each(settings.locals, app.locals, app);


  // serves 
  utils.staticContent(settings.staticContent, app);


  app.use(morgan(settings.logLevel));

  app.use(bodyParser.json());

  app.use(bodyParser.urlencoded({
    extended: true
  }));

  // set default value for some response locals
  app.use(function(req, res, next) {
    res.locals._embedded = {};
    res.locals._links = {};
    
    res.halLink = function(name, info) {
      if (!_.isUndefined(info)) {
        if (!info) {
          delete res.locals._links[name];
        }
        else {
          res.locals._links[name] = _.extend(res.locals._links[name] || {}, info);
        }
      }
      return res.locals._links[name];
    };

    res.halEmbedded = function(name, value) {
      if (!_.isUndefined(value)) {
        if (!value) {
          res.locals._embedded[name];
        }
        else {
          utils.atPath(res.locals._embedded, name, value);
        }
      }

      return utils.atPath(res.locals._embedded);
    };

    res.locals.i18n = _.clone(settings.i18n);
    res.locals.page = _.clone(settings.page);
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

  server.use = function() {
    app.use.apply(app, arguments);
  };



  server.on('listening', function(){
    // var clientSocket = require('socket.io-client')('http://127.0.0.1:9000');
    // // var clientSocket = require('socket.io-client')('http://jk-bx.net');

    // clientSocket.on('gh', function(ghEvName) {
    //   console.info('server - gh:'+ ghEvName);
    // });

    // clientSocket.on('gh:issues', function() {
    //   console.info('server - gh:issues', arguments);
    // });
    console.info('server is listenning on '+ app.get('port'));
  });

  console.info('port', app.get('port'));

  return server;
};
