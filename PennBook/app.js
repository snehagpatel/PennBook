var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var serveStatic = require('serve-static');
var path = require('path');
var auth_routes = require('./routes/auth_routes.js');
var edit_routes = require('./routes/edit_routes.js');
var friends_routes = require('./routes/friends_routes.js');
var news_routes = require('./routes/news_routes.js');
var search_routes = require('./routes/search_routes.js');
var post_routes = require('./routes/post_routes.js');
var routes = require('./routes/routes.js');
var app = express();
var session = require('express-session')
var exec = require('child_process').exec;
app.use(express.urlencoded());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public')));
app.use(session({
  secret: 'keyboard',
  resave: true,
  saveUninitialized: true,
}));
app.use(express.static("/home/nets212/G09/PennBook/views")) 
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/home', routes.get_home);
app.get('/visualizer', routes.get_visualizer);
app.get('/profile/:username', routes.get_profile);

// chat stuff
app.get('/chat', routes.get_chat);
app.get('/getactives', routes.get_actives);
app.post('/findchatid', routes.find_chat_id);
app.post('/joinchat', routes.join_chat);
app.get('/getchatdata', routes.get_chat_data);
app.get('/getuser', routes.get_user);
app.post('/addmsg', routes.add_msg);
app.post('/addmsg', routes.add_msg);

app.get('/makegc', routes.make_gc);
app.post('/joingc', routes.join_gc);
app.post('/delgc', routes.del_gc);
app.post('/leavegc', routes.leave_gc);

// posts endpoints
app.post('/createwallpost', post_routes.create_wall_post);
app.post('/createhomepost', post_routes.create_home_post);
app.post('/makecomment', post_routes.make_comment);
app.get('/getpost', post_routes.get_post);
app.get('/getnewhomepost', post_routes.get_home_post);
app.post('/createbdaypost', post_routes.create_bday_post);

// auth endpoints
app.get('/', auth_routes.get_main);
app.post('/checklogin', auth_routes.check_login);
app.post('/createaccount', auth_routes.create_account);
app.get('/logout', auth_routes.logout);
app.get('/signup', auth_routes.get_signup);

// edit endpoints
app.get('/edit', edit_routes.edit_profile);
app.post('/updateprofile', edit_routes.update_profile);

//See to put this in routes???
io.on("connection", function(socket) {
	// upon receiving chat message, write message to given chat's list
	socket.on("chat message", function(obj){
		console.log("(app.js) chat received!")
		io.to(obj.chatid).emit("chat message", obj);
	});
	
	// when selecting to join room, this should process the users involved, 
	// and link them to a chat id
	socket.on("join room", function(obj){
		socket.join(obj.chatid);
		console.log(obj.sender + " joining " + obj.chatid);
	});
	
	// when leaving a chat room, reset user's current chat room
	socket.on("leave room", function(obj){
		socket.leave(obj.chatid);
		console.log(obj.sender + " leaving " + obj.chatid);
		//io.to(obj.chatid).emit("leave room", obj);
	});
	
	socket.on("individual chat invite", function(obj){
		console.log("Sending an inivitation from " + obj.sender + " to " + obj.receiver + " for individual conversation");
		io.emit("individual chat invite", obj);
	});
	
	socket.on("individual chat accept", function(obj){
		io.emit("individual chat accept", obj);
	});
	
	socket.on("individual chat decline", function(obj){
		io.emit("individual chat decline", obj);
	});
	
	socket.on("individual leave", function(obj){
		io.emit("individual leave", obj);
	});
	
	socket.on("existing gc invite", function(obj){
		io.emit("existing gc invite", obj);
	});
	
	socket.on("existing gc accept", function(obj){
		io.emit("existing gc accept", obj);
	});
	
	socket.on("existing gc decline", function(obj){
		io.emit("existing gc decline", obj);
	});
	
	socket.on("new gc invite", function(obj){
		io.emit("new gc invite", obj);
	});
	
	socket.on("new gc accept", function(obj){
		io.emit("new gc accept", obj);
	});
	
	socket.on("new gc decline", function(obj){
		io.emit("new gc decline", obj);
	});
	
	
});

// friends endpoints
app.post('/addfriend', friends_routes.add_friend);
app.get('/getactive', friends_routes.get_active);
app.get('/getbirthday', friends_routes.get_birthday);
app.post('/deleteFriend', friends_routes.delete_friend);
app.get('/friends', friends_routes.get_friends);

// search endpoints
app.get('/suggest/:term', search_routes.suggest_user)
app.get('/search', search_routes.search_results)

//news endpoints
app.get('/article', news_routes.get_article_search);
app.get('/news', news_routes.get_news);
app.get('/newsrecommendation', news_routes.get_news_recommendation);
app.post('/likearticle', news_routes.like_article);

// visualization
app.get('/friendvisualization', routes.friend_visualization);
app.get('/getFriends/:user', routes.new_nodes);

//timer for livy
function livy() {
	console.log("livy")
	command = 'cd ../HW3 && mvn exec:java@livy';
  	exec(command, (err, stdout, stderr) => {
		console.log(err);
		console.log(stdout);
		console.log(stderr);
	});
}
setInterval(livy, 3600000);

/* Run the server */

console.log('Author: Hetvi Shah (hetvis)');
http.listen(8080);
console.log('Server running on port 8080. Now open http://localhost:8080/ in your browser!');
