/* jshint browser: true*/
module.exports = function() {
  'use strict';
  var $ = window.jQuery;
  console.info('socket.io client initializes');

  var io = require('socket.io-client');

  var socket = io();
  var _connected;


  socket.on('connect', function() {
    console.info('socket:connect', arguments);
    if (_connected === false) {
      location.reload();
    }
    _connected = true;
  });


  socket.on('disconnect', function() {
    console.info('socket:disconnect', arguments);
    _connected = false;
  });

  socket.on('ffwd:asset', function(info) {
    console.info('socket ffwd:asset', info);
    if (info.type === 'partial') {
      var stamp = (new Date()).getTime();
      $('[href*="styles.css"]').each(function() {
        var $el = $(this);
        var href = $el.attr('href');
        $el.attr('href', href.replace(/(|&)_r_=[0-9]+/, '') +(href.indexOf('?') > -1 ? '&' : '?')+ '_r_='+ stamp);
        $(window).trigger('resize');
      });
    }
    else if (localStorage.getItem('autoreload')) {
      location.reload();
    }
    else {
      // notify user?
    }
  });

  return socket;
};
