var db = require('../models/database.js');

var dbchat = require('../models/database_chat.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Gets active status
var getActive = function(req, res) {
	db.getActive(req.query.user, function(err, data) {
		if (!err) {
			console.log("sending data");
			console.log(data);
			res.send(JSON.stringify(data));
		} else {
			res.send(JSON.stringify(err));
		}
	});
};

// Gets birthday
var getBirthday = function(req, res) {
	db.getBirthday(req.query.user, function(err, data) {
		if (!err) {
			//console.log("sending data");
			res.send(JSON.stringify(data));
		} else {
			res.send(JSON.stringify(err));
		}
	});
};

// Gets friends
var getFriends = function(req, res) {
	if (req.session.userLoggedIn) {
		var user = req.session.userLoggedIn;
		db.getFriends(user, function(err, data) {
			if (!err) {
				res.render('friends.ejs', {items: data.Items, message: null, userLoggedIn: user});
			} else {
				res.render('friends.ejs', {items: null, message: err, userLoggedIn: user});
			}
		});
	} else {
		res.redirect('/');
	}
};

// Adds a friendship (both ways)
var addFriend = function(req, res) {
	var user1 = req.session.userLoggedIn;
	var user2 = req.body.friend;
	
	db.addFriend(user1, user2, function(err, data) {
	    if (err) {
			console.log(err);
			res.render('friendserror.ejs', {message: err});
		} else {
			res.redirect('/friends');
		}
		
	});
	
	res.redirect('/profile/' + user2);
};

// Deletes a friendship (both ways)
var deleteFriend = function(req, res) {
	/*
	var user1 = req.session.userLoggedIn;
	console.log(Object.keys(req.body));
	
	var user2 = Object.keys(req.body)[0];
	
	db.deleteFriend(user1, user2, function(err) {
	    if (err) {
		console.log(err);
		} else {
			res.redirect('/friends');
		}
	});
	
	//console.log("hi");
	//res.redirect('/friends');
	*/
	var user1 = req.session.userLoggedIn;
	var user2 = req.body.friend;
	
	db.deleteFriend(user1, user2, function(err, data) {
	    if (err) {
			console.log(err);
			res.render('friendserror.ejs', {message: err});
		} else {
			res.redirect('/friends');
		}
		
	});
	
	res.redirect('/profile/' + user2);
};

var friends_routes = { 
    add_friend: addFriend,
    delete_friend: deleteFriend,
    get_active: getActive,
	get_birthday: getBirthday,
    get_friends: getFriends,
};
  
module.exports = friends_routes;