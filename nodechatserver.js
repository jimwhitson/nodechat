var http = require("http"),  
    url = require("url"),  
    path = require("path"),  
    fs = require("fs"),
    mongoose = require("mongoose"),
    events = require("events");  
  
var responses = [];
var getRoutes = {};
var postRoutes = {};

function handle404(req, res) {
  var text = "404";
  res.writeHead(404, { "Content-Type": "text/plain"
                     , "Content-Length": text.length
                     });
  res.end(text);
}



function handleRequest(req, res, next){
  if (req.method === "GET" || req.method === "HEAD") {
    var handler = getRoutes[url.parse(req.url).pathname] || handle404;
    res.simpleText = function (code, body) {
      res.writeHead(code, { "Content-Type": "text/plain"
                          , "Content-Length": body.length
                          });
      res.end(body);
    };

    res.simpleJSON = function (code, obj) {
      var body = new Buffer(JSON.stringify(obj));
      res.writeHead(code, { "Content-Type": "text/json"
                          , "Content-Length": body.length
                          });
      res.end(body);
    };

    handler(req, res);
  }

}

function recvMsg(req, res){
    	responses.push({ 'timestamp': new Date(), 'response': res});
}

var Schema = mongoose.Schema;
var Message = new Schema({
  id: String,
  msg: String,
  timestamp: {type: String, required: true, default: 'never'}
});

mongoose.model('Message', Message);
var MessageModel = mongoose.model('Message');
mongoose.connect('mongodb://localhost/testdb');

function sendMsg(req, res) {
  var msgObj = url.parse(req.url, true).query;
  var msg = msgObj.msg;
  var id  = msgObj.id;
  var message = new MessageModel();
  message.id = id;
  message.msg = msg;
  message.timestamp = new Date();
  message.save(function(e) {
    if(e){console.log(e);}
  });
  // send to all waiting clients and delete (they will reconnect)
  while(responses.length>0){
    responses[0].response.simpleJSON(200, {'msg': id+' : ' + msg});
    responses.splice(0,1);
  }
  
  res.end(">" +  msg);
}

getRoutes['/send'] = sendMsg;
getRoutes['/recv'] = recvMsg;

var connect = require('connect');
var app = connect().use(connect.static(__dirname)).use(handleRequest);
app.listen(8080);
console.log("Server running at http://localhost:8080/");  
