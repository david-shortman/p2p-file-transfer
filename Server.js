// jshint node: true
'use strict';

const http = require('http');
const express = require('express');
const websocket = require('websocket');

const staticFileServer = express();
staticFileServer.use('/', express.static(`${__dirname}/public`));

const httpServer = http.createServer(staticFileServer);

const webSocket = new websocket.server({
    httpServer: httpServer
});

let offer;
let offerer;
let answerer;

webSocket.on('request', (request) => {
    const connection = request.accept('json', request.origin);

    connection.on('message', (data) => {
        const payload = JSON.parse(data.utf8Data);

        if (payload.type === 'registerAnswerer') {
            answerer = connection;

            console.info('Recorded new answerer.');
        }

        if (payload.type === 'offer') {
            offerer = connection;
            offer = payload.sdp;

            if (!!answerer) {
                answerer.send(JSON.stringify(payload));
                console.info('Sending offer to answerer after recoring new offerer and offer.');
            }
        }

        if (payload.type === 'answer') {
            if (!!offerer) {
                offerer.send(JSON.stringify(payload));
                console.info('Sending answer to offerer after receiving answer.');
            }
        }

        if (payload.type === 'ICE-offerer') {
            if (!!answerer) {
                answerer.send(JSON.stringify({type: 'ICE', candidate: payload.candidate}));
                console.info('Sending answerer an ICE candidate.');
            }
        }

        if (payload.type === 'ICE-answerer') {
            if (!!offerer) {
                offerer.send(JSON.stringify({type: 'ICE', candidate: payload.candidate}));
                console.info('Sending offerer an ICE candidate.');
            }
        }
    });
});

const port = 8085;
httpServer.listen(port, () => console.info('Server has started on port:', port));