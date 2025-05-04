require('dotenv').config();
const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!['farmer', 'buyer', 'admin'].includes(decoded.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authenticateUser;
