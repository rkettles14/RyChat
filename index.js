const { urlencoded } = require('express');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
const { disconnect } = require('process');


app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Socket id:' + socket.id + ' has connected');
    var user = getRandomUsername();
    var color = getRandomColor();

    //check if new user
    if (!socket.handshake.headers.cookie) {
        socket.handshake.headers.cookie = "username=" + user + "; " + "color=" + color;
        io.to(socket.id).emit('send user', {
            username: user,
            color: color
        });
        //send cache to client
        fs.readFile(__dirname + '/cache.json', (err, data) => {
            if (err) throw err;
            var json = JSON.parse(data);
            if (json.length !== 0) {
                io.to(socket.id).emit('get cache', JSON.parse(data))
            }
        });

        //write to user log
        fs.readFile(__dirname + '/users.json', (err, data) => {
            if (err) throw err;
            var json = JSON.parse(data);
            json.push({ username: user, color: color });
            sendOnlineUsers(json)
            json = JSON.stringify(json, null, 2);
            fs.writeFile(__dirname + '/users.json', json, (err) => {
                if (err) throw err;
                console.log('Cache updated');
            });
        });
    } else {
        //record user in user log
        fs.readFile(__dirname + '/users.json', (err, data) => {
            if (err) throw err;
            var json = JSON.parse(data);
            json.push({ username: parseUsername(socket.handshake.headers.cookie), color: parseColor(socket.handshake.headers.cookie) });
            sendOnlineUsers(json)
            json = JSON.stringify(json, null, 2);
            fs.writeFile(__dirname + '/users.json', json, (err) => {
                if (err) throw err;
                console.log('Cache updated');
            });
        });
    }

    socket.on('disconnect', () => {
        fs.readFile(__dirname + '/users.json', (err, data) => {
            if (err) throw err;
            var json = JSON.parse(data);
            var name = socket.handshake.headers.cookie ? parseUsername(socket.handshake.headers.cookie) : user; //if this is initial connection or not
            for (let i = 0; i < json.length; i++) {
                if (json[i].username == name) {
                    json.splice(i, 1);
                    break;
                }
            }
            sendOnlineUsers(json)
            json = JSON.stringify(json, null, 2);
            fs.writeFile(__dirname + '/users.json', json, (err) => {
                if (err) throw err;
                console.log('Cache updated');
            });
        });
    });

    socket.on('refresh chat', () => {
        fs.readFile(__dirname + '/cache.json', (err, data) => {
            if (err) throw err;
            var json = JSON.parse(data);
            if (json.length !== 0) {
                io.emit('get cache', JSON.parse(data))
            }
        });
    })

    socket.on('clear cache', () => {
        emptyArray = "[]";
        fs.writeFile(__dirname + '/cache.json', emptyArray, (err) => {
            if (err) throw err;
            console.log("cache cleared");
        });
    })

    socket.on('update username', function(credentials, callback) {
        var isSuccess = true;

        var cache = readFile('/cache.json');
        cache.forEach(element => {
            if (element.user === credentials.newName) {
                isSuccess = false;
            }
        });

        var users = readFile('/users.json');
        users.forEach(element => {
            if (element.username === credentials.newName) {
                isSuccess = false;
            }
        });

        if (isSuccess) {
            //update username in cache
            cache.forEach(element => {
                if (element.user === credentials.oldName) {
                    element.user = credentials.newName;
                }
            });

            writeFile('/cache.json', cache);

            //update username in cache
            users.forEach(element => {
                if (element.username === credentials.oldName) {
                    element.username = credentials.newName;
                }
            });

            setUsernameCookie(credentials.newName, this); //TODO: fix for new user!!!
            writeFile('/users.json', users);
            sendOnlineUsers(users);
        }

        callback(isSuccess);
    });

    socket.on('update color', function(credentials, callback) {
        var isSuccess = true;
        if (credentials.newColor.length != 6 || !/^[0-9a-fA-F]+$/.test(credentials.newColor)) {
            isSuccess = false;
        }
        credentials.newColor = "#" + credentials.newColor;
        var cache = readFile('/cache.json');
        cache.forEach(element => {
            if (element.color === credentials.newColor) {
                isSuccess = false;
            }
        });

        var users = readFile('/users.json');
        users.forEach(element => {
            if (element.color === credentials.newColor) {
                isSuccess = false;
            }
        });

        if (isSuccess) {
            //update username in cache
            cache.forEach(element => {
                if (element.color === credentials.oldColor) {
                    element.color = credentials.newColor;
                }
            });

            writeFile('/cache.json', cache);

            //update username in user log
            users.forEach(element => {
                if (element.color === credentials.oldColor) {
                    element.color = credentials.newColor;
                }
            });

            setColorCookie(credentials.newColor, this);
            writeFile('/users.json', users);
            sendOnlineUsers(users);
        }

        callback(isSuccess, credentials.newColor);
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

function parseUsername(cookie) {
    return cookie.split('; ').find(row => row.startsWith('username')).split('=')[1];
}

function setUsernameCookie(name, socket) {
    var color = parseColor(socket.handshake.headers.cookie);
    socket.handshake.headers.cookie = "username=" + name + "; color=" + color;
    //TODo fix for no cookies.
}

function setColorCookie(color, socket) {
    var name = parseUsername(socket.handshake.headers.cookie);
    socket.handshake.headers.cookie = "username=" + name + "; color=" + color;
}

function parseColor(cookie) {
    return cookie.split('; ').find(row => row.startsWith('color')).split('=')[1];
}

function readFile(fileName) {
    var json = fs.readFileSync(__dirname + fileName);
    return JSON.parse(json);
}

function writeFile(fileName, json) {
    json = JSON.stringify(json, null, 4);
    fs.writeFileSync(__dirname + fileName, json)
    console.log('file updated');
}

function sendOnlineUsers(json) {
    var temp = [];
    json.forEach(element => {
        temp.push(JSON.stringify(element));
    })
    temp = temp.filter((v, i, a) => {
        return a.indexOf((v)) == i; //remove duplicates
    });
    var userArray = [];
    temp.forEach(element => {
        userArray.push(JSON.parse(element));
    })
    io.emit('get online users', userArray); //send online users
}