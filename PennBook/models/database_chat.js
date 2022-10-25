var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var db_chat = new AWS.DynamoDB();
const { v4: uuidv4 } = require('uuid');


function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (var a of as) if (!bs.has(a)) return false;
    return true;
}

//function queries for given chat id's data
var get_chat_data = function(room, callback){
	var params = {
        TableName: "chat",
		KeyConditionExpression: "id = :r",
		ExpressionAttributeValues: {
			":r": {"S": room}
		}
    };
	db_chat.query(params, function(err, data) {
        if (err) {
			console.log('query error:');
			console.log(err);
			callback(err, null);
			
        } else {
			callback(err, data);
        }
    });
}

//function updates given chat id's messages list
var add_message = function(room, msg, callback){
	
	var params = {
	    TableName: "chat",
	    Key:{
	        "id": {S: room},
	    },
	    UpdateExpression: "SET messages = list_append(messages, :m)",
	    ExpressionAttributeValues:{
	        ":m": {L: [{M : {
				sender: {S: msg.sender},
				content: {S: msg.text},
				timestamp: {S: msg.time}
			}}]},
	    }
	};
	
	db_chat.updateItem(params, function() {
		callback();
	});
	
}

// function queries for currentUser's friends who are active
var get_active_friends = function(currentUser, callback) {
	// first get friends
	var params_friends = {
		TableName: "friends",
		KeyConditionExpression: "user1 = :u",
		ExpressionAttributeValues: {
			":u": {"S" : currentUser}
		}
	};
	db_chat.query(params_friends, function(err, data){
		if (err) {
			callback(err, null);
		} else {
			// if query works, need to go through the list and find those who 
			// are active, if any friends are even found
			var active_friends = [];
			var inc = 0;
			var friend_list = data.Items;
			// for each friend, get the item from the user database to see activity
			data.Items.forEach(function(item){
				var params = {
					TableName: "users",
					Key: {
						"username" : {"S": item.user2.S}
					}
				};
				db_chat.getItem(params, function(err, data){
					if (err) {
						callback(err, null);
					} else {
						// update active friends with a user if they are active
						if(data.Item){
							if (data.Item.active.BOOL){
								active_friends.push(data.Item.username.S)
							}
						}						
					}
					inc++;
					// if the dynamoDB calls have gone through the friends, callback the updated list
					if (inc === friend_list.length){
						callback(err, active_friends);
					}
				});
				
			});
		}
	});
}

// for the given potential chat c, check if it is in the list chat_lst
var contains_chat = function(chat_lst, c) {
	for (var i = 0; i < chat_lst.length; i ++){
		if(c.S == chat_lst[i].S){
			return true;
		}
	}
	return false;
}

// iterate through people and try to find a preexisting chat
var find_existing_id = function(people_list, callback){
	var potential_chats = [];
	var inc = 0;
	// iterate through list of users from people list
	// per user, query for specific user in users table
	for (var i = 0; i < people_list.length; i ++){
		var params = {
			TableName: "users",
			Key: {
				"username" : {"S": people_list[i]}
			}
		};
		db_chat.getItem(params, function(err, data){
			// if user is found in users table and is 
			// the first user in the list, initialize the potential chats
			// otherwise, filter the potentials that are also in the 
			// current user's chat attribute
			if (err) {
				callback(err, null);
				console.log('err');
			} else {
				if (inc === 0) {
					potential_chats = data.Item.chats.L;
				} else {
					var update = [];
					for (var j = 0; j < potential_chats.length; j++){
						if (contains_chat(data.Item.chats.L, potential_chats[j])) {
							update.push(potential_chats[j]);
						}
					}
					potential_chats = update;
				}
			}
			inc++;
			if (inc === people_list.length){
				callback(err, potential_chats);
			}
		});
	}
}

// given a list of people in the chat, 
// make a new chat item and return the id of the item
var add_chat = function(ppl, group, callback) {
	var m = [];
	var new_id = uuidv4();
	// make item in chat table
	var params_chat = {
		TableName : "chat",
		Item: {
			"id" : {S: new_id},
			"people": {SS: ppl},
			"messages" : {L: m},
			"group" : {BOOL: group},
		}
	}
	db_chat.putItem(params_chat, function(err, data_put){
		if (err){
			callback(err, null);
		} else {
			// update the users' chats attribute to include the given chat
			for (var i = 0; i < ppl.length; i++){
				var params = {
			        TableName:'users',
			        Key:{
			            "username": {S: ppl[i]},
			        },
			        UpdateExpression: "SET chats = list_append(chats, :n)",
			        ExpressionAttributeValues:{
			            ":n" : {L: [{S: new_id}]},
			        },
			        ReturnValues:"NONE"
				};
				db_chat.updateItem(params, function(err) {
					if (err){
						callback(err, null);
					}
				});
			}
			callback(err, new_id)
		}
	});	
}

// add group chat with ppl in chat table
var add_gc = function(ppl, callback){
	var m = [];
	var new_id = uuidv4();
	var params_chat = {
		TableName : "chat",
		Item: {
			"id" : {S: new_id},
			"people": {SS: ppl},
			"messages" : {L: m},
			"group" : {BOOL: true},
		}
	}
	db_chat.putItem(params_chat, function(err, data){
		if (err){
			console.log("(db_chat.js) error:" + err);
		} else {
			callback(new_id);
		}
	});
	
}

//set chat item with id id_chat to have ppl under their people attribute
var update_gc = function(id_chat, ppl, callback){
	var params = {
        TableName:'chat',
        Key:{
            "id": {"S": id_chat},
        },
        UpdateExpression: "SET people = :n",
        ExpressionAttributeValues:{
            ":n" : {"SS": ppl},
        },
        ReturnValues:"NONE"
	};
	db_chat.updateItem(params, function(err, data){
		if (err){
			console.log("db_chat error: " + err);
		} else{
			callback(data);
		}
	});
}


// iterate through chat list, pulling up the people attribute 
// and matching to ppl_list. 
// If equal, return respective chat, otherwise at the end return -1
var confirm_chat = function(ppl_list, chat_list, callback) {
	var inc = 0;
	var ppl_set = new Set(ppl_list);
	for (var i = 0; i < chat_list.length; i++) {
		var params = {
			TableName: "chat",
			Key: {
				"id" : chat_list[i]
			}
		}
		db_chat.getItem(params, function(err, data){
			inc ++;
			if (err) {
				callback(err, null);
			} else {
				var s = new Set(data.Item.people.SS);
				if (eqSet(ppl_set, s)){
					callback(err, data.Item.id.S);
				}
			}
		});
		if (inc == chat_list.length){
			callback(err, -1);
		}
	}
}



//given a room string as the chatid, delete from chat table
var del_chat = function(room, callback) {
	var params = {
		TableName : "chat",
		Key : {
			"id" : {S:room}
		}
	};
	db_chat.deleteItem(params, function(err, data){
		if (err) {
			console.log('error in deleting');
			console.log(err);
		} else{
			callback({success:true});
		}
	});
}

var filter_S_list = function(lst, x){
	var ind = 0;
	var ans = [];
	for (var i = 0; i < lst.length; i ++){
		if(x.S == lst[i]){
			ind = i;
		} else {
			ans.push(lst[i])
		}
	}
	return ans;
}

//chat id is string and user is string, l is people list
var remove_user_from_gc = function(c, u, l, callback){
	var user_list = filter_S_list(l, {S: u});
	var params = {
		TableName: "chat",
		Key : {
			"id": {S: c},
		},
		UpdateExpression: "SET people = :n",
		ExpressionAttributeValues: {
			":n" : {SS: user_list}
		},
	};
	db_chat.updateItem(params, function(err, data){
		if (err){
			console.log('error in updating gc');
			console.log(err);
		} else {
			callback({success: true});
		}
	});
}

var database = { 
  getChatData: get_chat_data,
  addMessage: add_message,
  getActives: get_active_friends,
  findExistingId: find_existing_id,
  addChat: add_chat,
  confirmChat: confirm_chat,
  delChat: del_chat,
  addGC: add_gc,
  updateGC: update_gc,
  removeUserFromGC: remove_user_from_gc,
};

module.exports = database;

























