let io;
let socketIO;
const initSocket = (app) => {
	//var http = require('http').Server(app);
    io = require('socket.io').listen(app);
    io.on('connection', function(socket){
        socketIO = socket
        console.log("socket connected")
    })
}

const refreshDownloads = () => {
    socketIO.emit('refresh_downloads');
}

module.exports = {
    initSocket,
    refreshDownloads
}