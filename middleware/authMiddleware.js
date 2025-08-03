const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
   console.log('Auth header received:', authHeader); 

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: 'Unauthorized: No token' });
  }

  const token = authHeader.split(" ")[1];
console.log('Token extracted:', token);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded token:', decoded); 
    req.user = decoded;
    
    next();
  } catch (err) {
      console.error('JWT verification failed:', err);
    return res.status(403).json({ message: 'Token invalid or expired' });
  }
};

// Admin only access
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  next();
};

exports.authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user to request
    next(); // ✅ call next to continue
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};
