// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const fs = require('fs');
const CID = require('cids');

// IPD Globals
global.ipdUser = {username: null, password: null};
global.vms = {object: null};
global.curVM = {name: null};
global.ip = {ip: "http://ipdesktop.net"};

const expor = module.exports = {};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    mainWindow.setFullScreen(true);
    // and load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
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
const ipfsnode = new IPFS({start: false});

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
    ipfsnode.start();
    console.log("Started ipfsnode");
    ipfsnode.files.add([{
        path:'../data.qcow2',
        content: readStream
    }], (err, res) => {
        if (err) return console.log(err);
        console.log("Upload file to ipfs. Res: " + JSON.stringify(res));
        ipfsnode.stop();

        const io = require('socket.io-client')("http://ipdesktop.net");

        io.on('connect', function(){
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

expor.loadVM = function (baseImageLocation, hash) {
    ipfsnode.start();
    let cid = new CID(hash);
    ipfsnode.files.get(cid, function (err, files) { // TODO files.get instead?
        if (err) {
            throw err;
        }
        files.forEach((file) => {
            fs.writeFile("../data.qcow2", file, (err) => {
                if (err) return console.log(err);
                require('child_process').exec("qemu-system-x86_64 -enable-kvm -m 4G -vga qxl -hda ../data.qcow2 -smp 4 -cpu host -spice port=5930,disable-ticketing -device virtio-serial-pci -device virtserialport,chardev=spicechannel0,name=com.redhat.spice.0 -chardev spicevmc,id=spicechannel0,name=vdagent");
                require('child_process').execSync("remote-viewer spice://127.0.0.1:5930");
                ipfsnode.stop();
            });
        });
    });
};

expor.syncVM = function (callback) {
    let readStream = fs.createReadStream('../data.qcow2');
    ipfsnode.start();
    ipfsnode.files.add([{
        path:'../data.qcow2',
        content: readStream
    }], (err, res) => {
        if (err) return console.log(err);
        ipfsnode.stop();
        callback(res[0].hash); // TODO GET RID OF CALLBACK
    }); //TODO USE PROGRESS OPTION
};
// TODO SYNC VM

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