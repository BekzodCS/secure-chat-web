const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
    // Try to get token from cookie first (preferred), then from Authorization header (fallback)
    let token = req.cookies?.authToken;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            token = authHeader.split(" ")[1]; // Bearer TOKEN
        }
    }

    if (!token) {
        return res.status(401).json({ error: "Missing authorization token" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { username }
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

module.exports = authenticate;