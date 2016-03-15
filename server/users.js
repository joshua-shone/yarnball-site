var Level   = require('level');
var exec    = require('child_process').exec;
var Path    = require('path');
var Node    = require('yarnball/core/node');
var WebDB   = require('yarnball/core/web_db');
var jwt     = require('jsonwebtoken');

function Users(options) {
  this._db           = options.database;
  this._userDataPath = options.userDataPath;
  this._defaultWeb   = options.defaultWeb;
  this._log          = options.log;
  this._userWebs = new Map();
}

Users.isValidUsername = function(string) {
  return typeof string === 'string' && string.length > 0 && /^[a-zA-Z0-9-_]+$/.test(string);
}

Users.prototype.hasUsernode = function(usernode) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    if (self._log) self._log.info({node: Node.toHex(usernode)}, 'Checking if usernode exists..');
    self._db.get('usernode:' + Node.toHex(usernode), function(err, value) {
      if (err && err.type === 'NotFoundError') {
        if (self._log) self._log.info({node: Node.toHex(usernode)}, 'Usernode not found in database.');
        resolve(false);
      } else if (!err) {
        if (self._log) self._log.info({node: Node.toHex(usernode)}, 'Usernode found in database.');
        resolve(true);
      } else if (err) {
        if (self._log) self._log.error(err, 'An error occurred while checking if a usernode exists.');
        reject(err);
      }
    });
  });
}

Users.prototype.hasUsername = function(username) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    if (self._log) self._log.info({username: username}, 'Checking if username exists..');
    if (!Users.isValidUsername(username)) {
      throw 'Cannot check if username exists, given parameter "' + username + '" is not a valid username.';
    }
    self._db.get('username:' + username, function(err, value) {
      if (err && err.type === 'NotFoundError') {
        resolve(false);
      } else if (!err) {
        resolve(true);
      } else if (err) {
        reject(err);
      }
    });
  });
}

Users.prototype.getUsernodeForName = function(username) {
  var self = this;
  
  if (!Users.isValidUsername(username)) {
    throw 'Cannot get usernode for name, given parameter "' + username + '" is not a valid username.';
  }
  
  return new Promise(function(resolve, reject) {
    self._db.get('username:' + username, function(err, value) {
      if (err && err.type === 'NotFoundError') {
        resolve(null);
      } else if (!err) {
        resolve(Node.fromHex(value));
      } else if (err) {
        reject(err);
      }
    });
  });
}

Users.prototype.createUser = function(username, passwordHash) {
  var self = this;
  
  if (self._log) self._log.info({username: username}, 'User creation requested.');
  
  if (!Users.isValidUsername(username)) {
    if (self._log) self._log.warn({username: username}, 'Cannot create user, username is invalid.');
    throw 'Cannot create user, given parameter "' + username + '" is not a valid username.';
  }
  
  // Check if username already exists
  return self.hasUsername(username).then(function(hasUsername) {
    if (hasUsername) {
      if (self._log) self._log.warn({username: username}, 'Cannot create user, username already exists.');
      throw 'Cannot create user, a user with username "' + username + '" already exists.';
    }
  })
  
  // Create node entry
  .then(function() {
    var userNode = Node();
    
    return new Promise(function(resolve, reject) {
      var user = {
        usernode: Node.toHex(userNode),
        username: username,
        passwordHash: passwordHash
      }
      self._db.batch(
        [
          {type: 'put', key: 'usernode:' + Node.toHex(userNode), value: JSON.stringify(user)},
          {type: 'put', key: 'username:' + username,             value: Node.toHex(userNode)},
        ],
        function(error) {
          if (error) {
            reject(error);
          } else {
            resolve(userNode);
          }
        }
      );
    });
  });
}

Users.prototype.getUserForNode = function(usernode) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    self._db.get('usernode:' + Node.toHex(usernode), function(err, value) {
      if (err) {
        if (err.type === 'NotFoundError') {
          reject('Could not find user for node "' + Node.toHex(usernode) + '".');
        } else {
          reject('Could not get user for node "' + Node.toHex(usernode) + '": ' + err);
        }
      } else {
        var user = JSON.parse(value);
        user.usernode = Node.fromHex(user.usernode);
        resolve(user);
      }
    });
  });
}

Users.prototype.getUserForName = function(username) {
  var self = this;
  
  if (!Users.isValidUsername(username)) {
    throw 'Cannot get user for name, given parameter "' + username + '" is not a valid username.';
  }
  
  return new Promise(function(resolve, reject) {
    self._db.get('username:' + username, function(err, value) {
      if (err) {
        if (err.type === 'NotFoundError') {
          reject('Could not find user for name "' + username + '".');
        } else {
          reject('Could not find user for name "' + username + '": ' + err);
        }
      } else {
        resolve(Node.fromHex(value));
      }
    });
  })
  
  .then(function(usernode) {
    return self.getUserForNode(usernode);
  });
}

// TODO: Read certificate from file
Users.tokenCertificate = '6914ecfd13cc057282142ee36e9f736a';

Users.prototype.createUserToken = function(usernode, username) {
  if (this._log) this._log.info({usernode: Node.toHex(usernode), username: username}, 'Creating user token..');
  return jwt.sign({usernode: Node.toHex(usernode), username: username}, Users.tokenCertificate);
}

Users.prototype.validateUserToken = function(usernode, token) {
  var self = this;
  if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'Validating user token..');
  return new Promise(function(resolve, reject) {
    jwt.verify(token, Users.tokenCertificate, function(error, decodedToken) {
      if (error) {
        if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'User token found to be invalid.');
        resolve(false);
      } else {
        if (decodedToken.usernode === Node.toHex(usernode)) {
          if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'User token found to be valid, and belonging to the given user.');
          resolve(true);
        } else {
          if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'User token found to be valid, but belonging to a different user.');
          resolve(false);
        }
      }
    });
  });
}

Users.prototype.getUsernodes = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var usernodes = [];
    self._db.createReadStream()
      .on('data', function(data) {
        if (data.key.startsWith('usernode:')) {
          usernodes.push(Node.fromHex(data.key.slice('usernode:'.length)));
        }
      })
      .on('end', function() {
        resolve(usernodes);
      })
      .on('close', function() {
        resolve(usernodes);
      })
      .on('error', function(err) {
        reject(err);
      });
  });
}

Users.prototype.getUserWeb = function(usernode) {
  var self = this;
  
  if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'Getting user web..');
  
  // Get if already exists
  var userWeb = self._userWebs.get(Node.toHex(usernode));
  if (userWeb) {
    if (self._log) self._log.info({usernode: Node.toHex(usernode)}, 'Returning already existing handle to user web.');
    return Promise.resolve(userWeb);
  }
  
  // Ensure user directory exists
  return new Promise(function(resolve, reject) {
    var userDir = Path.join(self._userDataPath, Node.toHex(usernode));
    if (self._log) self._log.info({usernode: Node.toHex(usernode), userDir: userDir}, 'Ensuring user directory exists..');
    exec('mkdir -p ' + userDir, function(err, stdout, stderr) {
      if (err) {
        reject('Could not get web for user "' + Node.toHex(usernode) + '", a directory could not be created at "' + userDir + '".');
      }
    }).on('exit', function() {
      var userDbPath = Path.join(userDir, 'db');
      if (self._log) self._log.info({usernode: Node.toHex(usernode), userDir: userDir, userDbPath: userDbPath}, 'User directory ready');
      resolve(userDbPath);
    });
  })
  
  // Create web db and merge default web
  .then(function(userWebDir) {
    if (self._log) self._log.info({usernode: Node.toHex(usernode), userWebDir: userWebDir}, 'Initializing user web db interface..');
    var userWeb = WebDB(userWebDir);
    if (self._log) self._log.info({usernode: Node.toHex(usernode), userWebDir: userWebDir}, 'Merging default web..');
    return userWeb.merge(self._defaultWeb).then(function() {
      if (self._log) self._log.info({usernode: Node.toHex(usernode), userWebDir: userWebDir}, 'Default web merged.');
      self._userWebs.set(Node.toHex(usernode), userWeb);
      return userWeb;
    })
  });
}

Users.prototype.close = function(callback) {
  this._db.close(callback);
}

function Users_(options) {
  options.log = options.log.child({databasePath: options.databasePath, userDataPath: options.userDataPath});
  if (options.log) options.log.info('Creating Users object..');
  if (options.log) options.log.info('Opening users database..');
  return new Promise(function(resolve, reject) {
    Level(options.databasePath, {}, function(error, database) {
      if (error) {
        reject(error);
      } else {
        if (options.log) options.log.info('Users database opened.');
        options.database = database;
        resolve(new Users(options));
      }
    });
  });
}
Users_.isValidUsername  = Users.isValidUsername;
Users_.tokenCertificate = Users.tokenCertificate;
module.exports = Users_;