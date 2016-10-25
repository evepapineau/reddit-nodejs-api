var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser = require('body-parser');
app.set('view engine', 'pug');

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

// //exercise 1
app.get('/hello', function (req, res) {
  res.send('<h1>Hello World!</h1>');
});

//exercise 2A
app.get('/hello', function (req, res){
     var name = req.query.name;
     res.send(`<h1>Hello ${name}!</h1>`)
})

//exercise 2B
app.get('/hello/:name', function (req, res){
     var name = req.params.name;
     res.send(`<h1>Hello ${name}!</h1>`)
})

//exercise 3
app.get('/calculator/:operation', function (req, res){
    var operation = req.params.operation;
    var myObj = {
        "operator: ": operation,
        "firstOperand: ": parseInt(req.query.num1),
        "secondOperand: ": parseInt(req.query.num2),
        }
        if (operation === "add") {
        myObj.solution= myObj.firstOperand + myObj.secondOperand;
        }
        else if (operation === "sub") {
        myObj.solution= myObj.firstOperand - myObj.secondOperand;
        }
        else if (operation === "mult") {
        myObj.solution= myObj.firstOperand * myObj.secondOperand;
        }
        else if (operation === "div") {
        myObj.solution= myObj.firstOperand / myObj.secondOperand;
        }
        else {
            res.sendStatus(400);
        }
    res.send(myObj);
})

//exercise 4
app.get('/posts', function (req, res) {
    redditAPI.getAllPosts({'numPerPage': 5, 'page': 0}, function (err, posts) {
        if (err) {
            res.status(500);
        }
        else {
            console.log(posts.url)
            res.render('post-list', {posts: posts})
        }
    }) 
});

//exercise 5
app.get('/createContent', function (req, res) {
        res.render('create-content');
});

//exercise 6
app.use(bodyParser());

app.post('/createContent', function(request, response) {
    var url = request.body.url;
    var title = request.body.title;
    redditAPI.createPost({title: request.body.title, url: request.body.url, userId: 1}, 4, function(err, post) {
        if (err) {
            console.log(err);
        }
        else {
            // response.send("OK");
            // response.send(post);
            response.redirect('/posts');
        }
    });
});

/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});