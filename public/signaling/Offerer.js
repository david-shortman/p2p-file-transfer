// jshint browser: true
'use strict';

let webSocket;
let connection;
let dataChannel;

function parseSocketMessage(message) {
    const payload = JSON.parse(message);
    if (payload.type === 'answer') {
        console.log('Setting RTC session answer description after receiving an answer message from the web socket.');

        const answererDescription = payload;
        connection.setRemoteDescription(answererDescription);
    }

    if (payload.type === 'ICE') {
        connection.addIceCandidate(payload.candidate).then(
            () => console.info('Offerer added ICE candidate', payload.candidate.usernameFragment, 'successfully.'),
            (error) => console.error('Offerer failed to add ICE candidate due to', error)
        );
    }
}

function initializeDataTransferSession() {
    console.log('Setting up RTC session offer as connection to web socket has opened.');

    dataChannel = connection.createDataChannel('demoChannel');
    dataChannel.binarytype = 'arraybuffer';

    connection.createOffer().then(
        descr => {
            connection.setLocalDescription(descr);
            webSocket.send(JSON.stringify(descr));
            console.log('Sent offerer session description after setting as local description.');
        }
    );
}

function setUpWebSocket() {
    webSocket.onmessage = (e) => parseSocketMessage(e.data);
    webSocket.onopen = initializeDataTransferSession;
}

export function sendOffer() {
    connection = new RTCPeerConnection();
    webSocket = new WebSocket(`ws://${location.hostname}`, 'json');

    connection.onicecandidate = (e) => {
        if (!e.candidate) {
            return;
        }

        webSocket.send(JSON.stringify({type: 'ICE-offerer', candidate: e.candidate}));
    };

    setUpWebSocket();
}

export function sendFile(file) {
    if (!connection || !dataChannel || dataChannel.readyState !== 'open') {
        console.error('Cannot send file as the data channel is not open.');
        return;
    }

    console.log('Preparing to send file:', file.name, 'of size:', file.size);
    dataChannel.send(JSON.stringify({type: 'file-metadata', name: file.name, size: file.size}));

    sendFileInChunks(file);
}

function sendFileInChunks(file) {
    const chunkSize = 16384;
    let offset = 0;

    const chunks = [];

    if (file.size < offset + chunkSize) {
        sendChunkAsync(file);
        return;
    }

    while (file.size > offset) {
        chunks.push(file.slice(offset, offset + chunkSize));
        offset += chunkSize;
    }

    Promise.all(chunks.map(sendChunkAsync))
        .then(() => console.info('Finished sending file to peer.'));
}

function sendChunkAsync(chunk) {
    return readAsArrayBufferAsync(chunk).then((arrayBuffer) => {
        dataChannel.send(arrayBuffer);
        console.log('File chunk of size', arrayBuffer.byteLength, 'was sent to peer.');
        return Promise.resolve();
    });
}

function readAsArrayBufferAsync(chunk) {
    // Data must be sent as ArrayBuffer instances
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => resolve(e.target.result);
        fileReader.readAsArrayBuffer(chunk);
    });
}
