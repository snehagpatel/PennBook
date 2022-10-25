var db = require('../models/database_news.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


var likeArticle = function(req, res) {
	if (req.session.userLoggedIn) {
		db.likeArticle(req.session.userLoggedIn, req.body.articleId);
		res.send();
	} else {
		res.redirect('/');
	}
	
}

//Get article by Search
var getArticleSearch = function(req, res) {
	if (req.session.userLoggedIn) {
		console.log(req.query.keyword);
		var keyword = req.query.keyword;
		db.searchArticle(keyword, function(err, data) {
			if (data) {
				var sortedData = Array.from(data.values());
				console.log(sortedData);
				sortedData.sort(function(a,b){
					return b.count - a.count;
				});
				res.render('newssearch.ejs', {userLoggedIn: req.session.userLoggedIn, data: sortedData})
			} else {
				res.render('newssearch.ejs', {userLoggedIn: req.session.userLoggedIn, data: []})
			}
		});
	} else {
		res.redirect('/');
	}
}; 

var getNews = function(req, res) {
	if (req.session.userLoggedIn) {
		db.getArticleRecommendations(req.session.userLoggedIn, function(err, data) {
			console.log("get article recommendationssss route")
			res.render('newsfeed.ejs', {userLoggedIn : req.session.userLoggedIn, recs : data});
		});
	} else {
		res.redirect('/');
	}
};

var getNewsRecommendation = function (req, res) {
	if (req.session.userLoggedIn) {
		// choose random article and set that article is recommended
		db.postNewArticleRecommendation(req.session.userLoggedIn, function(err, data) {
			// gets all articles where recommended is true
			id = data
			console.log("Post News Articles route")
			console.log(id)
			db.getArticleRecommendation(id, function (err, data) {
				console.log("getNewsr hetviiii")
				console.log(data)
				if (data == null) {
					console.log("end request");
					res.send()
				} else {
					res.send(JSON.stringify(data));
				}
			})
		});		
	} else {
		res.redirect('/');
	}
}

var news_routes = { 
    get_article_search: getArticleSearch,
    get_news: getNews,
	get_news_recommendation: getNewsRecommendation,
	like_article: likeArticle
};
  
module.exports = news_routes;