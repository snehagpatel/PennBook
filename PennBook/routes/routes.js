var db = require('../models/database.js');

var dbchat = require('../models/database_chat.js');

const jsSHA = require("jssha");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Main page
var getHome = function(req, res) {
	var username = req.session.userLoggedIn;
	if (username) {
		db.getHomePost(username, function(postsDB) {
			posts = postsDB;
			console.log(posts)
			res.render('home.ejs', { posts: posts, userLoggedIn: req.session.userLoggedIn});
		})
	} else {
		res.redirect('/');
	}
};

// Visualizer tab
var getVisualizer = function(req, res) {
	if (req.session.userLoggedIn) {
		res.render('friendvisualizer.ejs', {userLoggedIn: req.session.userLoggedIn});
	} else {
		res.redirect('/');
	}
};

var friendVisualization = function(req, res) {
	var user = req.session.userLoggedIn;
	var affiliation = "";
	db.getAffiliation(user, function(err, data) {
		if (data) {
			affiliation = data;
		}
		
		db.getFriends(user, function(err2, data2) {
		if (!err) {
			var json = {"id": user, "name": user + " (" + affiliation + ")", "children": [], "data": [affiliation]};
			var friendsProcessed = 0;
			data2.Items.forEach(function(item) {
				var affil = "";
				db.getAffiliation(item.user2.S, function(err3, data3) {
					console.log("here");
					if (data3) {
						affil = data3;
					}
					
					var friend = {"id": item.user2.S, "name": item.user2.S + " (" + affil + ")", "children": [], "data": [affil]};
					json.children.push(friend);
					friendsProcessed++;
					
					if (friendsProcessed == data2.Items.length) {
						res.send(json);
					}
				});
			});
		} else {
			console.log(err);
		}
	});
	});
};

var newNodes = function(req, res) {
	var aff = "";
	db.getAffiliation(req.session.userLoggedIn, function(err5, data5) {
		if (data5) {
			aff = data5;
		}
		
		var user = req.params.user;
	var affiliation = "";
	db.getAffiliation(user, function(err, data) {
		if (data) {
			affiliation = data;
		}
		
		db.getFriends(user, function(err2, data2) {
		if (!err) {
			var json = {"id": user, "name": user + " (" + affiliation + ")", "children": [], "data": [affiliation]};
			var friendsProcessed = 0;
			data2.Items.forEach(function(item) {
				var affil = "";
				db.getAffiliation(item.user2.S, function(err3, data3) {
					console.log("here");
					if (data3) {
						affil = data3;
					}
					
					if (affil == aff) {
						var friend = {"id": item.user2.S, "name": item.user2.S + " (" + affil + ")", "children": [], "data": [affil]};
						json.children.push(friend);
					}
					
					db.checkFriendship(req.session.userLoggedIn, item.user2.S, function(err6, data6) {
						if (data6.length > 0) {
							var friend = {"id": item.user2.S, "name": item.user2.S + " (" + affil + ")", "children": [], "data": [affil]};
							json.children.push(friend);
						}
						
						friendsProcessed++;
					
						if (friendsProcessed == data2.Items.length) {
							res.send(json);
						}
					});
				});
			});
		} else {
			console.log(err);
		}
	});
	});
	})

    
};

// Displays the profile page
var getProfile = function(req, res) {
	var username = req.params.username;
	var isUserLoggedIn = false;
	var posts = []
	
	if (username == req.session.userLoggedIn) {
		isUserLoggedIn = true;
	} else {
		isUserLoggedIn = false;
	}
	
	console.log(username);
	if (req.session.userLoggedIn) {
		db.userLookup(username, function(err, data) {
	    if (err) {
		  	console.log(err);
	    } else if (data) {
			db.getWallPost(username, function(postsDB) {
				posts = postsDB;
				
				if (!isUserLoggedIn) {
					db.checkFriendship(req.session.userLoggedIn, username, function(err, data2) {
						if (err) {
							console.log(err);
						} else if (data2.length == 0) {
							res.render('profile.ejs', { posts: posts, data: data[0], isUserLoggedIn: isUserLoggedIn, userLoggedIn: req.session.userLoggedIn, userQuery: username, isFriend: false });
						} else {
							res.render('profile.ejs', { posts: posts, data: data[0], isUserLoggedIn: isUserLoggedIn, userLoggedIn: req.session.userLoggedIn, userQuery: username, isFriend: true });
						}
					})
				} else {
					res.render('profile.ejs', { posts: posts, data: data[0], isUserLoggedIn: isUserLoggedIn, userLoggedIn: req.session.userLoggedIn, userQuery: username, isFriend: null });
				}
			})
	    }}) 
	} else {
		res.redirect('/');
	}
};

// opens chat home page
var getChat = function(req, res) {
	if (req.session.userLoggedIn) {
		res.render("chats.ejs", {userLoggedIn: req.session.userLoggedIn});
	} else {
		res.redirect('/');
	}
	
	
};



// response sends list of current user's active friends
var getActives = function(req, res){
	dbchat.getActives(req.session.userLoggedIn, function(err, data){
		if (err) {
			console.log(err);
		} else if(data) {
			res.send(data);
		}
	});
}

// given a set of user names, either find a preexisting chat
// and return the respective id, or make a new chat item and return its id
var findChatId = function(req, res){
	names_list = (req.body.chatter);
	// data here is list of possible chat matches
	dbchat.findExistingId(names_list, function(err, data){
		if (err){
			console.log(err);
		} else if (data) {

			if (data.length == 0){
				// handle creating a new chat item and updating users
				dbchat.addChat(names_list, false, function(err, newchatid){
					if (err) {
						console.log(err);
					} else {
						res.send({
							success: true,
							room: newchatid,
						});
					}
				});
			} else {
				// return correct chat id
				// make sure that one of the chats in the data list 
				// have only the users in the names_list
				dbchat.confirmChat(names_list, data, function(err, id){
					if (err) {
					} else if (id == -1){
						dbchat.addChat(names_list, false, function(err, newchatid){
							if (err) {
								console.log(err)
							} else {
								res.send({
									success: true,
									room: newchatid,
								});
							}
						});
					} else {
						res.send({
							success: true,
							room: id
						});
					}
				});
			}
			// res.send(data);
		}
	})
};

var getChatData = function(req, res) {
	var id = req.query.room;
	dbchat.getChatData(id, function(err, data) {
		if (err){
			console.log('error');
		} else if (data){
			res.send({
				success: true,
				info: data
			});
		}
	});
};

// join chat of specific id
// joining chat should search the chats table to see if the given chat exists
// if chat exists, return existing messages for rendering on client side
// otherwise, make a new chat item
var joinChat = function(req, res){
	var m;
	room = req.body.chatroom; //string
	dbchat.getChatData(room, function(err, data){
		if (err) {
			console.log("(routes.js) error");
			console.log(err);
		} else if (data) {
			m = data.Items[0].messages.L;
			g = data.Items[0].group.BOOL;
			res.send({
				success: true,
				messages: m,
				group: g,
			});
		} else {
			//console.log("(routes.js) No data found");
		}
	});

};

// leave chat
var leaveChat = function(req, res){
	res.send({
		success: true
	});
};

// when a chat is sent, add message to list of corresponding chat item
var addMsg = function(req, res){
	dbchat.addMessage(req.body.room, req.body.msg_info, function(){

		console.log("(routes) message added to db!");
		
	});
};

// make GC, placing into 'chat' table
var makeGC = function(req, res) {
	var ppl_lst = req.query.oldchat.people.SS;
	ppl_lst.push(req.query.invited);
	dbchat.addGC(ppl_lst, function(gc_id){
		res.send({
			gcroom: gc_id
		});
	})
}

var joinGC = function(req, res){
	var gcid = req.body.gc;
	var ppl = req.body.p;
	dbchat.updateGC(gcid, ppl, function(data){
		res.send({
			success: true,
		});
	});
}

//string of id
var delGC = function(req, res){
	dbchat.delChat(req.body.room, function(data){
		res.send(data);
	});
}

var leaveGC = function(req, res){
	var r = req.body.room;
	var u = req.body.leaver;
	var p = req.body.ppl;
	dbchat.removeUserFromGC(r, u, p, function(data){
		res.send(data); 
	})
}


var getUser = function(req, res) {
	if (!req.session.userLoggedIn) {
		res.redirect('/home');
	} else {
		res.send(JSON.stringify(req.session.userLoggedIn));
	}
};

//Get article by Search
var getArticleSearch = function(req, res) {
	console.log(req.query.keyword);
	var keyword = req.query.keyword;
	db.searchArticle(keyword, function(err, data) {
	    if (data) {
			console.log(data);
			// res.render('newssearch.ejs', {data: data})
			res.send("success");
	    } else {
			res.send("no data? getArticleSearch");
	    }
	});
};



var routes = { 
  get_home: getHome,
  get_visualizer: getVisualizer,
  get_profile: getProfile,
  get_chat: getChat,
  get_user: getUser,
  get_actives: getActives,
  find_chat_id: findChatId,
  join_chat: joinChat,
  leave_chat: leaveChat,
  friend_visualization: friendVisualization,
  new_nodes: newNodes,
  add_msg: addMsg,
  get_article_search: getArticleSearch,
  get_chat_data: getChatData,
  make_gc: makeGC,
  join_gc: joinGC,
  del_gc: delGC,
  leave_gc: leaveGC,
  
  
};

module.exports = routes;
