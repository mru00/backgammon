#!/usr/bin/env node

/**
 * Module dependencies.
 */

require('mootools');
var io = require('socket.io');

var Games = require('./game');

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080
  , ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1"
  , url  = 'http://localhost:' + port + '/';
/* We can access nodejitsu enviroment variables from process.env */
/* Note: the SUBDOMAIN variable will always be defined for a nodejitsu app */
if(process.env.SUBDOMAIN){
  url = 'http://' + process.env.SUBDOMAIN + '.jit.su/';
}

var app = express();

app.configure(function(){
  app.set('ipaddress', ip);
  app.set('port',  port);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

var server = http.createServer(app);

server.listen(app.get('port'), app.get('ipaddress'), function(){
  console.log("Express server listening on port " + app.get('port'));
  console.log(url);
});



var sio = io.listen(server);
io.set('transports', ['websocket']);
sio.sockets.on('connection' ,function(socket){
    console.log('a socket connected');
    games.create(sio);
});


var games = new Games();

