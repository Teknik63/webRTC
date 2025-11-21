const ws = new WebSocket("wss://192.168.1.49:3000");
let pc = new RTCPeerConnection();
let localStream;

// DOM
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const cameraSelect = document.getElementById("cameraSelect");
const startBtn = document.getElementById("startBtn");
const callBtn = document.getElementById("callBtn");

// Kameraları listele
async function listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");
    cameraSelect.innerHTML = "";
    videoDevices.forEach((device, i) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text = device.label || `Kamera ${i + 1}`;
        cameraSelect.appendChild(option);
    });
}

// Kamerayı başlat
async function startCamera() {
    if(localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    const deviceId = cameraSelect.value;
    localStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        audio: true
    });

    localVideo.srcObject = localStream;
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

// Remote stream geldiğinde
pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
};

// ICE Candidate oluştuğunda WebSocket üzerinden diğer tarafa gönder
pc.onicecandidate = e => {
    if (e.candidate) {
        ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate }));
    }
};

// WebSocket mesajlarını dinle
ws.onmessage = async msg => {
    const data = JSON.parse(msg.data);

    if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", answer }));
    }

    if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    if (data.type === "candidate") {
        try { await pc.addIceCandidate(data.candidate); }
        catch (err) { console.error("ICE Hatası:", err); }
    }
};

// Butonlar
startBtn.onclick = startCamera;

callBtn.onclick = async () => {
    if(!localStream) {
        alert("Önce kamerayı başlatın!");
        return;
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", offer }));
};

// Başlangıçta kameraları listele
listCameras();
