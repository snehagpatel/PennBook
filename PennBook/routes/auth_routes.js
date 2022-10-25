var db = require('../models/database.js');

var dbchat = require('../models/database_chat.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Signup page
var signup = function(req, res) {
	var categories = ["Arts", "Arts & Culture", "Black Voices", "Business", "College", "Comedy", "Crime", "Culture & Arts", "Divorce", "Education", "Entertainment", "Environment", "Fifty", "Food & Drink", "Good News", "Green", "Healthy Living", "Home & Living", "Impact", "Latino Voices", "Media", "Money", "Parenting", "Parents", "Politics", "Queer Voices", "Religion", "Science", "Sports", "Style", "Style & Beauty", "Taste", "Tech", "The Worldpost", "Travel", "Weddings", "Weird News", "Wellness", "Women", "World News", "Worldpost"];
	
	if (!req.query.error) {
		res.render('signup.ejs', { message: null, categories: categories });
	} else if (req.query.error == '1') {
		res.render('signup.ejs', { message: "Pick at least 2 news categories.", categories: categories });
	} else if (req.query.error == '2') {
		res.render('signup.ejs', { message: "Be sure to fill in all fields.", categories: categories });
	} else if (req.query.error == '4') {
		res.render('signup.ejs', { message: "This username already exists.", categories: categories });
	} else if (req.query.error == '3') {
		res.render('signup.ejs', { message: "There was an error.", categories: categories });
	}
};

// Creates a new account if username is unique and all fields are completed
var createAccount = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var firstName = req.body.firstname;
	var lastName = req.body.lastname;
	var email = req.body.email;
	var affiliation = req.body.affiliation;
	var birthday = req.body.birthday;
	const news = req.body.categories;
	
	if (username == "" || password == "" || firstName == "" || lastName == "" || email == "" || affiliation == "" 
		|| birthday == "") {
		res.redirect('/signup?error=2');
	} else if (!Array.isArray(news) || news.length < 2) {
		res.redirect('/signup?error=1');
	} else {
		db.userLookup(username, function(err, data) {
	    if (err) {
		console.log(err);
		  res.redirect('/signup?error=3');
	    } else if (data) {
	    } else {
		  req.session.userLoggedIn = username;
		  
		
		  db.createAccount(username, password, firstName, lastName, email, affiliation, birthday, news, function(promiseArr) {
			news.forEach((category) => {
				console.log("CATEGORY: " + category)
				db.addCategories(username, category)
			})
			
			Promise.all(promiseArr).then(() => {
				res.redirect('/home');
		  	})
			// promise.then(() => {
			//	res.redirect('/home');
			// })
		  });
	    }
	  });
	}
}

// Logout request
var logout = function (req, res) {
	var username = req.session.userLoggedIn;
	var promiseArr = [];
	
	db.updateString(username, { "BOOL" : false }, "active", function(promise) {
		promiseArr.push(promise);
	});
	
	delete req.session.userLoggedIn;
	
	Promise.all(promiseArr).then(() => {
		res.redirect('/');
	})
}

// Checks the login information
var checkLogin = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	
	var hashObj = new jsSHA("SHA-256", "TEXT", {numRounds: 1});
  	hashObj.update(password);
  	var hashPassword = hashObj.getHash("HEX");

	//console.log(hashPassword);

	if (username == "" || password == "") {
		res.redirect('/?error=4')
	} else {
		db.userLookup(username, function(err, data) {
	    if (err) {
		  res.redirect('/?error=3');
		  console.log(err);
	    } else if (data) {
			if (data[0].password.S === hashPassword) {
				req.session.userLoggedIn = username;
				var promiseArr = [];
	
				db.updateString(username, { "BOOL" : true }, "active", function(promise) {
					promiseArr.push(promise);
				});
	
				Promise.all(promiseArr).then(() => {
					res.redirect('home');
				})
			} else {
				res.redirect('/?error=1');
			}
	
	    } else {
		  res.redirect('/?error=2');
	    }
	});
	}
};

// Main login page
var getMain = function(req, res) {
	if (!req.query.error) {
		res.render('main.ejs', { message: null });
	} else if (req.query.error == '1') {
		res.render('main.ejs', { message: "Incorrect password"});
	} else if (req.query.error == '2') {
		res.render('main.ejs', { message: "We did not find this username."});
	} else if (req.query.error == '3') {
		res.render('main.ejs', { message: "There was an error."});
	} else if (req.query.error == '4') {
		res.render('main.ejs', { message: "Be sure to fill in all fields."});
	}
};


var auth_routes = { 
    get_signup: signup,
    create_account: createAccount,
    logout: logout,
    check_login: checkLogin,
    get_main: getMain,
};
  
module.exports = auth_routes;