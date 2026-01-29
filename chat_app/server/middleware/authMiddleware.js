const jwt = require("jsonwebtoken");

const JWT_SECRET = "CHANGE_THIS_SECRET_LATER";

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { username }
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

module.exports = authenticate;