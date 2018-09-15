// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
M.AutoInit();

var remote = require('electron').remote;
remote.getGlobal('ipdUser').username = "sesh";

var socket = io('http://localhost');

function logon() {
    socket = io(document.getElementById('registry').value);
    console.log(remote.getGlobal('ipdUser').username);
    socket.emit('login', {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    }, function (data) {
        if (data) {
            M.toast({html: 'Successfully logged in!'});
            remote.getGlobal('ipdUser').username = document.getElementById('username').value;
            remote.getGlobal('ipdUser').password = document.getElementById('password').value;
            socket.emit('vmlist', remote.getGlobal('ipdUser'), function (data) {
                remote.getGlobal('vms').object = data;
            });
        } else {
            M.toast({html: 'Invalid username/password.', classes: 'red'});
        }
    })
}

/* QEMU VM */

const { spawn } = require('child_process');
var vm;

function startVM(image) { //sudo qemu-system-x86_64 -enable-kvm -m 4G -vga qxl -hda ubuntu.qcow2 -smp 4 -cpu host
    vm = spawn('qemu-system-x86_64', ['-enable-kvm', '-m', '4G', '-vga', 'qxl', '-hda', '../ubuntu.qcow2', '-smp', '4', '-cpu', 'host']); // Start

    vm.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    vm.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    vm.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

}