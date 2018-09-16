// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
M.AutoInit();

let remote = require('electron').remote;
remote.getGlobal('ipdUser').username = "sesh";

let socket;

function recreateSocket (ip) {
    remote.getGlobal('ip').ip = ip;
    if (socket != undefined) socket.disconnect();
    socket = io(ip);
    socket.on('connection', function(data) {
        console.log("connected");
    });
    socket.on('vmlist', function (data) {
        remote.getGlobal('vms').object = data;
        window.location.href = "dashboard.html";
    });
    socket.on('login', function (data) {
        console.log("Recieved: " + data);
        if (data) {
            M.toast({html: 'Successfully logged in!'});
            remote.getGlobal('ipdUser').username = document.getElementById('username').value;
            remote.getGlobal('ipdUser').password = document.getElementById('password').value;
            socket.emit('vmlist', remote.getGlobal('ipdUser'));
        } else {
            M.toast({html: 'Invalid username/password.', classes: 'red'});
        }
    });
    socket.on('register', function (data) {
        M.toast({html: 'Successfully registered!'});
    })
}

function logon() {
    recreateSocket(document.getElementById('registry').value);
    console.log(remote.getGlobal('ipdUser').username);
    socket.emit('login', {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    })
}

function register() { // no checks for duplicate usernames
    recreateSocket(document.getElementById('registry').value);
    socket.emit('register', {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    })
}

