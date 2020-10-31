// var http = require("http").createServer(handler); //require http server, and create server with function handler()
// var fs = require("fs"); //require filesystem module
// var io = require("socket.io")(http); //require socket.io module and pass the http object (server)
// var Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO
// var LED = new Gpio(4, "out"); //use GPIO pin 4 as output
// var pushButton = new Gpio(17, "in", "both"); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled
// var lightvalue = 0; //static variable for current status
//
// http.listen(8080); //listen to port 8080
//
// function handler(req, res) {
//   //create server
//   fs.readFile(__dirname + "/public/index.html", function (err, data) {
//     //read file index.html in public folder
//     if (err) {
//       res.writeHead(404, { "Content-Type": "text/html" }); //display 404 on error
//       return res.end("404 Not Found");
//     }
//     res.writeHead(200, { "Content-Type": "text/html" }); //write HTML
//     res.write(data); //write data from index.html
//     return res.end();
//   });
// }

var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(8080);

var Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO
var LED = new Gpio(4, "out"); //use GPIO pin 4 as output
var pushButton = new Gpio(17, "in", "both"); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled
var lightvalue = 0; //static variable for current status

pushButton.watch(function (err, value) {
  //Watch for hardware interrupts on pushButton
  if (err) {
    //if an error
    console.error("There was an error Offline", err); //output error message to console
    return;
  }
  console.log("Read Button Offline:", value);
  lightvalue = value;
  console.log("lightvalue:", lightvalue);

  if (lightvalue != LED.readSync()) {
    console.log("Listen Led Offline");
    //only change LED if status has changed
    LED.writeSync(lightvalue); //turn LED on or off
  }
});

io.sockets.on("connection", function (socket) {
  socket.emit("light-start", lightvalue); //send button status to client

  // WebSocket Connection
  pushButton.watch(function (err, value) {
    //Watch for hardware interrupts on pushButton
    if (err) {
      //if an error
      console.error("There was an error Online", err); //output error message to console
      return;
    }
    console.log("Read Button Online:", value);
    lightvalue = value;
    socket.emit("light", lightvalue); //send button status to client
  });

  socket.on("light", function (data) {
    //get light switch status from client
    lightvalue = data;
    console.log("Listen Led Online:", data);
    if (lightvalue != LED.readSync()) {
      //only change LED if status has changed
      LED.writeSync(lightvalue); //turn LED on or off
    }
    socket.broadcast.emit("light-broadcast", lightvalue);
  });
});

app.get("/", function (req, res) {
  res.render("ledButton");
});

// call function when stop server
process.on("SIGINT", function () {
  //on ctrl+c
  LED.writeSync(0); // Turn LED off
  LED.unexport(); // Unexport LED GPIO to free resources
  pushButton.unexport(); // Unexport Button GPIO to free resources
  console.log("server stop!");
  process.exit(); //exit completely
});
