var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var counter = 1;

app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Socket id:' + socket.id + ' has connected');
    io.to(socket.id).send("User" + counter);
    counter++;
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

io.on('reconnect', (socket) => {
    console.log('Socket id:' + socket.id + ' has reconnected');
})

http.listen(3000, () => {
    console.log('listening on *:3000');
});