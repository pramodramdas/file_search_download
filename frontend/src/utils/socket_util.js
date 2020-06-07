import io from 'socket.io-client';
var events = require('events');
var eventEmitter = new events.EventEmitter();

let socket;

export function init_socket_client() {
	if(io && !socket) {
        socket = io.connect('/')

        socket.on('connect', function() {
            console.log("socket connected")
        });

        socket.on('refresh_downloads', function() {
            eventEmitter.emit('refresh_downloads');
        })
    }
}

export function socketEmitter() {
    return eventEmitter
}