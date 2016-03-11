define(['socket.io-client/socket.io'], function(SocketIO) {
  return {
    hasSession: function() {
      return 'userSession' in window.localStorage;
    },
    getSession: function() {
      return window.localStorage.getItem('userSession');
    },
  }
});