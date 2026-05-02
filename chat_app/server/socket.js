const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");

const users = new Map(); // username → socket.id
const messageQueue = new Map(); // username → [messages]
const socketRateLimiters = new Map(); // socket.id → rate limiter

// Message rate limiter (per socket)
function getSocketRateLimiter(socketId) {
    if (!socketRateLimiters.has(socketId)) {
        let count = 0;
        const resetInterval = setInterval(() => {
            count = 0;
        }, 60000); // Reset every minute

        socketRateLimiters.set(socketId, { count, resetInterval });
    }
    return socketRateLimiters.get(socketId);
}

const MAX_MESSAGE_SIZE = 50 * 1024; // 50KB limit per message
const MAX_MESSAGES_PER_MINUTE = 100; // Rate limit

function setupSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // Register user with callback
        socket.on("register", (data, callback) => {
            let username;

            // Handle both old format (string) and new format (object)
            if (typeof data === "string") {
                username = data;
            } else if (typeof data === "object" && data.username) {
                username = data.username;
            } else {
                if (callback) callback({ status: "error", message: "Invalid username" });
                return;
            }

            // Validate username
            if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
                if (callback) callback({ status: "error", message: "Invalid username format" });
                return;
            }

            users.set(username, socket.id);
            console.log("Registered:", username);

            // Confirm registration
            if (callback) {
                callback({ status: "ok", message: "Registration successful" });
            }

            // Deliver queued messages
            if (messageQueue.has(username)) {
                const messages = messageQueue.get(username);
                messages.forEach(msg => {
                    io.to(socket.id).emit("receive-message", msg);
                });
                messageQueue.delete(username);
            }
        });

        // Send message to specific user
        socket.on("send-message", (data) => {
            const { to, from, ciphertext } = data;

            if (!to || !from || !ciphertext) {
                console.warn("Invalid message format");
                return;
            }

            // Rate limiting
            const limiter = getSocketRateLimiter(socket.id);
            if (limiter.count >= MAX_MESSAGES_PER_MINUTE) {
                console.warn(`Rate limit exceeded for ${socket.id}`);
                socket.emit("error", { message: "Too many messages. Please slow down." });
                return;
            }
            limiter.count++;

            // Message size validation
            const messageSize = JSON.stringify(data).length;
            if (messageSize > MAX_MESSAGE_SIZE) {
                console.warn(`Message too large from ${from}: ${messageSize} bytes`);
                socket.emit("error", { message: "Message is too large" });
                return;
            }

            const targetSocketId = users.get(to);

            if (targetSocketId) {
                io.to(targetSocketId).emit("receive-message", {
                    from,
                    ciphertext,
                    timestamp: Date.now()
                });
            } else {
                // Queue message for offline delivery
                if (!messageQueue.has(to)) {
                    messageQueue.set(to, []);
                }
                messageQueue.get(to).push({
                    from,
                    ciphertext,
                    timestamp: Date.now()
                });
                console.log(`Message queued for ${to} (offline)`);
            }
        });

        // Unregister user
        socket.on("unregister", (username) => {
            if (users.get(username) === socket.id) {
                users.delete(username);
                console.log("User unregistered:", username);
            }
        });

        // Cleanup
        socket.on("disconnect", () => {
            for (let [username, id] of users.entries()) {
                if (id === socket.id) {
                    users.delete(username);
                    console.log("User disconnected:", username);
                    break;
                }
            }

            // Clean up rate limiter
            if (socketRateLimiters.has(socket.id)) {
                const limiter = socketRateLimiters.get(socket.id);
                clearInterval(limiter.resetInterval);
                socketRateLimiters.delete(socket.id);
            }
        });

        // Handle errors
        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });
    });
}

module.exports = setupSocket;