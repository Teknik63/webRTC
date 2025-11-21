const fs = require("fs");
const https = require("https");
const express = require("express");
const WebSocket = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = https.createServer({
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem")
}, app);

server.listen(3000, () => console.log("📌 HTTPS Sunucu çalışıyor: https://192.168.1.49:3000"));

const wss = new WebSocket.Server({ server });

let clients = []; // max 2 kullanıcı

wss.on("connection", (ws) => {
    console.log("Yeni istemci bağlandı");
    clients.push(ws);

    ws.on("message", (msg) => {
        // Mesajı diğer kullanıcıya gönder
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        });
    });

    ws.on("close", () => {
        clients = clients.filter(c => c !== ws);
        console.log("İstemci bağlantısı kapandı");
    });
});
