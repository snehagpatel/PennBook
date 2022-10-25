var express = require('express');
var bodyParser = require('body-parser')
//var morgan = require('morgan')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var serveStatic = require('serve-static')
var path = require('path')
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
//app.use(morgan('combined'));
app.use(cookieParser());
app.use(session({secret: "secretSession"}));
app.use(serveStatic(path.join(__dirname, 'public')))

app.get('/', function(req, res) {
	res.render('friendvisualizer.ejs');
});

app.get('/friendvisualization', function(req, res) {
	var json = {"id": "alice","name": "Alice","children": [{
        "id": "bob",
            "name": "Bob",
            "data": {},
            "children": [{
            	"id": "dylan",
            	"name": "Dylan",
            	"data": {},
            	"children": []
            }, {
            	"id": "marley",
            	"name": "Marley",
            	"data": {},
            	"children": []
            }]
        }, {
            "id": "charlie",
            "name": "Charlie",
            "data": {},
            "children": [{
                "id":"bob"
            }]
        }, {
            "id": "david",
            "name": "David",
            "data": {},
            "children": []
        }, {
            "id": "peter",
            "name": "Peter",
            "data": {},
            "children": []
        }, {
            "id": "michael",
            "name": "Michael",
            "data": {},
            "children": []
        }, {
            "id": "sarah",
            "name": "Sarah",
            "data": {},
            "children": []
        }],
        "data": []
    };
    res.send(json);
});

app.get('/getFriends/:user', function(req, res) {
    console.log(req.params.user);
    var newFriends = {"id": "alice","name": "Alice","children": [{
        "id": "james",
            "name": "James",
            "data": {},
            "children": [{
                "id": "arnold",
                "name": "Arnold",
                "data": {},
                "children": []
            }, {
                "id": "elvis",
                "name": "Elvis",
                "data": {},
                "children": []
            }]
        }, {
            "id": "craig",
            "name": "Craig",
            "data": {},
            "children": [{
                "id":"arnold"
            }]
        }, {
            "id": "amanda",
            "name": "Amanda",
            "data": {},
            "children": []
        }, {
            "id": "phoebe",
            "name": "Phoebe",
            "data": {},
            "children": []
        }, {
            "id": "spock",
            "name": "Spock",
            "data": {},
            "children": []
        }, {
            "id": "matt",
            "name": "Matthe",
            "data": {},
            "children": []
        }],
        "data": []
    };
    res.send(newFriends);
});

/* Run the server */
console.log('Running friend visualization on 127.0.0.1:8080');
app.listen(8080);
