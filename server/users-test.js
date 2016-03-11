var Users   = require('./users');
var exec    = require('child_process').exec;
var test    = require('tape');
var Node    = require('yarnball/core/node');
var NodeSet = require('yarnball/core/node-set');

test('users test', function(t) {
  
  exec('mkdir -p /tmp/yarnball-users-test/db/', function(err, stdout, stderr) {
    if (err) {
      console.log(err);
    }
  }).on('exit', function() {
    
    // Create users object
    var users = null;
    t.doesNotThrow(function() {
      users = Users('/tmp/yarnball-users-test/db', '/tmp/yarnball-users-test/users', './server/links.txt', './server/node_names.txt');
    }, 'Calling Users() constructor should not throw.');
    
    var peach  = null;
    var meewii = null;
    
    // Check non-existant user
    users.hasUsername('non-existant-user').then(function(hasUser) {
      t.notOk(hasUser, 'Calling hasUsername() on new empty users database should return false.');
    })
    
    // Create user
    .then(function() {
      return users.createUser('peach', 'password').then(function(userNode) {
          t.ok(true, 'createUser() should succeed.');
          peach = userNode;
        },
        function(err) {
          throw 'createUser() should not throw: ' + err;
        }
      );
    })
    
    // Create user #2
    .then(function() {
      return users.createUser('meewii', 'loki').then(function(userNode) {
          t.ok(true, 'createUser() should succeed.');
          meewii = userNode;
        },
        function(err) {
          throw 'createUser() should not throw: ' + err;
        }
      );
    })
    
    // Has usernode
    .then(function() {
      return users.hasUsernode(peach).then(function(hasUsernode) {
          t.ok(hasUsernode, 'hasUsernode() should return true for a user previously returned from createUser()');
        },
        function(err) {
          throw 'hasUsernode() should not throw: ' + err;
        }
      );
    })
    
    // Has username
    .then(function() {
      return users.hasUsername('peach').then(function(hasUsername) {
          t.ok(hasUsername, 'hasUsername() should return true for a username previously given to createUser()');
        },
        function(err) {
          throw 'hasUsername() should not throw: ' + err;
        }
      );
    })
    
    // Get user by node
    .then(function() {
      return users.getUserForNode(peach).then(function(user) {
        t.equal(user.username, 'peach', 'Username in user returned from getUserForName should match the name given to createUser()');
      });
    })
    
    // Get user by name
    .then(function() {
      return users.getUserForName('meewii').then(function(user) {
        t.equal(user.username, 'meewii', 'Username in user returned from getUserForName should match the name given to createUser()');
        t.equal(user.passwordHash, 'loki', 'Password hash in user returned from getUserForName should match the password hash given to createUser()');
      });
    })
    
    // Get user web
    .then(function() {
      return users.getUserWeb(meewii).then(function(web) {
          t.ok(web, 'getUserWeb() should return a web for a user created with createUser()');
        },
        function(err) {
          throw 'getUserWeb() should not throw.';
        }
      );
    })
    
    // Get usernodes
    .then(function() {
      return users.getUsernodes().then(function(usernodes) {
          usernodes = NodeSet(usernodes);
          t.ok(usernodes.has(peach),  'getUsernodes() should return nodes previously returned by createUser()');
          t.ok(usernodes.has(meewii), 'getUsernodes() should return nodes previously returned by createUser()');
        },
        function(err) {
          throw 'getUsernames() should not throw: ' + err;
        }
      );
    })
    
    // Catch errors
    .catch(function(err) {
      t.ok(false, err);
    })
    
    // Cleanup
    .then(function() {
      t.doesNotThrow(function() {
        users.close();
      }, 'close() should not throw.');
      
      t.end();
      
      exec('rm -r /tmp/yarnball-users-test', function(err, stdout, stderr) {
        if (err) {
          console.log(err);
        }
      });
    });
  });
});