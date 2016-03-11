var Level   = require('level');
var exec    = require('child_process').exec;
var Path    = require('path');
var Node    = require('yarnball/core/node');
var WebDB   = require('yarnball/core/web_db');
var WebFile = require('yarnball/core/web_file');
var jwt     = require('jsonwebtoken');

function Users(databasePath, userDataPath, initialLinksPath, initialNamesPath) {
  this._db = Level(databasePath);
  this._userDataPath = userDataPath;
  this._userWebs = new Map();
  this._initialLinksPath = initialLinksPath;
  this._initialNamesPath = initialNamesPath;
}

Users.isValidUsername = function(string) {
  return typeof string === 'string' && string.length > 0 && /^[a-zA-Z0-9-_]+$/.test(string);
}

Users.prototype.hasUsernode = function(usernode) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    self._db.get('usernode:' + Node.toHex(usernode), function(err, value) {
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

Users.prototype.hasUsername = function(username) {
  var self = this;
  
  if (!Users.isValidUsername(username)) {
    throw 'Cannot check if username exists, given parameter "' + username + '" is not a valid username.';
  }
  
  return new Promise(function(resolve, reject) {
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
  
  if (!Users.isValidUsername(username)) {
    throw 'Cannot create user, given parameter "' + username + '" is not a valid username.';
  }
  
  // Check if username already exists
  return self.hasUsername(username).then(function(hasUsername) {
    if (hasUsername) {
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
  return jwt.sign({usernode: Node.toHex(usernode), username: username}, Users.tokenCertificate);
}

Users.prototype.validateUserToken = function(usernode, token) {
  return new Promise(function(resolve, reject) {
    jwt.verify(token, Users.tokenCertificate, function(error, decodedToken) {
      if (error) {
        resolve(false);
      } else {
        resolve(decodedToken.usernode === Node.toHex(usernode));
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
  
  return new Promise(function(resolve, reject) {
    var userWeb = self._userWebs.get(Node.toHex(usernode));
    if (userWeb) {
      resolve(userWeb);
    } else {
      var userDir = Path.join(self._userDataPath, Node.toHex(usernode));
      exec('mkdir -p ' + userDir, function(err, stdout, stderr) {
        if (err) {
          reject('Could not get web for user "' + Node.toHex(usernode) + '", a directory could not be created at "' + userDir + '".');
        }
      }).on('exit', function() {
        var userWebDir = Path.join(userDir, 'db');
        var userWeb = WebDB(userWebDir);
        var defaultWeb = WebFile(self._initialNamesPath, self._initialLinksPath);
        userWeb.merge(defaultWeb, function() {
          self._userWebs.set(Node.toHex(usernode), userWeb);
          resolve(userWeb);
        });
      });
    }
  });
}

Users.prototype.close = function(callback) {
  this._db.close(callback);
}

function Users_(databasePath, userDataPath, initialLinksPath, initialNamesPath) {
  return new Users(databasePath, userDataPath, initialLinksPath, initialNamesPath);
}
Users_.isValidUsername  = Users.isValidUsername;
Users_.tokenCertificate = Users.tokenCertificate;
module.exports = Users_;