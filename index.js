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

function checkLoginToken(request, response, next) {
  // check if there's a SESSION cookie...
  if (request.cookies.SESSION) {
    redditAPI.getUserFromSession(request.cookies.SESSION, function(err, user) {
      if (err) {
        console.log(err);
      }
      else {
      // if we get back a user object, set it on the request. From now on, this request looks like it was made by this user as far as the rest of the code is concerned
        if (user) {
          request.loggedInUser = user;
        }
        next();
      }
      });
    }
  else {
    // if no SESSION cookie, move forward
    next();
  }
}

app.use(checkLoginToken);

// This middleware will console.log every request to your web server! Read the docs for more info!
app.use(morgan('dev'));


// Resources
app.get('/', function(request, response) {
  /*
  Your job here will be to use the RedditAPI.getAllPosts function to grab the real list of posts.
  For now, we are simulating this with a fake array of posts!
  */
  redditAPI.getAllPosts({'numPerPage': 25, 'page': 0, 'sortingMethod': 'downvotes'}, function(err, posts) {
    if (err) {
      response.sendStatus(500).send("Something went wrong. Please try again.");
    }
    else {
      console.log('posts', posts)
      response.render('post-list', {posts: posts});
    }
  });
});

  /*
  Response.render will call the Pug module to render your final HTML.
  Check the file views/post-list.pug as well as the README.md to find out more!
  */
app.get('/createPost', function(request, response) {
  response.render('create-content');
})  
  
app.post('/createPost', function(request, response) {
  // before creating content, check if the user is logged in
  if (!request.loggedInUser) {
    // HTTP status code 401 means Unauthorized
    response.status(401).send('You must be logged in to create content!');
  }
  else {
    // here we have a logged in user, let's create the post with the user!
    redditAPI.createPost({
      userId: request.loggedInUser[0].userId,
      title: request.body.title,
      url: request.body.url,
      subredditId: 1
    }, function(err, post) {
      if (err) {
        response.status(500).send('There was an error. Please try again.' + err)
      }
      else {
        response.send("Thank you!");
      }
    })
  }
})  

app.get('/login', function(request, response) {
  // code to display login form
  response.render('login-form');
});

app.post('/login', function(request, response) {
  // code to login a user
  // hint: you'll have to use response.cookie here
  redditAPI.checkLogin(request.body.username, request.body.password, function(err, user) {
    if (err) {
      response.status(400).send(err);
    }
    else {
      redditAPI.createSession(user.id, function(err, token) {
        if (err) {
          response.status(500).send('an error occurred. please try again later! ' + err);
        }
        else {
          response.cookie('SESSION', token); // the secret token is now in the user's cookies!
          response.redirect('/');
        }
      });
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
      response.status(500).send("This username is already in use."); 
    }
    else {
      response.redirect('/login');
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

