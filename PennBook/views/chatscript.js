// when chat page turns up, no chat room is selected
var chat = false;
var socket = io();
var messages = [];
var chatid = "";
var user;
var chatnames = [];
var group = false;
var actives = [];



//make changes to HTML that opens chat part
function openHTMLchat(){
	$(".left").removeClass("fullWidth");
	$(".right").show();
	//$("#roomBtn").html(" <u>Exit chat</u> ");
	$("#no-chats-open").hide();
	$("#chat-open").show();
	$("#chat-open-2").show();
	$("#roomBtn").hide();
	$("#exitBtn").show();
	if (actives.length != 0){
		var s = '<select id="active-user-chat-select" class="custom-select"><option selected>--Select friend--</option>';
		for (var i = 0; i < actives.length; i++){
			s = s + '<option value="'+ actives[i] + '">'+ actives[i] + '</option>';
		}
		s = s + '</select>'
		//<button type="Submit" class="w-100 btn btn-primary"> Invite to Chat! </button>
		$("#friend-form-group").html(s);
	} else{
		$("#friend-form-group").html("<span> No friends active :( </span>")
	}
}

//make changes to HTML that closes chat part
function closeHTMLchat(){
	$(".left").addClass("fillWidth");
	$(".right").hide();
	$("#no-chats-open").show()
	$("#chat-open").hide()
	$("#chat-open-2").hide()
	$("#messages").html("");
	$("#roomBtn").show();
	$("#exitBtn").hide();
}

// individually leave the chat
function exitChat(){
	chat = false;
	socket.emit("leave room", {
		sender: user,
		chatid: chatid
	});
	closeHTMLchat();
	chatid = '';
}

//data.messages = msg_list
function putPastMessages(msg_list){
	for (var i = 0; i < msg_list.length; i++) {
		msg = msg_list[i].M;
		var message_temp = document.createElement('li');
		if (user == msg.sender.S){
			//message_temp.setAttribute("class", "font-weight-bold");
			message_temp.setAttribute("style", "word-break: break-all; background-color:#E6F0FF; outline: 1px solid #F8F9FA;");
		} else {
			//message_temp.setAttribute("class", "other");
			message_temp.setAttribute("style", "word-break: break-all; border-color: white");

		}
		//message_temp.setAttribute("style", "word-break: break-all");
		message_temp.appendChild(document.createTextNode(msg.sender.S + ": " + msg.content.S));
		$("#messages").append(message_temp);
		$("#messages").animate({
			scrollTop: $('#messages').get(0).scrollHeight
		}, 0);
	}
}

//given chatnames, get the chatid needed and join chat for specific id in socket
function loadChat(){
	chatnames.push(user);
	$.post("/findchatid", {chatter: chatnames}, function(chat_data){
		if (chat_data.success){
			chatid = chat_data.room;
			$.post("/joinchat", {chatroom: chatid}, function(join_data){
				if (join_data.success) {
					chat = true;
					socket.emit("join room", {
						sender: user,
						chatid: chatid
					});
					// open up the chat portion
					openHTMLchat();
					// load previous messages
					putPastMessages(join_data.messages);
					
				}
			});
		}
	});		
}

function loadGC(){
	$.post("/joinchat", {chatroom: chatid}, function(join_data){
		if (join_data.success) {
			chat = true;
			socket.emit("join room", {
				sender: user,
				chatid: chatid
			});
			// open up the chat portion
			openHTMLchat();
		}
	});			
}

// when user hits send, socket io message should be sent to
// server with information about the message, sufficient
// enough to write the message into the Chat database.
// 		i.e. in chat database, it needs to find the chat item,
//			 and update the messages list by pushing a message
var sendChat = function(){
	if($("#input").val().trim() !== ''){
		var hypothetical = {
			text: $("#input").val().trim(),
			sender: user,
			time: Date.now(),
			messageID: messages.length
		};
		messages.push(hypothetical);
		$.post("/addmsg", {msg_info: hypothetical, room: chatid}, function(err, data){
			if (err){
				console.log(err);
			} else if (data.success){
			}
		});
		
		// emits the chat message, which should make a message object
		// that is added to the messages attribute
		socket.emit("chat message", {
			text: $("#input").val().trim(),
			sender: user,
			chatid: chatid,
			time: Date.now(),
			messageID: messages.length
		});
		$("#input").val('');
		$("#input").focus();
	}
}

// changes the way group chat is created/editted
// if its a two-way conversation right now, need to emit a 'create group 
// chat' thing 
var groupAdd = function(){
	var currentSelect = document.getElementById( "active-user-chat-select" );
	var new_person = currentSelect.options[ currentSelect.selectedIndex ].value
	if (group){
		$.get("/getchatdata", {room: chatid}, function(data){
			if (data.success){
				var current_members = data.info.Items[0].people.SS;
				var dup = false;
				for (var i = 0; i < current_members.length; i++){
					if (current_members[i] == new_person){
						console.log("duplicate found")
						dup = true;
					}
				}
				if (dup) {
					alert("User already in coversation");
				} else {
					var current_members = data.info.Items[0].people.SS;
					socket.emit("existing gc invite", {
						receiver: new_person,
						groupid: chatid,
						info: data.info
					});
				}
			}
		});
	} else {
		$.get("/getchatdata", {room: chatid}, function(data){
			 if (data.success){
				var current_members = data.info.Items[0].people.SS;
				var dup = false;
				for (var i = 0; i < current_members.length; i++){
					if (current_members[i] == new_person){
						console.log("duplicate found")
						dup = true;
					}
				}
				if (dup) {
					alert("User already in coversation");
				} else {
					var current_members = data.info.Items[0].people.SS;
					socket.emit("existing gc invite", {
						receiver: new_person,
						groupid: chatid,
						info: data.info
					});
				}
			}
		});	
	}
}

var refreshTime = function() {
    $("#clock").html((new Date()).toString());
    setTimeout(refreshTime, 1000); /* 1000 ms */
  };

// update actives list
var refreshActives = function() {
	$.get("/getactives", function(data){
		actives = data;
		if (actives.length != 0){
			var s = '<select id="active-user-chat-select" class="custom-select"><option selected>--Select friend--</option>';
			for (var i = 0; i < actives.length; i++){
				s = s + '<option value="'+ actives[i] + '">'+ actives[i] + '</option>';
			}
			s = s + '</select>'
			//<button type="Submit" class="w-100 btn btn-primary"> Invite to Chat! </button>
			$("#friend-form-group").html(s);
		}
	});
	setTimeout(refreshActives, 10000);
}

// General document stuff
$(document).ready(function() {
	$.get("/getuser", function(data){
		user = JSON.parse(data);
		console.log("DATA: " +data);
		$("footer").html("Logged in as: " + user);
	});
	
	// left div is full width when document first appears
	$(".left").addClass("fullWidth");
	$(".right").hide();
	$("#chat-open").hide();
	$("#chat-open-2").hide()
	$("#exitBtn").hide();
	// compile an html list of which friends are active for input
	$.get("/getactives", function(data){
		actives = data;
		if (actives.length != 0){
			var s = '<select id="active-user-chat-select" class="custom-select"><option selected>--Select friend--</option>';
			for (var i = 0; i < actives.length; i++){
				s = s + '<option value="'+ actives[i] + '">'+ actives[i] + '</option>';
			}
			s = s + '</select>'
			//<button type="Submit" class="w-100 btn btn-primary"> Invite to Chat! </button>
			$("#friend-form-group").html(s);
		}
	});
	
	setTimeout(refreshActives, 10000);
	
	// socket listens for messages, and if its a message in the right chat
	// adds it to the html
	socket.on("chat message", function(msg){
		// if the client receives a chat msg, we want it to appear if
		// the msg chatid is the same as the chat's current id'
		var message_temp = document.createElement('li');
		if (user == msg.sender){
			message_temp.setAttribute("style", "word-break: break-all; background-color:#E6F0FF; outline: 1px solid #F8F9FA;");
		} else {
			message_temp.setAttribute("style", "word-break: break-all; border-color: white;");
		}
		//message_temp.setAttribute("style", "word-break: break-all");
		message_temp.appendChild(document.createTextNode(msg.sender + ": " + msg.text));
		$("#messages").append(message_temp);
		$("#messages").animate({
			scrollTop: $('#messages').get(0).scrollHeight
		}, 0);
	});
	
	socket.on("individual leave", function(data){
		if (data.room == chatid){
			exitChat();
			alert("The other user has left the chat.");
		}
	});
	
	socket.on("individual chat accept", function(data){
		if (data.receiver == user){
			chatnames = [];
			var new_person = data.sender;
			chatnames.push(new_person);
			chatid = data.id;
			loadGC();
			putPastMessages(data.messages);
		}
	});
	
	socket.on("individual chat decline", function(data){
		if (data.receiver == user) {
			alert(data.sender + " is unable to chat right now");
		}
	});
	
	// handling an invite that the user can accept or decline
	socket.on("individual chat invite", function(data){
		if (data.receiver == user){
			if(confirm(data.sender + " wants to chat. Click OK to accept invite.")){
				chatnames = [];
				var new_person = data.sender;
				chatnames.push(new_person);
				chatnames.push(user);
				$.post("/findchatid", {chatter: chatnames}, function(chat_data){
					console.log('calling findchatid for the person who invited:');
					if (chat_data.success){
						chatid = chat_data.room;
						$.get("/getchatdata", {room: chatid} , function(chat_info){
							if (chat_info.success){
								socket.emit("individual chat accept", {
									receiver : data.sender,
									sender : data.receiver,
									id : chatid,
									messages : chat_info.info.Items[0].messages.L
								});
							}
						});

						console.log("chatid for " + chatnames + "," + user + "is: " + chatid);
						$.post("/joinchat", {chatroom: chatid}, function(join_data){
							if (join_data.success) {
								console.log("opening chat for " + user);
								chat = true;
								console.log("3");
								socket.emit("join room", {
									sender: user,
									chatid: chatid
								});
								// open up the chat portion
								openHTMLchat();
								// load previous messages
								putPastMessages(join_data.messages);
								
							}
						});
					}
				});	
			} else {
				console.log('she don\'t want you man go home');
				socket.emit("individual chat decline", {
					receiver : data.sender,
					sender : data.receiver,
				});
			}
		}
	});
	
	socket.on("existing gc invite", function(data){
		if (data.receiver == user) {
			if (confirm(data.info.Items[0].people.SS + " want you to join a group chat with them. Click OK to join!")){
				group = true;
				chatid = data.info.Items[0].id.S;
				var ppl = data.info.Items[0].people.SS;
				ppl.push(user);
				$.post("/joingc", {gc: chatid, p: ppl}, function(data_update){
					if (data_update.success){
						loadGC();
						// get the existing gc chat id. join it
						socket.emit("existing gc accept", {
							sender: data.receiver,
							receivers: data.info.Items[0].people.SS,
						});
					}
				});

				
			} else {
				socket.emit("existing gc decline", {
					sender: data.receiver,
					receivers: data.info.Items[0].people.SS,
				});
				
			}
		}
	});
	
	socket.on("existing gc accept", function(obj){
		for (var i = 0; i < obj.receivers.length; i++){
			if (obj.receivers[i] == user){
				alert(obj.sender + " has joined the group chat!");
			}
		}
	});
	
	socket.on("existing gc decline", function(obj){
		for (var i = 0; i < obj.receivers.length; i++){
			if (obj.receivers[i] == user){
				alert(obj.sender + " cannot join the group chat at this time.");
			}
		}		
	});
	
	socket.on("new gc invite", function(data){
		if (data.receiver == user) {
			if (confirm(data.info.Items[0].people.SS + " would like to form a group chat with you. Click OK to join!")){
				var old_id = data.info.Items[0].id.S;
				group = true
				$.get("/makegc", {invited: user, oldchat: data.info.Items[0]}, function(gcdata){
					chatid = gcdata.gcroom;
					//closes individual chat happening
					socket.emit("individual leave", {
						room: old_id
					});
					// tells those individuals to open the new gc id
					socket.emit("new gc accept", {
						sender: data.receiver,
						receivers: data.info.Items[0].people.SS,
						gc_id : chatid,
					});
					loadGC();
				})
			} else {
				socket.emit("new gc decline", {
					sender: data.receiver,
					receivers: data.info.Items[0].people.SS,
					chatinfo: data.info.Items[0]
				});
			}
		}
	});
	
	socket.on("new gc accept", function(obj){
		for (var i = 0; i < obj.receivers.length; i++){
			if (obj.receivers[i] == user){
				chatid = obj.gc_id;
				group = true
				loadGC();
				alert("Group chat created!");
			}
		}
	});
	
	socket.on("new gc decline", function(obj){
		 for (var i = 0; i < obj.receivers.length; i++){
			if (obj.receivers[i] == user){
				alert(obj.sender + " cannot make a group chat at this time");
			}
		}
	});
	
	

	
	// event handling of clicking the roomBtn (join/leave chats)
	$("#roomBtn").on("click", function(){
		if(!chat){
			/*no delete? not sure
			actives = actives.filter(function(item) {
			    return item !== currentSelect.options[ currentSelect.selectedIndex ].value
			})
			*/
			
			var currentSelect = document.getElementById( "active-user-chat-select" );
			var new_person = currentSelect.options[ currentSelect.selectedIndex ].value;
			// send invitation
			socket.emit("individual chat invite", {
				receiver: new_person,
				sender: user,
			});
		} else {
		}
	});
	
	$("#exitBtn").on("click", function(){
		console.log("exit!");
		if (group) {
			$.get("/getchatdata", {room: chatid}, function(data){
				if (data.success){
					var people_in_gc = data.info.Items[0].people.SS;
					if (people_in_gc.length == 1){
						$.post("/delgc", {room: chatid}, function(data_del){
							if (data_del.success){
								exitChat();
							}
						});
						// exit and delete the gc
					} else {
						// exti and remove current user from gc's people attribute
						$.post("/leavegc", {
							room: chatid, leaver: user, ppl: people_in_gc}, function(data_leave){
							if(data_leave.success){
								exitChat();
							}
						});
					}
				}
			});
		} else {
			socket.emit("individual leave", {
				room: chatid
			});
			exitChat();
		}
		group = false;
	});
	
	$("#groupAddBtn").on("click", groupAdd);
	
	
	$("#send-btn").on("click", sendChat);
});

