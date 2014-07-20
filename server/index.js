/* jshint node: true */
'use strict';

/**
 * @namespace ffwd
 */

/**
 * @namespace ffwd.net/server
 */

var fs              = require('fs');
var path            = require('path');
var express         = require('express');
var path            = require('path');
var http            = require('http');
var utils           = require('ffwd-utils/server');
var _               = utils._;
// var morgan          = require('morgan');
var bodyParser      = require('body-parser');
// var methodOverride  = require('method-override');
// var cookieParser    = require('cookie-parser');
var session         = require('express-session');
var errorHandler    = require('errorhandler');
var engines         = require('consolidate');
var socketIo        = require('socket.io');
var projectDir      = process.cwd();

var debug = utils.debug('ffwd-net');

function useFeature(app, feature, name) {
  debug('use feature %s (%s)', name, typeof feature);
  if (_.isArray(feature)) {
    if (_.isString(feature[0]) || _.isFunction(feature[0])) {
      return app.use.apply(app, feature);
    }

    return _.each(feature, function(feat) {
      useFeature(app, feat, name);
    });
  }
  else {
    app.use(feature.request || utils.noopNext);
  }
}




/**
 * Map paths to static content, must be called before the server starts listening
 * @param  {Object} conf
 * @param  {String} [conf.projectDir]
 * @param  {String} [conf.partialReloadExts]
 * @param  {String} [conf.fullReloadExts]
 * @param  {Boolean} [conf.watch]
 * @param  {Express.Application} app
 */
utils.staticContent = function(conf, app) {
  _.defaults(conf, {
    projectDir: process.cwd(),
    partialReloadExts: 'css,jpg,png,webp,gif,json,eot,ttf,woff,svg',
    fullReloadExts: 'js,tpl,html,md'
  });

  var reload = {
    full: [],
    partial: []
  };

  var full        = _.isArray(conf.fullReloadExts) ?
                        conf.fullReloadExts.join(',') :
                        conf.fullReloadExts;
  var fullExp     = new RegExp('('+ full.split(',').join('|') +')$', 'i');

  var partial     =  _.isArray(conf.partialReloadExts) ?
                        conf.partialReloadExts.join(',') :
                        conf.partialReloadExts;
  var partialExp  = new RegExp('('+ partial.split(',').join('|') +')$', 'i');

  debug('static content', Object.keys(conf.staticContent));

  _.each(conf.staticContent || {}, function(route, dir) {
    // support object as 2nd arg?
    // var target = path.join(conf.projectDir, dir);
    var target = dir;// path.relative(dir, conf.projectDir);


    var stats, isDirectory;
    try {
      stats = fs.statSync(target);
      isDirectory = stats.isDirectory();
    } catch(err) {}

    if (isDirectory) {
      debug('static directory %s, watched %s', target, conf.watch !== false);
      if (conf.watch !== false) {
        reload.partial.push(target +'/**/*.{'+ partial +'}');
        reload.full.push(target +'/**/*.{'+ full +'}');
      }

      app.use(route, express.static(target));
    }
    else if (stats) {
      debug('static file %s, watched %s', target, conf.watch !== false);
      if (conf.watch !== false) {
        if (fullExp.test(target)) {
          reload.full.push(target);
        }
        else if (partialExp.test(target)) {
          reload.partial.push(target);
        }
      }

      app.use(route, function(req, res) {
        // log?
        res.sendfile(target);
      });
    }
    else {
      debug('nothing to be watch %s', target);
    }
  });

  if (conf.watch === false) {
    return;
  }

  var watched = {};
  var lastchanges = {};

  function watch(type, file) {
    if (watched[file]) {
      return;
    }
    watched[file] = type;

    fs.watch(file, function(ev) {
      // prevent reloading during 50ms
      var now = (new Date()).getTime();
      var lasttime = now - (lastchanges[file] || 0);
      if (lasttime < 50) {
        return;
      }
      lastchanges[file] = now;
      debug('static file change %s', file, lasttime);

      app._io.sockets.emit('ffwd:asset', {
        event: ev,
        type: type,
        file: file
      });

      delete watched[file];
      watch(type, file);
    });
  }

  // debug('watch', reload);
  _.each(reload, function(r, type) {
    _.each(_.map(r, function(globpath) {
      return utils.glob.sync(globpath);
    }), function(files) {
      _.each(files, function(file) {
        watch(type, file);
      });
    });
  });
};




/**
 * @module ffwd-net
 * @memberof ffwd
 * @name net/server
 * @type {Function}
 * @param  {Object} settings
 * @return {Object}
 */
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
    logLevel:           'development',
    environement:       'development',
    views:              'client/templates',
    basePath:           '/',
    staticContent:      { 'dist': '/' },
    appName:            'FFWD',

    page:               {},
    i18n:               {},

    session: {}
  });

  _.defaults(settings.page, {
    _links: {},
    _embedded: {
      // ???
      // app: {
      // }
    },

    appName: settings.appName,
    basePath: settings.basePath,
    googleAnalyticsUA: '',

    title: '',
    description: '',
    author: '',
    header: '',
    footer: ''
  });

  _.defaults(settings.i18n, {
    langCode: 'en',
    langName: 'English',
    langNameEn: 'English'
  });

  _.defaults(settings.session, {
    name: process.env.APP_SESSION_NAME || 'ffwd.sid',
    secret: process.env.APP_SESSION_SECRET || '1ns3cur3',
    resave: false,
    saveUninitialized: false,
  });

  app.set('env', settings.environement);
  app.set('basePath', settings.basePath);
  app.disable('x-powered-by');


  // app.engine('hbs', engines.handlebars);
  app.engine('tpl', engines.underscore);

  app.set('view engine', 'tpl');

  app.set('port', settings.port);

  app.set('views', path.join(projectDir, settings.views));
  // app.set('views', settings.views);

  app.set('appName', settings.appName);


  // serves almost static
  utils.staticContent(settings, app);


  // app.use(morgan(settings.logLevel));

  // app.use(cookieParser(process.env.COOKIE_SECRET || '1ns3cur3'));
  app.use(bodyParser.json());

  app.use(bodyParser.urlencoded({
    extended: true
  }));

  debug('use session? %s', settings.session.enabled !== false);//, settings.session);
  if (settings.session.enabled !== false) {
    app.use(session({
      name: settings.session.name,
      secret: settings.session.secret,

      resave: settings.session.resave,
      saveUninitialized: settings.session.saveUninitialized,

      // cookie: {
      //   path: '/',
      //   httpOnly: true,
      //   secure: false,
      //   // maxAge: 60 * 60 * 24 * 10 * 1000
      // },

      store: new (require('./memory'))(app)
    }));
  }

  var _partials = {};

  function partial(tmplName, vars) {
    var tmplPath = app.get('views') +'/partials/'+ tmplName +'.tpl';
    var tmplStr, tmpl;
    // debug('render partial "%s", cached? %s', tmplName, !(!_partials[tmplName] || settings.partialsCache === false));
    try {
      if (!_partials[tmplName] || settings.partialsCache === false) {
        tmplStr = fs.readFileSync(tmplPath, { encoding: 'utf8' });
        tmpl = _.template(tmplStr);
        _partials[tmplName] = tmpl;
      }
      else {
        tmpl = _partials[tmplName];
      }
    }
    catch (err) {
      debug('rendering partial %s error %s', tmplName, err.stack);
      return '<rendering-error template="'+ tmplName +'"><!-- '+
        err.stack +
        '\n------\n' +
        tmpl +
        ' --></rendering-error>';
    }

    vars = _.extend({
      partial: partial
    }, vars);

    return tmpl(vars);
  }


  // set default value for some response locals
  app.use(function(req, res, next) {
    debug('has sessionID? %s', req.sessionID);

    res.locals._embedded = {};
    res.locals._links = {};

    function resPartial(name, vars) {
      vars = vars || {};
      // debug('resPartial %s', name, Object.keys(vars));
      _.extend(vars, res.locals);
      return partial(name, vars);
    }
    res.locals.partial = resPartial;
    res.renderPartial = resPartial;

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
      utils.atPath(res.locals._embedded, name, value);
      return utils.atPath(res.locals._embedded, name);
    };

    res.locals.i18n = _.clone(settings.i18n);
    res.locals.page = _.clone(settings.page);
    next();
  });

  // if used, should be here
  // app.use(methodOverride());

  // we attach the features to the app too!
  var features = app.features = utils.loadFeatures(settings.features, {
    subject: app.features,
    app: app
  });

  // var copy = _.clone(settings);
  // compile the settings
  _.each(features, function(feature, name) {
    useFeature(app, feature, name);

    _.each(['routes', 'params', 'locals'], function(prop) {
      debug('register %s %s', name, prop);//, feature[prop]);
      settings[prop] = _.extend(settings[prop] || {}, feature[prop] || {});
    });
  });

  // http://expressjs.com/4x/api.html#app.param
  _.each(settings.params, function(callback, name) {
    debug('register param %s', name);
    app.param(name, callback);
  });

  // @see ffwd-utils/server.requestCbBuilder
  _.forEach(settings.routes || {}, function(routes, route) {
    debug('mapping route %s', route, routes);
    _.forEach(routes, function(steps, method) {
      app.route(route)[method](utils.requestCbBuilder(steps, app));
    });
  });

  // http://expressjs.com/4x/api.html#app.locals
  _.extend(app.locals, settings.locals || {});

  // app.use(app.router);

  debug('environement %s', app.get('env'));
  if (app.get('env') === 'development') {
    app.use(errorHandler());
  }

  // needed for grunt-express compatibility
  server.use = function() {
    app.use.apply(app, arguments);
  };

  server.on('listening', function(){
    debug('server is listening', server._connectionKey);
  });

  return server;
};



/**
 * @namespace Express
 * @typedef {Express} Express
 *
 * Have a look at express.js
 *
 * @link{express.js http://expressjs.com}
 *
 */

/**
 * @memberOf Express
 * @typedef {Application} Express.Application
 * http://expressjs.com/4x/api.html#express
 */

/**
 * @memberOf Express
 * @typedef {Request} Express.Request
 * http://expressjs.com/4x/api.html#request
 */

/**
 * @memberOf Express
 * @typedef {Response} Express.Response
 * http://expressjs.com/4x/api.html#response
 */

/**
 * @memberOf Express
 * @typedef {Router} Express.Router
 * http://expressjs.com/4x/api.html#router
 */

/**
 * @memberOf Express
 * @typedef {Middleware} Express.Middleware
 * http://expressjs.com/4x/api.html#middleware
 */
