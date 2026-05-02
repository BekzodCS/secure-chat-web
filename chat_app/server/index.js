const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

// Verify required environment variables
if (!process.env.JWT_SECRET) {
    console.error("❌ ERROR: JWT_SECRET environment variable is not set!");
    process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" })); // Limit payload size
app.use(cookieParser());

// Rate limiters
const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many signup attempts. Try later." }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts. Try later." }
});

// Apply rate limits
app.use("/api/signup", signupLimiter);
app.use("/api/login", loginLimiter);

// Routes
app.use("/api", authRoutes);

// Health check
app.get("/", (req, res) => {
    res.json({ status: "Secure Chat Backend running" });
});

// Sockets
setupSocket(server);

server.listen(PORT, () => {
    console.log(`🔒 Secure Chat Server running on port ${PORT}`);
    console.log(`✅ Frontend allowed: ${FRONTEND_URL}`);
});