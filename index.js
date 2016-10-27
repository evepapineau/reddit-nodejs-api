// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var app = express();
var mysql = require('mysql');
var bcrypt = require('bcrypt');
app.set('view engine', 'pug');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'evepapineau', 
  password : '',
  database: 'reddit'
});

var reddit = require('./reddit');
var redditAPI = reddit(connection);

// Middleware
// This middleware will parse the POST requests coming from an HTML form, and put the result in req.body.  Read the docs for more info!
app.use(bodyParser.urlencoded({extended: false}));

// This middleware will parse the Cookie header from all requests, and put the result in req.cookies.  Read the docs for more info!
app.use(cookieParser());

// This middleware will console.log every request to your web server! Read the docs for more info!
app.use(morgan('dev'));

/*
IMPORTANT!!!!!!!!!!!!!!!!!
Before defining our web resources, we will need access to our RedditAPI functions.
You will need to write (or copy) the code to create a connection to your MySQL database here, and import the RedditAPI.
Then, you'll be able to use the API inside your app.get/app.post functions as appropriate.
*/

// Resources
app.get('/', function(request, response) {
  /*
  Your job here will be to use the RedditAPI.getAllPosts function to grab the real list of posts.
  For now, we are simulating this with a fake array of posts!
  */
  redditAPI.getAllPosts({'numPerPage': 25, 'page': 0}, function(err, posts) {
    if (err) {
      response.sendStatus(500);
    }
    else {
      console.log(posts)
      response.render('post-list', {posts: posts});
    }
  });
});

  /*
  Response.render will call the Pug module to render your final HTML.
  Check the file views/post-list.pug as well as the README.md to find out more!
  */

app.get('/login', function(request, response) {
  // code to display login form
  response.render('login-form');
});

app.post('/login', function(request, response) {
  // code to login a user
  // hint: you'll have to use response.cookie here
  redditAPI.checkLogin({'username': request.body.username}, {'password': request.body.password}, function(err, result) {
    if (err) {
      response.sendStatus(400);
    }
    else {
      console.log(result);
      //response.send(result);
      /*
      1. generate session
      2. send cookie with session token
      3. redirect to homepage
      */
    }
  })
});

app.get('/signup', function(request, response) {
  // code to display signup form
  response.render('signup-form');
});

app.post('/signup', function(request, response) {
  // code to signup a user
  // ihnt: you'll have to use bcrypt to hash the user's password
  redditAPI.createUser({'username': request.body.username, 'password': request.body.password}, function(err){
    if (err) {
      response.sendStatus(400); //erreur est ici
    }
    else {
      response.redirect('/');
    }
  })
});

app.post('/vote', function(request, response) {
  // code to add an up or down vote for a content+user combination
});


// Listen
var port = process.env.PORT || 3000;
app.listen(port, function() {
  // This part will only work with Cloud9, and is meant to help you find the URL of your web server :)
  if (process.env.C9_HOSTNAME) {
    console.log('Web server is listening on https://' + process.env.C9_HOSTNAME);
  }
  else {
    console.log('Web server is listening on http://localhost:' + port);
  }
});

