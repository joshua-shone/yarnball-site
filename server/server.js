var express  = require('express');
var http     = require('http');
var SocketIO = require('socket.io');
var yargs    = require('yargs');

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

Users('./users.db', './users/', defaultWeb).then(function(users) {
  var users_socketio = Users_SocketIO(users, socketio);
  return users_socketio.setup();
})

.then(function() {
  server.listen(3000, function() {
    console.log('listening on port 3000');
  });
})

.catch(function(error) {
  console.error(error);
});