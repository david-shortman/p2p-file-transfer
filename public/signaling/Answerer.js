// jshint browser: true
'use strict';

export function registerAsAnswerer() {
    const answererConnection = new RTCPeerConnection();
    const answererWebSocket = new WebSocket('ws://localhost:8085', 'json');

    answererConnection.onicecandidate = (e) => {
        if (!e.candidate) {
            return;
        }

        answererWebSocket.send(JSON.stringify({type: 'ICE-answerer', candidate: e.candidate}));
    };

    answererWebSocket.onopen = () => {
        console.log('Answerer connection with socket server opened, sending request to register as offer answerer.');

        answererWebSocket.send(JSON.stringify({type: 'registerAnswerer'}));
    };

    answererWebSocket.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        if (payload.type === 'offer') {
            console.log('Setting up RTC session answer after receiving a message from the web socket.');

            const offererDescription = payload;

            answererConnection.ondatachannel = (e) => {
                console.info('Answerer received data channel');

                e.channel.onmessage = (e) => {
                    const data = e.data;
                    console.info('Answerer received RTC message:', data);

                    if (data instanceof ArrayBuffer) {
                        const received = new Blob([data]);
                        console.info('Answerer received file of size:', received.size);

                        const downloadButton = document.getElementById('downloadFile');
                        downloadButton.href = URL.createObjectURL(received);
                        downloadButton.style.display = 'block';
                    }
                };
            };

            answererConnection.setRemoteDescription(offererDescription);
            answererConnection.createAnswer().then(
                descr => {
                    answererConnection.setLocalDescription(descr);
                    answererWebSocket.send(JSON.stringify(descr));
                    console.info('Sent answerer session description after setting offerer description as remote and local description.');
                }
            );
        }

        if (payload.type === 'ICE') {
            answererConnection.addIceCandidate(payload.candidate).then(
                () => console.info('Answerer added ICE candiate', payload.candidate.usernameFragment, 'successfully.'),
                (error) => console.error('Answerer failed to add ICE candidate due to', error)
            );
        }
    };
}