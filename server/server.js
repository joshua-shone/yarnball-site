var express  = require('express');
var http     = require('http');
var SocketIO = require('socket.io');
var yargs    = require('yargs');
var bunyan   = require('bunyan');

var log = bunyan.createLogger({
  name: 'yarnball-site',
  streams: [
    {
      stream: process.stdout,
      level: 'info',
    },
    {
      stream: process.stderr,
      level: 'error',
    },
    {
      type: 'rotating-file',
      path: 'logs/server.log',
      level: 'info',
      count: 4,
    }
  ],
});

var app = express();
var server = http.Server(app);
var socketio = SocketIO(server);

var WebFile        = require('yarnball/core/web_file');
var Users          = require('./users');
var Users_SocketIO = require('./users-socketio');

if (yargs.argv['serve-static']) {
  app.use(express.static('.'));
}

var defaultWeb = WebFile({namesPath: './node_names.txt', linksPath: './links.txt'});

log.info('Setting up users..');
Users({
  databasePath: './users.db',
  userDataPath: './users/',
  defaultWeb: defaultWeb,
  log: log.child({object: 'Users'}),
}).then(function(users) {
  log.info('Setting up users socketio..');
  var users_socketio = Users_SocketIO(users, socketio, log);
  return users_socketio.setup();
})

.then(function() {
  log.info('Users ready.');
  
  var port = 3000;
  log.info({port: port}, 'Start listening..');
  server.listen(port, function() {
    log.info({port: port}, 'Now listening.');
  });
})

.catch(function(error) {
  log.error(error);
});