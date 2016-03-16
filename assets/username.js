define(function() {
  return {
    isValidUsername: function(object) {
      return typeof object === 'string' && object.length >= 4 && /^[a-zA-Z0-9-_]+$/.test(object);
    },
    getInvalidUsernameReason: function(object) {
      if (typeof object !== 'string') {
        return 'Given object is not a string.';
      }
      
      if (!/^[a-zA-Z0-9-_]+$/.test(object)) {
        return 'Contains invalid characters. Only alphanumeric, dashes and underscores are allowed.';
      }
      
      if (object.length < 4) {
        return 'Username is too short; must be 4 or more characters.';
      }
      
      return null;
    },
  }
});