var socket = io();
var chat = new Vue({
    el: "#chat",
    data: {
        messages: []
    },
    updated: function() {
        var container = this.$el.querySelector("#container");
        container.scrollTop = container.scrollHeight;
    },
});

var textInput = new Vue({
    el: "#input",
    data: {
        message: "",
    },
    methods: {
        sendMessage: function(e) {
            e.preventDefault(); // prevents page reloading
            //check for username change
            if (this.message.startsWith("/name <") && this.message.endsWith(">")) {
                //parse new username 
                var newName = this.message.substring(this.message.indexOf('<') + 1, this.message.lastIndexOf('>'));
                var oldName = getUsername();
                socket.emit(
                    'update username', {
                        newName: newName,
                        oldName: oldName
                    },
                    function(success) {
                        if (success) {
                            document.cookie = "username=" + newName + ";max-age=31536000";
                            refreshChat();
                        } else {
                            alert("That username has already been taken!");
                        }
                    }
                );
                this.message = "";
                return false;
            }
            //check for color change
            else if (this.message.startsWith("/color ")) {
                //parse new color 
                var newColor = this.message.split(" ")[1];
                var oldColor = getColor();
                socket.emit(
                    'update color', {
                        newColor: newColor,
                        oldColor: oldColor
                    },
                    function(success, color) {
                        if (success) {
                            document.cookie = "color=" + color + ";max-age=31536000";
                            refreshChat();
                        } else {
                            alert("That color is invalid or has already been taken!\nPlease specify a color in the following format: \'/color RRGGBB\'");
                        }
                    }
                );
                this.message = "";
                return false;
            } else if (this.message === "/clear-cache") {
                socket.emit('clear cache');
                refreshChat();
                this.message = "";
                return false;
            } else if (this.message.startsWith("/")) {
                alert("Sorry this command is not supported.")
                this.message = "";
                return false;
            }

            socket.emit('chat message', {
                message: this.message,
                user: getUsername(),
                color: getColor(),
                timeStamp: new Date()
            });
            this.message = "";
            return false;
        }
    }
});

var userDisplay = new Vue({
    el: "#display",
    data: {
        users: []
    }
});

function getUsername() {
    return document.cookie ? document.cookie.split('; ').find(row => row.startsWith('username')).split('=')[1] : undefined;
}

function getColor() {
    return color = document.cookie ? document.cookie.split('; ').find(row => row.startsWith('color')).split('=')[1] : undefined;
}

function refreshChat() {
    chat.messages = [];
    $('#name').html(getUsername());
    $('#name').css("color", getColor());
    $('.btn').css("background-color", getColor());
    socket.emit('refresh chat');
}

socket.on('connect', () => {
    if (document.cookie) {
        refreshChat();
    }
});


socket.on('send user', function(user) {
    document.cookie = "username=" + user.username + ";max-age=31536000";
    document.cookie = "color=" + user.color + ";max-age=31536000";
    $('#name').html(user.username);
    $('#name').css("color", user.color);
    $('.btn').css("background-color", user.color);
});

socket.on('get cache', (cache) => {
    chat.messages = [];
    cache.forEach(msg => {
        var timeStamp = new Date(msg.timeStamp);
        msg.message = msg.message.replace(":)", String.fromCodePoint(128513));
        msg.message = msg.message.replace(":(", String.fromCodePoint(128577));
        msg.message = msg.message.replace(":o", String.fromCodePoint(128562));
        chat.messages.push({
            user: msg.user + ":",
            text: msg.message,
            timeStamp: timeStamp.getHours() + ':' + (timeStamp.getMinutes() < 10 ? "0" : "") + timeStamp.getMinutes(),
            style: {
                color: msg.color,
                fontWeight: msg.user == getUsername() ? "bold" : "normal"
            }
        });
    });
});

socket.on('get online users', (users) => {
    userDisplay.users = [];
    users.forEach(element => {
        userDisplay.users.push({
            name: element.username,
            style: {
                color: element.color,
            }
        });
    });
});

socket.on('chat message', function(msg) {
    var timeStamp = new Date(msg.timeStamp);
    msg.message = msg.message.replace(":)", String.fromCodePoint(128513));
    msg.message = msg.message.replace(":(", String.fromCodePoint(128577));
    msg.message = msg.message.replace(":o", String.fromCodePoint(128562));
    chat.messages.push({
        user: msg.user + ":",
        text: msg.message,
        timeStamp: timeStamp.getHours() + ':' + (timeStamp.getMinutes() < 10 ? "0" : "") + timeStamp.getMinutes(),
        style: {
            color: msg.color,
            fontWeight: msg.user == getUsername() ? "bold" : "normal"
        }
    });
});