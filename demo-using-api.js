// load the mysql library
var mysql = require('mysql');

// create a connection to our Cloud9 server
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'evepapineau', // CHANGE THIS :)
  password : '',
  database: 'reddit'
});

// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);

// It's request time!
redditAPI.createUser({
  username: 'evepapineau3',
  password: 'xxxx'
},  function(err, user) {
  if (err) {
    console.log(err);
  }
  else {
    redditAPI.createPost({
      title: 'hi reddit!',
      url: 'https://www.reddit.com',
      userId: user.id
    }, 7,function(err, post) {
      if (err) {
        console.log(err);
      }
      else {
        redditAPI.createSubreddit({
          name: 'bonjour',
          description: 'bla',
          userId: user.id
      }, function(err, subreddit) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(subreddit);
        }
        });
      }
    });
  }
});


// redditAPI.getAllPosts(function (err, result) {
//   if (err) {
//     console.log('error', err)
//   }
//   else {
//     console.log(result);
//   }
// });
