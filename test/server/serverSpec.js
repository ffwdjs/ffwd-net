var _ = require('ffwd-utils')._;
var expect = require('expect.js');
var request = require('supertest');

function paramCb(req, res, next, val) {
  req.name = val;
  next();
}

function paramReqCb(req, res, next) {
  res.send('Hello '+ req.name +'!');
}

function noopCb(req, res, next) {
  res.send('Hello world!');
}

var cwd = process.cwd();
function stackPutz(err) {
  console.warn((''+err.stack).split(cwd).join('.'));
}

      
var counter = 0;
function addCounter(req, res, next) {
  counter++;
  // console.info('counting...', counter);
  next();
}

function sayHello(who) {
  return function(req, res, next) {
    console.info('res.send', res.send);
    expect(res.locals).to.have.keys([
      'language',
      'title',
      'description'
    ]);
    res.send(who +' says hello!');
  }
}

function feat1() {
  return {
    request: addCounter,
    routes: {
      '/': {
        get: sayHello('feat1')
      },
      '/feat1': {
        get: sayHello('feat1')
      },
      '/that-blows': {
        get: function() {
          throw new Error('Boom!');
        }
      }
    }
  };
}

function feat2() {
  return {
    request: addCounter,
    routes: {
      '/': {
        get: sayHello('feat2')
      },
      '/that-blows-too': {
        get: function(req, res, next) {
          next(new Error('Bang!'));
        }
      }
    },
  };
}








describe('The web server', function() {
  var app, server;
  describe('module', function() {
    it('loads', function() {
      expect(function() {
        server = require('ffwd-net/server');
      }).not.to.throwError(stackPutz);

      expect(server).to.be.a('function');
    });
  });


  describe('initialization', function() {
    it('takes an object', function() {
      expect(function() {
        app = server({
          routes: {
            '/': {
              get: noopCb
            },
            '/test': {
              get:  noopCb,
              post: noopCb
            },
            '/test/:thingId': {
              get:  paramReqCb
            }
          },
          params: {
            'thingId': paramCb
          }
        });
      }).not.to.throwError(stackPutz);
    });


    it('serves /', function(done) {
      request(app)
        .get('/')
        .expect(200, function(err, res) {
          // console.info('response', res.text);
          expect(res.text).to.be('Hello world!');
          done(err)
        });
    });


    it('serves /test/param', function(done) {
      request(app)
        .get('/test/param')
        .expect(200, function(err, res) {
          // console.info('response', res.text);
          expect(res.text).to.be('Hello param!');
          done(err);
        });
    });


    describe('features usage', function() {
      var featuredApp;

      function initialize() {
        featuredApp = server({
          env: 'dev',

          features: {
            feat1: feat1,
            feat2: feat2
          }
        });
      }

      
      it('initializes', function() {
        expect(initialize).not.to.throwError(stackPutz);
      });


      it('serves GET /', function(done) {
        request(featuredApp)
          .get('/')
          .expect('feat2 says hello!')
          .expect(200, function(err, res) {
            if (err) { return done(err); }

            expect(counter).to.be(2);

            done();
          });
      });

      
      it('serves GET /feat1', function(done) {
        request(featuredApp)
          .get('/feat1')
          .expect('feat1 says hello!')
          .expect(200, function(err, res) {
            if (err) { return done(err); }

            expect(counter).to.be(4);

            done();
          });
      });

      
      it('does not serve everything', function(done) {
        request(featuredApp)
          .get('/that-does-not-exists')
          .expect(404, function(err, res) {
            if (err) { return done(err); }

            expect(counter).to.be(6);

            done();
          });
      });


      xit('shows stacktrace in development mode', function(done) {
        request(featuredApp)
          .get('/that-blows')
          .expect(/Boom/)
          .expect(500, done);
      });


      xit('shows stacktrace in development mode', function(done) {
        request(featuredApp)
          .get('/that-blows-too')
          .expect(/Bang/)
          .expect(500, done);
      });
    });
  });
});