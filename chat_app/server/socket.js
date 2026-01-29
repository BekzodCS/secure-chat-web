const { Server } = require("socket.io");

function setupSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "*"
        }
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("send-message", (data) => {
            // data will be ENCRYPTED later
            io.emit("receive-message", data);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
}

module.exports = setupSocket;