// middleware/auth.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'Không có token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('verifyToken error', err);
    res.status(401).json({ msg: 'Token không hợp lệ' });
  }
};

// Export theo kiểu object để dùng destructuring
module.exports = { verifyToken };