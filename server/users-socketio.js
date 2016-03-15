var Users        = require('./users');
var Web_SocketIO = require('yarnball/core/web-socketio');
var SocketioJwt  = require('socketio-jwt');
var UnauthorizedError = require('socketio-jwt/lib/UnauthorizedError');
var Node         = require('yarnball/core/node');

function Users_SocketIO(users, socketio, log) {
  this._users    = users;
  this._socketio = socketio;
  this._userNamespaces = new Map();
  this._log = log ? log.child({object: 'users-socketio'}) : null;
}

Users_SocketIO.prototype.setup = function() {
  var self = this;
  
  if (self._log) self._log.info('Setting up users-socketio..');
  
  return self._users.getUsernodes()
  
  .then(function(usernodes) {
    if (self._log) self._log.info('Got ' + usernodes.length + ' usernodes.');
    return Promise.all(usernodes.map(function(usernode) {
      return self._createUserNamespace(usernode).then(function(userNamespace) {
        self._userNamespaces.set(Node.toHex(usernode), userNamespace);
      });
    }));
  })
  
  .then(function() {
    self._socketio.on('connection', self._onConnection.bind(self));
  })
}

Users_SocketIO.prototype._onConnection = function(connection) {
  connection.on('hasUsernode',        this._hasUsernode.bind(this));
  connection.on('hasUsername',        this._hasUsername.bind(this));
  connection.on('getUsernodeForName', this._getUsernodeForName.bind(this));
  connection.on('createUser',         this._createUser.bind(this));
  connection.on('login',              this._login.bind(this));
  connection.on('validateUserToken',  this._validateUserToken.bind(this));
}

Users_SocketIO.prototype._hasUsernode = function(usernode, callback) {
  this._users.hasUsernode(Node.fromHex(usernode))
  
  .then(function(hasUsernode) {
    callback(hasUsernode);
  })
  
  .catch(function(error) {
    callback({error: error});
  });
}

Users_SocketIO.prototype._hasUsername = function(username, callback) {
  this._users.hasUsername(username)
  
  .then(function(hasUsername) {
    callback(hasUsername);
  })
  
  .catch(function(error) {
    callback({error: error});
  });
}

Users_SocketIO.prototype._getUsernodeForName = function(username, callback) {
  this._users.getUsernodeForName(username)
  
  .then(function(result) {
    if (result) {
      callback(Node.toHex(result));
    } else {
      callback(null);
    }
  })
  
  .catch(function(error) {
    callback({error: error});
  });
}

Users_SocketIO.prototype._createUser = function(params, callback) {
  var self = this;
  
  var usernode = null;
  
  self._users.createUser(params.username, params.passwordHash)
  
  .then(function(usernode_) {
    usernode = usernode_;
    return self._createUserNamespace(usernode_);
  })
  
  .then(function(userNamespace) {
    var token = self._users.createUserToken(usernode, params.username);
    callback({usernode: Node.toHex(usernode), token: token});
  })
  
  .catch(function(error) {
    callback({error: error});
  });
}

Users_SocketIO.prototype._login = function(params, callback) {
  var self = this;
  
  self._users.getUserForName(params.username)
  
  .then(function(user) {
    if (params.passwordHash !== user.passwordHash) {
      throw 'Invalid username/password.';
    }
    
    var token = self._users.createUserToken(user.usernode);
    callback({usernode: Node.toHex(user.usernode), username: user.username, token: token});
  })
  
  .catch(function(error) {
    callback({error: 'Invalid username/password.'});
  });
}

Users_SocketIO.prototype._createUserNamespace = function(usernode) {
  var self = this;
  
  if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'Creating socketio namespace for usernode..');
  
  return self._users.getUserWeb(usernode).then(function(userWeb) {
    if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'Got user web for usernode.');
    
    var namespace = self._socketio.of('/' + Node.toHex(usernode));
    
    namespace.use(SocketioJwt.authorize({
      secret: Users.tokenCertificate,
      handshake: true,
      success: function(data, accept) {
        if (data.decoded_token.usernode !== Node.toHex(usernode)) {
          if (self._log) self._log.info({usernode: Node.toHex(usernode), remoteAddress: data.handshake.address}, 'Client authorized only for user "' + data.decoded_token.username + '" attempted to connect to user "' + Node.toHex(usernode) + '".');
          accept(new UnauthorizedError('not_authorized_for_user', {message: 'Not authorized for this user.'}));
        } else {
          if (self._log) self._log.info({usernode: Node.toHex(usernode), remoteAddress: data.handshake.address}, 'Client authorized for user socketio namespace.');
          accept();
        }
      },
    }));
    
    namespace.on('connection', function(connection) {
      if (self._log) self._log.info({usernode: Node.toHex(usernode), remoteAddress: connection.handshake.address}, 'Client connected to user socketio namespace.');
      var webServer = Web_SocketIO.Server(connection, userWeb);
    });
    
    namespace.on('error', function(error) {
      if (self._log) self._log.warn({usernode: Node.toHex(usernode), error: error}, 'An error occurred on a socketio user namespace.');
    });
    
    return namespace;
  });
}

Users_SocketIO.prototype._validateUserToken = function(params, callback) {
  if (!('usernode' in params)) {
    callback({error: 'Cannot valididate token, usernode not given.'});
    return;
  }
  
  this._users.validateUserToken(Node.fromHex(params.usernode), params.token)
  
  .then(function(isValid) {
    callback(isValid);
  })
  
  .catch(function(error) {
    callback({error: error});
  });
}

module.exports = function(users, socketio, log) {
  return new Users_SocketIO(users, socketio, log);
}