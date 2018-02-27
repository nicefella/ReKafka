var express = require('express');
var ejs = require('ejs');
var ejsmate = require('ejs-mate');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();
var route = require('./route');
var data = require('./data');
var http = require('http');
var httpServer = http.createServer(app);
var io = require('socket.io').listen(httpServer);

if (process.env.REDISTOGO_URL) {

  var rtg = require("url").parse(process.env.REDISTOGO_URL);
  var red = require("redis").createClient(rtg.port, rtg.hostname);
} else {
  var red = require("redis").createClient();
}

red.flushall();


app.set('port', process.env.PORT || 1881);
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejsmate);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ extended: true }));
app.use("/statics", express.static(__dirname + '/statics'));
app.get('/', route.main);


var d = new data.RealTimeData([416011, 416012, 416013, 416017, 416019]); 
    d.initHistory();

io.on('connection', function(socket){

var kafka = require('kafka-node'),
  Consumer = kafka.Consumer,
  Offset = kafka.Offset
  ;

var options = { kafkaHost: 'kafkaserver.domain.com.tr:9092' };
var kafkaClient = new kafka.KafkaClient(options);

var topic = 'sensors';
var topics = [
  {topic: topic, partition: 0}
];
var options2 = {fromOffset: true};
var consumer = new Consumer(kafkaClient, [], options2);
var offset = new Offset(kafkaClient);
consumer.addTopics(topics, () => console.log("topics added"));

function emitSensorData(sensorid, data) {
  d.pushHistory(sensorid, data[0]);
    red.smembers("sensor"+sensorid, function(e, sockets) {
      for (var i = 0; i < sockets.length; i ++) {
        var socketid = sockets[i];
        data.push(d.getAverage(sensorid));
        io.to(socketid).emit("push", data);
      }
    });
}


  function changeSensor(from, to, socketid) {
    red.srem("sensor"+from, socketid);
    red.sadd("sensor"+to, socketid);
    console.log("changesensor " + from + " to " + to );
  }


  console.log('hello i am connected years old');

  red.incr("ONLINEUSERS");
  red.get("ONLINEUSERS", function(e, reply) {
    console.log("online users : " + reply.toString());
  });


red.sadd("sensor416013", socket.id);
socket.emit('init', d.history(416013));

socket.on("changesensor", function(msg) {
  var fromsensor = msg.from,
      tosensor = msg.to,
      socketid = socket.id;
      changeSensor(fromsensor, tosensor, socketid);
      socket.emit("resetchart", [d.history(tosensor), d.getAverage(tosensor) == null ? 0 : d.getAverage(tosensor)]);

});


  consumer.on('message', function(message) {
  var jsonMessage = JSON.parse(message.value.replace(/'/g,'"'));
  var 
      server_time = Date.parse(jsonMessage.server_time.split('.')[0])/1000, 
      sensorId = parseInt(jsonMessage.sensorId,10),
      TotalCurrent =jsonMessage.TotalCurrent,
      MeanVoltage =jsonMessage.MeanVoltage,
      TotalEnergy =jsonMessage.TotalEnergy,
      CurrentActivePower =jsonMessage.CurrentActivePower
  ;
  emitSensorData(sensorId, [{ time: server_time, y: CurrentActivePower}]);
});


consumer.on('offsetOutOfRange', function(err) {
  console.log(err);
});

consumer.on('error', function(error) {
  console.log(error);
});

  socket.on('disconnect', function(){
    console.log('i am now disconnected see you later');
    red.decr("ONLINEUSERS");

    consumer.close(function() {
      console.log("consumer closed");
    });


  });

});



app.use(function(req, res){
 res.status(404);
 res.type('txt').send('404 go back to the shadow!');
});


httpServer.listen(1881, function(){
  console.log('believe me, realtime service is running');
});
