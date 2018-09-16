// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const fs = require('fs');

// IPD Globals
global.ipdUser = {username: null, password: null};
global.vms = {object: null};
global.curVM = {name: null};
global.ip = {ip: "http://ipdesktop.net"};
global.temp = {obj: null};
global.inVM = {obj: false};

const expor = module.exports = {};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({width: 800, height: 600});

    mainWindow.setFullScreen(true);
    mainWindow.loadFile('index.html');

    mainWindow.on('close', function() { //   <---- Catch close event
        console.log(global.inVM.obj);
        if (global.inVM.obj) expor.syncVM(global.curVM.name);
        /*require('dialog').showMessageBox({
            message: "VM is uploading to the blockchain!",
            buttons: ["OK"]
        });*/
    });
    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
});

/*
 * ---------------
 */


/* QEMU VM */

const {spawn} = require('child_process');

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

const IPFS = require('ipfs');
let vmProc, viewerProc;
const ipfsnode = new IPFS();

ipfsnode.on('ready', () => {
    console.log('Node is ready to use!');
    node.start();
});

ipfsnode.on('error', error => {
    console.error('Something went terribly wrong!', error);
});

ipfsnode.on('start', () => console.log('Node started!'));

// TODO BZIP

expor.createVM = function (baseImage, createdname, image) {
    console.log("Called createVM");
    require('child_process').execSync("qemu-img create -f qcow2 -o backing_file=" + baseImage + " ../data.qcow2");
    console.log("Executed command qemu-img");
    let readStream = fs.createReadStream('../data.qcow2');
    console.log("Started ipfsnode");
    ipfsnode.files.add([{
        path: '../data.qcow2',
        content: readStream
    }], (err, res) => {
        if (err) return console.log(err);
        console.log("Upload file to ipfs. Res: " + JSON.stringify(res));

        const io = require('socket.io-client')("http://ipdesktop.net");

        io.on('connect', function () {
            console.log("connected");
            io.emit('addvm', {
                auth: {
                    username: global.ipdUser.username,
                    password: global.ipdUser.password
                },
                baseImage: image,
                dataHash: res[0].hash,
                name: createdname
            });
        });
    });
};

expor.loadVM = function () {

    let hash = global.temp.obj;
    if (hash == "duhh") return;

    fs.unlinkSync("../data.qcow2");
    global.inVM.obj = true;

    ipfsnode.files.cat(hash, (err, file) => {
        if (err) {
            throw err;
        }
        fs.writeFile("../data.qcow2", file, (err) => {
            if (err) return console.log(err);
            require('child_process').exec("QEMU_AUDIO_DRV=alsa qemu-system-x86_64 -enable-kvm -m 4G -vga qxl -hda ../data.qcow2 -smp 4 -cpu host -spice port=5930,disable-ticketing -device virtio-serial-pci -device virtserialport,chardev=spicechannel0,name=com.redhat.spice.0 -chardev spicevmc,id=spicechannel0,name=vdagent -soundhw all");
            setTimeout(() => {
                require('child_process').exec("remote-viewer -f spice://127.0.0.1:5930");
            }, 2000);
        });
    });
};

expor.syncVM = function (createdname) {
    console.log("syncvmbois");
    let readStream = fs.createReadStream('../data.qcow2');
    //ipfsnode.start();
    console.log("Started ipfsnode!!!");
    ipfsnode.files.add([{
        path: '../data.qcow2',
        content: readStream
    }], (err, res) => {
        if (err) return console.log(err);
        console.log("Upload file to ipfs. Res: " + JSON.stringify(res));

        const io = require('socket.io-client')("http://ipdesktop.net");

        io.on('connect', function () {
            console.log("connected");
            io.emit('updatevm', {
                auth: {
                    username: global.ipdUser.username,
                    password: global.ipdUser.password
                },
                hash: res[0].hash,
                name: createdname
            });
        });
    });
};

function patchProc(procc) {
    procc.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    procc.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    procc.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}

global.host = expor;