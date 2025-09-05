var express = require('express');
var path = require('path');
// var cookieParser = require('cookie-parser');
var logger = require('morgan');
// var cookieSession = require('cookie-session');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var app = express();

// app.set('env', 'development');
app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use(cookieSession({ secret: 'shhh' }));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

module.exports = app;
