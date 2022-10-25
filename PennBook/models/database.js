var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();
const jsSHA = require("jssha");
const stemmer = require("stemmer");

// Looks up users in the "users" table
var users_lookup = function(username, callback) {
  console.log('Looking up: ' + username); 

  var params = {
    TableName : "users",
    KeyConditionExpression: "username = :u",
    ExpressionAttributeValues: {
        ":u": {"S" : username}
    }
};

  db.query(params, function(err, data) {
    if (err || data.Items.length == 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

// Looks up users in the users table - promise
var users_lookup_promise = function(users, callback) {
  var promiseArr = []
  var usersInfo = []

  users.forEach((element) => {
		console.log("ELEM: " + element.username.S);
		
		var params = {
		    TableName : "users",
		    KeyConditionExpression: "username = :u",
		    ExpressionAttributeValues: {
		        ":u": {"S" : element.username.S}
		    }
		};

		promiseArr.push(db.query(params).promise())
	
		//res.send(JSON.stringify(data));
    })
	Promise.all(promiseArr).then(function (promiseArr) {
		promiseArr.forEach((promise) => {
			console.log(promise.Items)
			usersInfo.push(promise.Items)
		})
		callback(usersInfo)
		//console.log(usersInfo)
		//res.render('search.ejs', { users: usersInfo, keyword: query, userLoggedIn: req.session.userLoggedIn });
	})
}

// Adds an account with specified parameters to "users" table
var add_db_acc = function(username, password, firstName, lastName, email, affiliation, birthday, news, callback) {
  console.log('Adding: ' + username); 

  var hashObj = new jsSHA("SHA-256", "TEXT", {numRounds: 1});
  hashObj.update(password);
  var hash = hashObj.getHash("HEX");

  var params = {
        TableName : "users",
        Item : {
            "username" : {"S" : username},
            "password" : {"S" : hash},
            "firstname" : {"S" : firstName},
			"lastname" : {"S" : lastName},
			"email" : {"S" : email},
			"affiliation" : {"S" : affiliation},
			"birthday" : {"S" : birthday},
			"news" : {"SS" : news},
			"active" : { "BOOL" : true },
			"chats" : {"L" : []},
        }
   };

	var params2 = {
        TableName : "prefixes",
        Item : {
            "id" : {"N" : "1"},
            "username" : {"S" : username},
        }
   };

    const promise = db.putItem(params, function(err, data) {
        if (err) {
            console.log(err);
        } 
    }).promise();

	const promise2 = db.putItem(params2, function(err, data) {
        if (err) {
            console.log(err);
        } 
    }).promise();

	var promiseArr = [];
	promiseArr.push(promise);
	promiseArr.push(promise2);

	callback(promiseArr);
}

// Gets user active status
var myDB_getactive = function(username, callback) {
	console.log("Getting active status of user " + username + "...");
	
	var params = {
  		Key: {
   			"username": {
     			S: username
    		}, 
 		 }, 
  	TableName: "users"
 	};

  db.getItem(params, function(err, data) {
	if (err) {
		callback(err, null);
    } else {
		callback(err, data.Item.active.BOOL);
    }
  });
}

// Gets user's birthday
var myDB_getbirthday = function(username, callback) {
	console.log("Getting birthday of user " + username + "...");
	var params = {
  		Key: {
   			"username": {
     			S: username
    		}, 
 		 }, 
  	TableName: "users"
 	};

  db.getItem(params, function(err, data) {
    if (err) {
		callback(err, null);
    } else {
		callback(err, data.Item.birthday.S);
    }
  });
}

// Gets user's affiliation
var myDB_getaffiliation = function(username, callback) {
	console.log("Getting affiliation of user " + username + "...");
	var params = {
  		Key: {
   			"username": {
     			S: username
    		}, 
 		 }, 
  	TableName: "users"
 	};

  db.getItem(params, function(err, data) {
    if (err) {
		callback(err, null);
    } else {
        //console.log(data.Item.active.BOOL);
		callback(err, data.Item.affiliation.S);
    }
  });
}


var update_string = function (username, value, name, callback) {
	var params = {
		TableName: "users",
		Key: {
			"username" : {"S" : username}
		},
		UpdateExpression: "set " + name + " = :a",
		ExpressionAttributeValues: {
			":a": value
		},
		ReturnValues:"UPDATED_NEW"
	}
	
	const promise = db.updateItem(params, function(err) {
		if (err) {
			console.log(err);
		}
	}).promise();
	
	callback(promise);
}

// Gets the suggestions for a specific prefix
var get_suggestions = function (term, callback) {
	var params = {
		TableName: 'prefixes',
		KeyConditionExpression: '#id = :id and begins_with(#username, :username)',
		ExpressionAttributeNames: {
			"#id" : "id",
			"#username" : "username"
		},
		ExpressionAttributeValues: {
			":id" : {"N" : "1"},
			":username" : {"S" : term}
		}
	}
	
	db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

// Adds entries for home posts (structure described in project report)
var add_home_post = function (dict) {
	var params = {}
	
	if (dict.username == dict.creator) {
		params = {
			TableName: 'posts',
			Item: {
				"username" : {"S" : dict.username},
				"id" : {"S" : dict.id},
				"datetime" : {"S" : dict.datetime.toString()},
				"creator" : {"S" : dict.creator},
				"recipient" : {"S" : dict.recipient},
				"content" : {"S" : dict.content},
				"wall" : {"BOOL" : true},
				"comments" : {"L" : []}
			}
		}
	} else {
		params = {
			TableName: 'posts',
			Item: {
				"username" : {"S" : dict.username},
				"id" : {"S" : dict.id},
				"datetime" : {"S" : dict.datetime.toString()},
				"creator" : {"S" : dict.creator},
				"recipient" : {"S" : dict.recipient},
				"content" : {"S" : dict.content},
				"wall" : {"BOOL" : false},
				"comments" : {"L" : []}
			}
		}
	}
	
	db.putItem(params, function (err) {
		if (err) {
			console.log(err)
		}
	})
}

// Adds entries for home posts (structure described in project report) - promise
var add_home_post_2 = function (dict, callback) {
	var params = {}
	
	if (dict.username == dict.creator) {
		params = {
			TableName: 'posts',
			Item: {
				"username" : {"S" : dict.username},
				"id" : {"S" : dict.id},
				"datetime" : {"S" : dict.datetime.toString()},
				"creator" : {"S" : dict.creator},
				"recipient" : {"S" : dict.recipient},
				"content" : {"S" : dict.content},
				"wall" : {"BOOL" : true},
				"comments" : {"L" : []}
			}
		}
	} else {
		params = {
			TableName: 'posts',
			Item: {
				"username" : {"S" : dict.username},
				"id" : {"S" : dict.id},
				"datetime" : {"S" : dict.datetime.toString()},
				"creator" : {"S" : dict.creator},
				"recipient" : {"S" : dict.recipient},
				"content" : {"S" : dict.content},
				"wall" : {"BOOL" : false},
				"comments" : {"L" : []}
			}
		}
	}
	
	callback(db.putItem(params).promise());
	
}

// Adds entries for wall posts (structure described in project report)
var add_wall_post = function (dict) {
	var params = {}
	
	if (dict.username == dict.creator || dict.username == dict.recipient) {
		params = {
			TableName: 'posts',
			Item: {
				"username" : {"S" : dict.username},
				"id" : {"S" : dict.id},
				"datetime" : {"S" : dict.datetime.toString()},
				"creator" : {"S" : dict.creator},
				"recipient" : {"S" : dict.recipient},
				"content" : {"S" : dict.content},
				"wall" : { "BOOL" : true },
				"comments" : {"L" : []}
			}
		}
	} else {
		params = {
			TableName: 'posts',
			Item: {
				"username" : {"S" : dict.username},
				"id" : {"S" : dict.id},
				"datetime" : {"S" : dict.datetime.toString()},
				"creator" : {"S" : dict.creator},
				"recipient" : {"S" : dict.recipient},
				"content" : {"S" : dict.content},
				"wall" : { "BOOL" : false },
				"comments" : {"L" : []}
			}
		}
	}
	
	db.putItem(params, function (err) {
		if (err) {
			console.log(err)
		}
	})
}

// Retrieves the posts on the home page for a particular user
var get_home_post = function (username, callback) {
	console.log("USER: " + username);
	
	var params = {
		TableName: 'posts',
		KeyConditionExpression: "username = :u",
    	ExpressionAttributeValues: {
        	":u": {"S" : username}
    	},
		ScanIndexForward: false
	}	
	
	db.query(params).promise().then(function (users) {
		//console.log(users.Items)
		callback(users.Items)
	})
}

var get_wall_post = function (username, callback) {
	console.log("USER: " + username);
	
	var params = {
		TableName: 'posts',
		KeyConditionExpression: "username = :u",
		FilterExpression: "wall = :w",
    	ExpressionAttributeValues: {
        	":u": {"S" : username},
			":w": {"BOOL":true}
    	},
		ScanIndexForward: false
	}	
	
	db.query(params).promise().then(function (users) {
		//console.log(users.Items)
		callback(users.Items)
	})
}

// Checks whether user1 and user2 are friends
var check_friendship = function(user1, user2, callback) {
  console.log('Checking whether the friendship between ' + user1 + " and " + user2 + " exists..."); 

  var params = {
        TableName: "friends",
	  	ProjectionExpression: "#user1, #user2",
		KeyConditionExpression: "#user1 = :user1 and #user2 = :user2",
      	ExpressionAttributeNames: {
			"#user1" : "user1",
			"#user2" : "user2"
		},
		ExpressionAttributeValues: {
			":user1": {
				S: user1
			},
			":user2": {
				S: user2
			}
		}
      
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err,null);
    } else {
      callback(err, data.Items);
    }
  });
}

// Gets the friends of a particular user
var get_friends_promise = function(user, callback) {
	var params = {
        TableName : "friends",
    	KeyConditionExpression: "user1 = :u",
    	ExpressionAttributeValues: {
        	":u": {"S" : user}
    	}
    };

	db.query(params).promise().then(function (users) {
		callback(users.Items)
	})
}

var get_friends = function(user, callback) {
	console.log('Getting friends of user ' + user + "...");
	
	var params = {
        TableName : "friends",
    	KeyConditionExpression: "user1 = :u",
    	ExpressionAttributeValues: {
        	":u": {"S" : user}
    	}
    };

	db.query(params, function(err, data) {
    	if (err) {
			callback(err, null);
    	} else {
			callback(err, data);
    	}
  	});
}

// Adds a friend relationship
var add_friend = function(user1, user2, callback) {
  console.log('Adding friendship between ' + user1 + ' and ' + user2 + '...'); 

  if (user1 == user2) {
	callback("Cannot add yourself as a friend", null);
  } else {
	var params = {
        TableName : "friends",
        Item : {
            "user1" : {"S" : user1},
            "user2" : {"S" : user2}
        }
    };

	var params2 = {
		TableName : "friends",
		Item : {
    		"user1" : {"S" : user2},
    		"user2" : {"S" : user1}
		}
	};

	db.putItem(params, function(err, data) {
        if (err) {
			console.log("hi");
			callback(err);
    	} else {
			db.putItem(params2, function(err2, data2) {
				if (err2) {
					callback(err2);
				}
			});
    	}
    });
    
  
}  
  
}

// Removes a friend relationship
var delete_friend = function(user1, user2, callback) {
  console.log('Deleting friendship between ' + user1 + ' and ' + user2 + '...');

  var params = {
        TableName : "friends",
        Key : {
            "user1" : {"S" : user1},
			"user2" : {"S" : user2},
        }
    };

  var params2 = {
        TableName : "friends",
        Key : {
            "user1" : {"S" : user2},
			"user2" : {"S" : user1},
        }
    };

    db.deleteItem(params, function(err, data) {
	if (err) {
		console.log(err);
		callback(err);
    } else {
		db.deleteItem(params2, function(err2, data2) {
			if (err2) {
				console.log(err2);
				callback(err2);
			}
		})
}
	
});

}

// Makes a comment for a specific post
var make_comment = function (comment, creator, postID) {
	
	var params = {
		TableName : "posts",
		IndexName: "id-username-index",
		KeyConditionExpression: "id = :id",
		ExpressionAttributeValues: {
			":id":{"S" : postID}
		}
	}
	
	db.query(params, function (err, result) {
		if (err) {
			console.log(err)
		} else {
			result.Items.forEach((item) => {
				var params = {
					TableName: "posts",
					Key : {
						"username" : item.username,
						"datetime" : item.datetime
					},
					UpdateExpression: "set comments = list_append(comments, :c)",
					ExpressionAttributeValues: {
						":c" : {"L" : [ { "M" : { "content" : { "S" : comment }, "creator" : { "S" : creator } } } ]}
					},
					ReturnValues: "UPDATED_NEW" 
				}
				
				db.updateItem(params, function (err, data) {
					if (err) {
						console.log(err)
					} 
				});
			});
		}
	})
}

// Adds a user to category relationship
var add_categories = function (username, category) {
	var cat = category.split(" ").join("")
	cat = cat.toUpperCase();
	var newCat = "c#" + cat
	
	var params = {
		TableName: "user_categories",
		Item: {
			"pk" : { "S" : username },
			"sk" : { "S" : newCat }
		}
	}
	
	var params2 = {
		TableName: "user_categories",
		Item: {
			"pk" : { "S" : newCat },
			"sk" : { "S" : username }
		}
	}
	
	db.putItem(params, function(err) {
        if (err) {
			console.log(err)
    	} else {
			db.putItem(params2, function(err2) {
				if (err2) {
					console.log(err2)
				}
			});
    	}
    });
}

// Removes a user to category relationship
var delete_category = function (username, category) {
	var cat = category.split(" ").join("")
	cat = cat.toUpperCase();
	var newCat = "c#" + cat
	
	var params = {
		TableName: "user_categories",
		Key : {
			"pk" : {"S" : username},
			"sk" : {"S" : newCat}
		}
	}
	
	var params2 = {
		TableName: "user_categories",
		Key : {
			"pk" : {"S" : newCat},
			"sk" : {"S" : username}
		}
	}
	
	console.log("DELETING " + username + " AND " + newCat)
	
	db.deleteItem(params, function(err) {
		if (err) {
			console.log(err)
		} else {
			db.deleteItem(params2, function(err2) {
				console.log(err2)
			})
		}
	})
}

/* We define an object with one field for each method. For instance, below we have
   a 'lookup' field, which is set to the myDB_lookup function. In routes.js, we can
   then invoke db.lookup(...), and that call will be routed to myDB_lookup(...). */

var database = { 
  userLookup: users_lookup,
  createAccount: add_db_acc,
  getFriends: get_friends,
  addFriend: add_friend,
  deleteFriend: delete_friend,
  getActive: myDB_getactive,
  getBirthday: myDB_getbirthday,
  getAffiliation: myDB_getaffiliation,
  updateString: update_string,
  getSuggestions: get_suggestions,
  userLookupPromise: users_lookup_promise,
  addWallPost: add_wall_post,
  addHomePost: add_home_post,
  checkFriendship: check_friendship,
  userLookupPromise: users_lookup_promise,
  getFriendsPromise: get_friends_promise,
  getWallPost: get_wall_post,
  getHomePost: get_home_post,
  addHomePost2: add_home_post_2,
  makeComment: make_comment,
  addCategories: add_categories,
  deleteCategory: delete_category
};

module.exports = database;