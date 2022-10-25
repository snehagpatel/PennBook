var db = require('../models/database.js');

var dbchat = require('../models/database_chat.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var uuid = require('uuid');

// Retrieves home posts for the user logged in
var getHomePosts = function (req, res) {
	db.getHomePost(req.query.user, function(postsDB) {
		res.send(JSON.stringify(postsDB))
	})
}

// Retrieves all wall posts for a specific user
var getPosts = function (req, res) {
	db.getWallPost(req.query.user, function(postsDB) {
		res.send(JSON.stringify(postsDB))
	})
}

// Creates a home page post by retrieving all friends and adding that to the database
var createHomePost = function (req, res) {
	var content = req.body.content;
	var recipient = req.session.userLoggedIn;
	var creator = req.session.userLoggedIn;
	var timestamp = new Date();
	var id = uuid.v4();
	
	timestamp = timestamp.toUTCString();
	
	db.getFriendsPromise(creator, function(users) {
		users.push({ "user2" : { "S" : creator } })
		console.log(users)
		users.forEach((user) => {
			var dict = {
				username: user.user2.S,
				id: id,
				datetime: timestamp.toLocaleString(),
				creator: creator,
				recipient: recipient,
				content: content
			}
			
			db.addHomePost(dict)
		})
	})
	
	res.send({
		datetime: timestamp,
		creator: creator,
		recipient: recipient,
		content: content,
		id: id
	});
}

// Creates an automatic birthday post
var createBdayPost = function (req, res) {
	var bdayperson = req.body.friend;
	var content = "Happy birthday " + bdayperson + "!";
	var recipient = bdayperson;
	var creator = req.session.userLoggedIn;
	var timestamp = new Date();
	var id = uuid.v4();
	
	timestamp = timestamp.toUTCString();

	db.getFriendsPromise(creator, function(friends1) {
		db.getFriendsPromise(recipient, function(friends2) {
			allFriends = friends1.concat(friends2)
			
			allFriends.forEach((user) => {
				var dict = {
					username: user.user2.S,
					id: id,
					datetime: timestamp.toLocaleString(),
					creator: creator,
					recipient: recipient,
					content: content
				}
				
				db.addWallPost(dict)
			})
			
		})
	})
	
	res.redirect('/friends');
}

// Creates a wall post by finding the users that this wall post should show up on
var createWallPost = function (req, res) {
	var content = req.body.content;
	var recipient = req.body.recipient;
	var creator = req.session.userLoggedIn;
	var timestamp = new Date();
	var id = uuid.v4();
	
	timestamp = timestamp.toUTCString();
	
	var allFriends = []
	
	db.getFriendsPromise(creator, function(friends1) {
		db.getFriendsPromise(recipient, function(friends2) {
			if (friends1 == friends2) {
				allFriends = friends1.concat(friends2)
			} else {
				allFriends = friends1;
			}
			
			allFriends.push({ "user2" : { "S" : creator } })
			allFriends.forEach((user) => {
				console.log(user)
				var dict = {
					username: user.user2.S,
					id: id,
					datetime: timestamp.toLocaleString(),
					creator: creator,
					recipient: recipient,
					content: content
				}
				
				db.addWallPost(dict)
			})
			
		})
	})
	
	res.send({
		datetime: timestamp,
		creator: creator,
		recipient: recipient,
		content: content,
		id: id
	});
}

// POST request for making comments
var makeComment = function (req, res) {
	var comment = req.body.comment;
	var postID = req.body.postId;
	var creator = req.session.userLoggedIn;
	
	console.log(postID)
	
	db.makeComment(comment, creator, postID);
	
	console.log("HERE5555")
	console.log(comment)
	console.log(creator)
	
	res.send({
		comment: comment,
		creator: creator,
		id: postID
	})
}


var post_routes = { 
	create_wall_post: createWallPost,
	create_home_post: createHomePost,
	make_comment: makeComment,
	get_post: getPosts,
	create_bday_post: createBdayPost,
	get_home_post: getHomePosts
};
  
module.exports = post_routes;