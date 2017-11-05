// jshint browser: true
'use strict';

let webSocket;
let connection;
let fileReceived;
let fileReceivedHandler;

function setUpDataTransferSession(offererDescription) {
    console.log('Setting up RTC session answer after receiving a message from the web socket.');

    connection.ondatachannel = (event) => {
        console.info('Answerer received data channel');
        listenForMessages(event.channel);
    };

    connection.setRemoteDescription(offererDescription);
    connection.createAnswer().then(
        descr => {
            connection.setLocalDescription(descr);
            webSocket.send(JSON.stringify(descr));
            console.info('Sent answerer session description after setting offerer description as remote and local description.');
        }
    );
}

function listenForMessages(dataChannel) {
    dataChannel.onmessage = (rtcMessage) => {
        const data = rtcMessage.data;
        console.info('Answerer received RTC message:', data);

        if (data instanceof ArrayBuffer) {
            fileReceived = new Blob([data]);
            console.info('Answerer received file of size:', fileReceived.size);

            fileReceivedHandler && fileReceivedHandler(fileReceived);
        }
    };
}

function parseSocketMessage(message) {
    const payload = JSON.parse(message);
    if (payload.type === 'offer') {
        setUpDataTransferSession(payload);
    }

    if (payload.type === 'ICE') {
        connection.addIceCandidate(payload.candidate).then(
            () => console.info('Answerer added ICE candiate', payload.candidate.usernameFragment, 'successfully.'),
            (error) => console.error('Answerer failed to add ICE candidate due to', error)
        );
    }
}

function setUpWebSocket() {
    webSocket.onopen = () => {
        console.log('Answerer connection with socket server opened, sending request to register as offer answerer.');

        webSocket.send(JSON.stringify({type: 'registerAnswerer'}));
    };

    webSocket.onmessage = (e) => parseSocketMessage(e.data);
}

export function registerAsAnswerer() {
    connection = new RTCPeerConnection();
    webSocket = new WebSocket('ws://localhost:8085', 'json');

    connection.onicecandidate = (e) => {
        if (!e.candidate) {
            return;
        }

        webSocket.send(JSON.stringify({type: 'ICE-answerer', candidate: e.candidate}));
    };

    setUpWebSocket();
}

export function onFileReceived(handler) {
    if (handler instanceof Function) {
        fileReceivedHandler = handler;
    }
}
