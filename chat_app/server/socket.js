const { Server } = require("socket.io");

function setupSocket(server) {
    const io = new Server(server, {
        cors: { origin: "*" }
    });

    io.on("connection", (socket) => {
        socket.on("send-message", (payload) => {
            // payload = { from, to, ciphertext }
            io.emit("receive-message", payload);
        });
    });
}

module.exports = setupSocket;