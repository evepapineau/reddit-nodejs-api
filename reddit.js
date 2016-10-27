var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;
var secureRandom = require('secure-random');

// this function creates a big random string
function createSessionToken() {
  return secureRandom.randomArray(100).map(code => code.toString(36)).join('');
}

module.exports = function RedditAPI(conn) {
  return {
    createUser: function(user, callback) {
      // first we have to hash the password...
      bcrypt.hash(user.password, HASH_ROUNDS, function(err, hashedPassword) {
        if (err) {
          console.log("erreur",err);
        }
        else {
          conn.query(
            'INSERT INTO users (username,password, createdAt) VALUES (?, ?, ?)', [user.username, hashedPassword, new Date()],
            function(err, result) {
              if (err) {
                /*
                There can be many reasons why a MySQL query could fail. While many of
                them are unknown, there's a particular error about unique usernames
                which we can be more explicit about!
                */
                if (err.code === 'ER_DUP_ENTRY') {
                  callback(new Error('A user with this username already exists'));
                }
                else {
                  callback(err);
                }
              }
              else {
                /*
                Here we are INSERTing data, so the only useful thing we get back
                is the ID of the newly inserted row. Let's use it to find the user
                and return it
                */
                conn.query(
                  'SELECT id, username, createdAt, updatedAt FROM users WHERE id = ?', [result.insertId],
                  function(err, result) {
                    if (err) {
                      callback(err);
                    }
                    else {
                      /*
                      Finally! Here's what we did so far:
                      1. Hash the user's password
                      2. Insert the user in the DB
                      3a. If the insert fails, report the error to the caller
                      3b. If the insert succeeds, re-fetch the user from the DB
                      4. If the re-fetch succeeds, return the object to the caller
                      */
                      callback(null, result[0]);
                    }
                  }
                );
              }
            }
          );
        }
      });
    },
    checkLogin: function (user, pass, cb) {
      conn.query('SELECT * FROM users WHERE username = ?', [user], function(err, result) {
        if (err) {
          cb(err);
        }
        else {
          if (result.length === 0) {
            cb(new Error('username or password incorrect'));
            // in this case the user does not exists
          }
          else {
            var user = result[0];
            var actualHashedPassword = user.password;
            bcrypt.compare(pass, actualHashedPassword, function(err, result) {
              if (err) {
                cb(err);
              }
              else {
                if(result === true) { // let's be extra safe here
                  cb(null, user);
                }
                else {
                  cb(new Error('username or password incorrect'));
                  // in this case the password is wrong, but we reply with the same error
                }
              }
            });
          }
        }
      });
    },
    createSession: function (userId, callback) {
      var token = createSessionToken();
      conn.query('INSERT INTO sessions SET userId = ?, token = ?', [userId, token], function(err, result) {
        console.log('result of insert session', result);
        if (err) {
          callback(err);
        }
        else {
          callback(null, token); // this is the secret session token :)
        }
      });
    },
    getUserFromSession: function (token, callback) {
      conn.query(`SELECT * FROM sessions WHERE token = ?`, [token], function(err, result) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, result);
        }
      }
    )},
    createPost: function (post, subredditId, callback) {
      if (!subredditId) {
        callback(new Error('subredditId is required'));
        return;
      }
      conn.query(
        'INSERT INTO posts (userId, title, url, subredditId, createdAt) VALUES (?, ?, ?, ?, ?)', [post.userId, post.title, post.url, post.subredditId, new Date()],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            Post inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT id,title, url, userId, createdAt, updatedAt FROM posts WHERE id = ?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    getAllPosts: function(options, callback) {
      // In case we are called without an options parameter, shift all the parameters manually
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      conn.query(
      `SELECT 
        posts.id AS postId, 
        posts.title AS postTitle, 
        posts.url AS postURL, 
        posts.userId AS postUserId, 
        posts.createdAt AS postCreate, 
        posts.updatedAt AS postsUpdate,
        posts.subredditId AS postsSubId,
        users.id AS userId, 
        users.username AS username, 
        users.createdAt AS userCreate, 
        users.updatedAt AS userUpdate,
        subreddits.id AS subredditsId, 
        subreddits.name AS subredditsName, 
        subreddits.description AS subredditsDesc,
        subreddits.createdAt AS subredditsCreate, 
        subreddits.updatedAt AS subredditsUpdate  
      FROM posts 
      JOIN users ON posts.userId=users.id
      JOIN subreddits ON posts.subredditId = subreddits.id
      ORDER BY posts.createdAt DESC
      LIMIT ? 
      OFFSET ?`
        , [limit, offset],
        function(err, results) {
          if (err) {
            console.log('err', err);
          }
          else {
            var newArray = results.map(function (res) {
              return {
                'id': res.postId,
                'title': res.postTitle,
                'url': res.postURL,
                'created at': res.postCreate,
                'updated at': res.postUpdate,
                'user ID': res.postUserId,
                'user': {
                  'id': res.userId,
                  'username': res.username,
                  'created at': res.userCreate,
                  'updated at': res.userUpdate
                },
                'subreddit': {
                  'id': res.subredditsId,
                  'name': res.subredditsName,
                  'description': res.subredditsDesc,
                  'created At': res.subredditsCreate,
                  'updated At': res.subredditsUpdate
                }
              };
            });
            return callback(null, newArray);
          }
        }
      );
    },
    getAllPostsForUser: function(userId, options, callback) {
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      conn.query(
      `SELECT 
        posts.id AS postId, 
        posts.title AS postTitle, 
        posts.url AS postURL, 
        posts.userId AS postUserId, 
        posts.createdAt AS postCreate, 
        posts.updatedAt AS postsUpdate, 
        users.id AS userId, 
        users.username AS username, 
        users.createdAt AS userCreate, 
        users.updatedAt AS userUpdate 
      FROM posts 
      JOIN users ON posts.userId=users.id 
      WHERE userID = ?`
        , [userId, limit, offset],
        function(err, results) {
          if (err) {
            console.log('err', err);
          }
          else {
            var newArray = results.map(function (res) {
              return {
                'id: ': res.postId,
                'title: ': res.postTitle,
                'url: ': res.postURL,
                'created at: ': res.postCreate,
                'updated at: ': res.postUpdate,
                'user ID: ': res.postUserId,
                'user: ': {
                  'id: ': res.userId,
                  'username: ': res.username,
                  'created at: ': res.userCreate,
                  'updated at: ': res.userUpdate
                }
              };
            });
            console.log(newArray);
          }
        }
      );
    },
    getSinglePost: function (postId, callback) {
      conn.query(
      `SELECT 
        posts.id AS postId, 
        posts.title AS postTitle, 
        posts.url AS postURL, 
        posts.userId AS postUserId, 
        posts.createdAt AS postCreate, 
        posts.updatedAt AS postUpdate,
        users.id AS userId, 
        users.username AS username, 
        users.createdAt AS userCreate, 
        users.updatedAt AS userUpdate 
      FROM posts 
      JOIN users 
      WHERE posts.id = ?`, [postId],
        function(err, results) {
          if (err) {
            console.log('err', err);
          }
          else {
            var newArray = {
                'id: ': results[0].postId,
                'title: ': results[0].postTitle,
                'url: ': results[0].postURL,
                'created at: ': results[0].postCreate,
                'updated at: ': results[0].postUpedate,
                'user ID: ': results[0].postUserId,
              };
          }
          console.log(newArray);
        }
      );
    },
    createSubreddit: function (sub, callback) {
      if (!sub || !sub.name) {
        callback(new Error('name is mandatory'));
        return;
      }
      conn.query(
        `INSERT INTO subreddits (name, description, createdAt, updatedAt) VALUES (? ,?, ?, ?)`, [sub.name, sub.description, new Date(), new Date()],
          function (err, result) {
            if (err) {
              if (err.code === 'ER_DUP_ENTRY') {
                callback(new Error('A subreddit with this name already exists'));
              }
              else {
                callback(err);
              }
            }
            else {
              conn.query(
              'SELECT id, name, description FROM subreddits WHERE id = ?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
              );
            }
          }
      );
    },
    getAllSubreddits: function (callback) {
      conn.query (
        `SELECT 
          subreddits.id AS subredditsId, 
          subreddits.name AS subredditsName, 
          subreddits.description AS subredditsDesc
          subreddits.createdAt AS subredditsCreate, 
          subreddits.updatedAt AS subredditsUpdate, 
        FROM subreddits 
        ORDER BY createdAt DESC`,
        function (err, result) {
          if (err) {
            callback(err);
          }
          else {
            var subList = {
              'id: ': result[0].id,
              'name: ': result[0].name,
              'description: ': result[0].description,
              'created At: ': result[0].createdAt,
              'updated At: ': result[0].updatedAt
            };
          }
          console.log(subList);
        }
      );
    },
    
  };
};
