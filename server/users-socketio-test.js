var Users          = require('./users');
var Node           = require('yarnball/core/node');
var Users_SocketIO = require('./users-socketio');
var Web_SocketIO   = require('yarnball/core/web-socketio');
var SocketIO       = require('socket.io');
var SocketIOClient = require('socket.io-client');
var express        = require('express');
var http           = require('http');
var exec           = require('child_process').exec;
var test           = require('tape');

test('users-socketio test', function(t) {
  exec('mkdir -p /tmp/yarnball-users-socketio-test/', function(err, stdout, stderr) {
    if (err) {
      t.notOk(err, 'Executing mkdir to create /tmp/yarnball-users-test/ should not output an error.');
    }
  }).on('exit', function() {
  
    var users = Users('/tmp/yarnball-users-socketio-test/db', '/tmp/yarnball-users-socketio-test/users');
    
    var app = express();
    var server = http.Server(app);
    var socketio = SocketIO(server);
    var socketioClient = null;
    var userNamespace = null;
    var connection = null;
    
    socketio.on('connect', function(connection_) {
      connection = connection_;
    });
    
    var usersSocketio = null;
    t.doesNotThrow(function() {
      usersSocketio = Users_SocketIO(users, socketio);
    }, 'users-socketio constructor does not throw.');
    
    var peach = null;
    var token = null;
    
    usersSocketio.setup().then(function() { t.ok(true, 'setup() succeeds.'); })
    
    // Start server
    .then(function() {
      return new Promise(function(resolve, reject) {
        server.listen(3001, function() {
          t.ok(true, 'socket.io server starts listening');
          resolve();
        });
      });
    })
    
    // Connect client
    .then(function() {
      return new Promise(function(resolve, reject) {
        t.ok(true, 'Start connecting..');
        socketioClient = SocketIOClient.connect('http://localhost:3001');
        socketioClient.on('connect', function() {
          t.ok(true, 'Client connected.');
          resolve();
        });
      });
    })
    
    // Create user
    .then(function() {
      return new Promise(function(resolve, reject) {
        socketioClient.emit('createUser', {username: 'peach', passwordHash: '1234'}, function(result) {
          if (typeof result === 'object' && 'error' in result) {
            t.notOk(result.error, 'createUser() should not have an error');
            reject(result.error);
          } else {
            peach = Node.fromHex(result.usernode);
            token = result.token;
            t.ok(Node.isNode(peach), 'createUser should return a node');
            resolve(result);
          }
        });
      });
    })
    
    // Open remote Web
    .then(function() {
      userNamespace = SocketIOClient.connect('http://localhost:3001/' + Node.toHex(peach), {forceNew: true, query: 'token=' + token});
      return new Promise(function(resolve, reject) {
        userNamespace.on('connect', function() {
          t.ok(true, 'user namespace connected');
          resolve();
        });
      });
    })
    .then(function() {
      var web = Web_SocketIO.Client(userNamespace);
      return new Promise(function(resolve, reject) {
        web.onSeed(function() {
          t.ok(true, 'remote web seeded');
          resolve();
        });
      });
    })
    
//     .then(function() {
//       return new Promise(function(resolve, reject) {
//         server.close(function() {
//           t.ok(true, 'server closed');
//           resolve();
//         });
//       });
//     })
    
    .catch(function(error) {
      t.ok(false, error);
    })
    
    .then(function() {
      t.end();
      
      exec('rm -r /tmp/yarnball-users-socketio-test/', function(err, stdout, stderr) {
        console.log(err);
      });
      
      process.exit();
    });
  });
});