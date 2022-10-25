var db = require('../models/database.js');

var dbchat = require('../models/database_chat.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var uuid = require('uuid');
var exec = require('child_process').exec;

// Checks if two arrays are equal (for news categories)
function arrayEquals(a, b) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}

// Makes a status update if anything is changed from the profile
var makeProfilePost = function (username, message) {
	var content = message;
	var timestamp = new Date();
	var id = uuid.v4();
	
	timestamp = timestamp.toUTCString();
	
	console.log(message)
	
	db.getFriendsPromise(username, function(users) {
		users.push({ "user2" : { "S" : username } })
		users.forEach((user) => {
			console.log("USRS: "+ user.user2.S)
			var dict = {
				username: user.user2.S,
				id: id,
				datetime: timestamp.toLocaleString(),
				creator: username,
				recipient: username,
				content: content
			}
			
			db.addHomePost(dict)
		})
	})
}

// Checks if the user changed any information and updates it if so
var updateProfile = function(req,res) {
	var username = req.session.userLoggedIn;
	var promiseArr = [];
	
	var firstname = req.body.firstname;
	var lastname = req.body.lastname;
	var email = req.body.email;
	var affiliation = req.body.affiliation;
	
	if (firstname == "" || lastname == "" || email == "" || affiliation == "") {
		res.redirect('/edit?error=2');
	} else if (!Array.isArray(req.body.categories) || req.body.categories.length < 2) {
		res.redirect('/edit?error=1');
	} else {
		var output = "";
		
		db.userLookup(username, function(err, data) {
	    if (err) {
		  console.log(err);
	    } else if (data) {
		
		  if (firstname != data[0].firstname.S) {
			db.updateString(username, { "S" : req.body.firstname }, "firstname", function(promise) {
				promiseArr.push(promise);
				console.log("MAKEPROFULEPOSTs")
				output += "I changed my first name to " + firstname + ". "
			})
		  }

		  if (lastname != data[0].lastname.S) {
			db.updateString(username, { "S" : req.body.lastname }, "lastname", function(promise) {
				promiseArr.push(promise);
				
				output += "I changed my last name to " + lastname + ". "
			})
		  }

		  if (email != data[0].email.S) {
			db.updateString(username, { "S" : req.body.email }, "email", function(promise) {
				promiseArr.push(promise);
			})
		  }

		  if (affiliation != data[0].affiliation.S) {
			console.log("LFHSDFKHDSFJKDSHFJKHFDSJKFHKJDSHFK")
			db.updateString(username, { "S" : req.body.affiliation }, "affiliation", function(promise) {
				promiseArr.push(promise);
				
				output += "I changed my affiliation name to " + affiliation + ". "
			})
		  }

		  var categories1 = req.body.categories;
		  var categories2 = data[0].news.SS

		  categories1.sort();
		  categories2.sort();

		  if (!arrayEquals(categories1, categories2)) {
			console.log("livy")
			command = 'cd ../HW3 && mvn exec:java@livy';
				exec(command, (err, stdout, stderr) => {
				console.log(err);
				console.log(stdout);
				console.log(stderr);
			});

			db.updateString(username, { "SS" : req.body.categories }, "news", function(promise) {
				promiseArr.push(promise);
			})
			output += "I changed my categories to " + req.body.categories + ". "
			
			categories1.forEach((category) => {
				console.log("CATEGORY: " + category)
				db.addCategories(username, category)
			})
			
			categories2.forEach((category) => {
				console.log("CATEGORY: " + category)
				db.deleteCategory(username, category)
			})
			
		  }

		  if (req.body.password != "") {
			var hashObj = new jsSHA("SHA-256", "TEXT", {numRounds: 1});
  			hashObj.update(req.body.password);
  			var hashPassword = hashObj.getHash("HEX");
			
			db.updateString(username, { "S" : hashPassword }, "password", function(promise) {
				promiseArr.push(promise);
			})
		  }

		  if (output != "") {
			makeProfilePost(username, output)
		  }
		  
		  Promise.all(promiseArr).then(() => {
			res.redirect('/profile/' + req.session.userLoggedIn)
		  })
		}
		}) 
	}
}

// Displays the profile page
var editProfile = function(req,res) {
	var categories = ["Arts", "Arts & Culture", "Black Voices", "Business", "College", "Comedy", "Crime", "Culture & Arts", "Divorce", "Education", "Entertainment", "Environment", "Fifty", "Food & Drink", "Good News", "Green", "Healthy Living", "Home & Living", "Impact", "Latino Voices", "Media", "Money", "Parenting", "Parents", "Politics", "Queer Voices", "Religion", "Science", "Sports", "Style", "Style & Beauty", "Taste", "Tech", "The Worldpost", "Travel", "Weddings", "Weird News", "Wellness", "Women", "World News", "Worldpost"];
	
	db.userLookup(req.session.userLoggedIn, function(err, data) {
    if (err) {
	  console.log(err);
    } else if (data) {
		if (!req.query.error) {
			console.log(req.session.userLoggedIn)
			res.render('edit.ejs', { data: data[0], categories: categories, message: null, userLoggedIn: req.session.userLoggedIn, userQuery: req.session.userLoggedIn });
		} else if (req.query.error == '1') {
			res.render('edit.ejs', { data: data[0], categories: categories, message: "Pick at least 2 news categories.", userLoggedIn: req.session.userLoggedIn, userQuery: req.session.userLoggedIn });
		} else if (req.query.error == '2') {
			res.render('edit.ejs', { data: data[0], categories: categories, message: "Be sure to fill in all fields.", userLoggedIn: req.session.userLoggedIn, userQuery: req.session.userLoggedIn });
		}
	
	}}) 
}

var edit_routes = { 
    edit_profile: editProfile,
    update_profile: updateProfile,
};
  
module.exports = edit_routes;