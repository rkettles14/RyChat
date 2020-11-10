var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');



app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Socket id:' + socket.id + ' has connected');

    //check if new user
    if (!socket.handshake.headers.cookie) {
        io.to(socket.id).emit('send user', {
            username: getRandomUsername(),
            color: getRandomColor()
        });
    }

    //send cache to client
    fs.readFile(__dirname + '/cache.json', (err, data) => {
        if (err) throw err;
        var json = JSON.parse(data);
        if (json.length !== 0) {
            io.to(socket.id).emit('get cache', JSON.parse(data))
        }
    });

    socket.on('refresh chat', () => {
        fs.readFile(__dirname + '/cache.json', (err, data) => {
            if (err) throw err;
            var json = JSON.parse(data);
            if (json.length !== 0) {
                io.to(socket.id).emit('get cache', JSON.parse(data))
            }
        });
    })

    socket.on('update username', function(credentials, callback) {
        var isSuccess = true;
        //add message to cache
        fs.readFile(__dirname + '/cache.json', function(err, data) {
            if (err) throw err;

            var json = JSON.parse(data);
            //iterate through to see if new name is unique
            json.forEach(element => {
                if (element.user === credentials.newName) {
                    isSuccess = false;
                }
            });

            if (isSuccess) {
                //update username in log
                json.forEach(element => {
                    if (element.user === credentials.oldName) {
                        element.user = credentials.newName;
                    }
                });

                json = JSON.stringify(json, null, 4);
                fs.writeFile(__dirname + '/cache.json', json, (err) => {
                    if (err) throw err;
                    console.log('Cache updated');
                });
            }
            callback(isSuccess);
        });
    });

    socket.on('update color', function(credentials, callback) {
        var isSuccess = true;
        if (credentials.newColor.length != 9 || !/^\d+$/.test(credentials.newColor)) {
            isSuccess = false;
        }
        let newColor = "rgb(" + credentials.newColor.substring(0, 3) + "," + credentials.newColor.substring(3, 6) + "," + credentials.newColor.substring(6) + ")";
        fs.readFile(__dirname + '/cache.json', function(err, data) {
            if (err) throw err;

            var json = JSON.parse(data);
            //iterate through to see if new name is unique
            json.forEach(element => {
                if (element.color === newColor) {
                    isSuccess = false;
                }
            });

            if (isSuccess) {
                //update username in log
                json.forEach(element => {
                    if (element.color === credentials.oldColor) {
                        element.color = newColor;
                    }
                });

                json = JSON.stringify(json, null, 4);
                fs.writeFile(__dirname + '/cache.json', json, (err) => {
                    if (err) throw err;
                    console.log('Cache updated');
                });
            }
            callback(isSuccess, newColor);
        });
    });


    socket.on('chat message', (msg) => {
        //add message to cache
        fs.readFile(__dirname + '/cache.json', (err, data) => {
            if (err) throw err;

            //ensure cache is no bigger than 200
            var json = JSON.parse(data);
            if (json.length >= 200) {
                json.splice(0, 1);
            }
            json.push(msg);
            json = JSON.stringify(json, null, 4);
            fs.writeFile(__dirname + '/cache.json', json, (err) => {
                if (err) throw err;
                console.log('Data written to file');
            });

        });
        io.emit('chat message', msg);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

function getRandomColor() {
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    return color;
}

function getRandomUsername() {
    return "User" + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
}