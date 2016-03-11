// Allow this AMD module to be loaded in Node.js
// See https://www.npmjs.com/package/amdefine
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(['core/node', 'core/batch', 'core/web', 'core/node-set'], function(Node, Batch, Web, NodeSet) {
  
  var User    = Node.fromHex('638fef14d56459472fa44a7088afec92');
  var Is      = Node.fromHex('52f9cf0e223d559931856acc98400f21');
  var Owns    = Node.fromHex('4c8e8ee79a2c4c6e4bd68d9db324d9f4');
  var Surface = Node.fromHex('d78f5b59815a669cb45c022de57d2980');
  
  function UserWeb(web, user) {
    
    if (!web) {
      throw 'Cannot create user-web, source web not given.';
    }
    
    this._web  = web;
    if (!user) {
      this._user = Node();
      web.setLinks([{from: this._user, via: Is, to: User}], []);
    } else {
      this._user = user;
      this._surfaces = this._getSurfaces();
    }
    this._onSurfaces = new Set();
  }
  
  UserWeb.prototype.getSurfaces = function() {
    return NodeSet(this._surfaces);
  }
  
  UserWeb.prototype._getSurfaces = function() {
    var self = this;
    var userOwnedObjects = self._web.query(self._user, Owns, null);
    return NodeSet(userOwnedObjects.filter(function(object) {
      return self._web.hasLink(object, Is, Surface);
    }));
  }
  
  UserWeb.prototype.addSurface = function(surface) {
    this._web.setLinks([
      {from: this._user, via: Owns, to: surface},
    ], []);
  }
  
  UserWeb.prototype.removeSurface = function(surface) {
    this._web.setLinks([], [
      {from: this._user, via: Owns, to: surface},
    ]);
  }
  
  UserWeb.prototype.onSurfaces = function(callback) {
    if (this._onSurfaces.size === 0) {
      this._web.onLinks(this._onLinks.bind(this));
    }
    this._onSurfaces.add(callback);
  }
  
  UserWeb.prototype._notifySurfaces = function(added, removed) {
    Array.from(this._onSurfaces).forEach(function(callback) {
      callback(added, removed);
    });
  }
  
  
  UserWeb.prototype._onLinks = function(added, removed) {
    var self = this;
    
    var addedWeb = Web();
    addedWeb.setLinks(added, []);
    var newObjects = addedWeb.query(self._user, Owns, null);
    var newSurfaces = newObjects.filter(function(newObject) {
      if (self._web.hasLink(newObject, Is, Surface)) {
        self._surfaces.add(newObject);
        return true;
      } else {
        return false;
      }
    });
    
    var removedWeb = Web();
    removedWeb.setLinks(removed, []);
    var removedObjects = removedWeb.query(self._user, Owns, null);
    removedObjects.addSet(removedWeb.query(null, Is, Surface));
    var removedSurfaces = removedObjects.filter(function(removedObject) {
      if (self._surfaces.has(removedObject)) {
        self._surfaces.delete(removedObject);
        return true;
      } else {
        return false;
      }
    });
    
    if (newSurfaces.size() > 0 || removedSurfaces.size() > 0) {
      self._notifySurfaces(newSurfaces, removedSurfaces);
    }
  }
  
  return function(web, user) {
    return new UserWeb(web, user);
  }
});