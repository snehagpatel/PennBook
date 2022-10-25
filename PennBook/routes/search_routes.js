var db = require('../models/database.js');

var dbchat = require('../models/database_chat.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var suggestUser = function(req, res) {
	console.log("requested term: " + req.params.term);

	db.getSuggestions(req.params.term, function(err, data) {
    if (err) {
	  console.log(err);
    } else if (data) {
		console.log(data);
		res.send(JSON.stringify(data));
    }})
	
}

var searchResults = function(req, res) {
	var query = req.query.keyword;
	
	db.getSuggestions(query, function(err, data) {
    if (err) {
	  console.log(err);
    } else if (data) {
		db.userLookupPromise(data, function (usersInfo) {
			res.render('search.ejs', { users: usersInfo, keyword: query, userLoggedIn: req.session.userLoggedIn });
		})
	}})
}

var search_routes = { 
    suggest_user: suggestUser,
    search_results: searchResults,
};
  
module.exports = search_routes;