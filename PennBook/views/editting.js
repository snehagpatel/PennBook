  	var socket = io();
	var user;


	$(document).ready(function(){
		$.get("/getuser", function(data){
			user = JSON.parse(data);
			$("footer").html("Logged in as: " + user);
		});
	
		// handling an individual invite that the user can accept or decline
		socket.on("individual chat invite", function(data){
			if (data.receiver == user){
				if(confirm("You have a chat invite! Click OK to redirect and view.")){
					// tells the original sender to resend, giving back the invite data
					window.location.href = "/chat";
					socket.emit("individual invite resend", {
						receiver: data.receiver,
						sender: data.sender
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
		
		//EXISTING
		socket.on("existing gc invite", function(data){
			if (data.receiver == user){
				if(confirm("You have a chat invite! Click OK to redirect and view.")){
					// tells the original sender to resend, giving back the invite data
					window.location.href = "/chat";
					socket.emit("existing invite resend", {
						receiver: data.receiver,
						sender: data.sender,//og sender
						groupid: data.groupid,
						info: data.info
					});
				} else {
					console.log('she don\'t want you man go home');
					socket.emit("existing gc decline", {
						receivers : data.info.Items[0].people.SS,
						sender : data.receiver,
					});
				}
			}
		});	
		
		socket.on("new gc invite", function(data){
			if (data.receiver == user){
				if (confirm("You have a chat invite! Click OK to redirect and view.")){
					window.location.href = "/chat";
					socket.emit("new gc invite", { 
						receiver: data.receiver,
						sender: data.sender,
						currentchatid: data.currentchatid,
						info: data.info
					});
				} else {
					socket.emit("new gc decline", {
						sender: data.receiver,
						receivers: data.info.Items[0].people.SS,
						chatinfo: data.info.Items[0]
					});
				}
			}
		});
	});  	