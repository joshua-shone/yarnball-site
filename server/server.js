var express  = require('express');
var http     = require('http');
var SocketIO = require('socket.io');
var yargs    = require('yargs');

var app = express();
var server = http.Server(app);
var socketio = SocketIO(server);

var Users          = require('./users');
var Users_SocketIO = require('./users-socketio');

if (yargs.argv['serve-static']) {
  app.use(express.static('../site'));
}

var users = Users('./users.db', './users/', './links.txt', './node_names.txt');
var users_socketio = Users_SocketIO(users, socketio);
users_socketio.setup()

.then(function() {
  server.listen(3000, function() {
    console.log('listening on port 3000');
  });
});