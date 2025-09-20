const jwt = require('jsonwebtoken');
const userService = require('../../services/user');

function requireAuth(req, res, next) {
  // Check for user in session (from Passport.js)
  if (req.user) {
    return next();
  }
  
  // Check for JWT token in headers
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      // For JWT tokens, we'll trust the decoded data without database lookup for performance
      // The user data is embedded in the token
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
      return next();
    } catch (error) {
      console.error('JWT verification failed:', error);
    }
  }
  
  // Check legacy session format for backward compatibility
  if (req.session && req.session.user) {
    return next();
  }
  
  res.redirect('/login');
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user && !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const user = req.user || req.session.user;
    
    // Admin has access to everything
    if (user.role === 'admin') {
      return next();
    }
    
    // Check specific role
    if (user.role === role) {
      return next();
    }
    
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

function requireAdmin(req, res, next) {
  const user = req.user || req.session.user;
  
  if (!user) {
    return res.redirect('/login');
  }
  
  if (user.role === 'admin') {
    return next();
  }
  
  res.status(403).send('Forbidden');
}

function generateJWT(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '24h'
  });
}

function checkPermission(permission) {
  return (req, res, next) => {
    const user = req.user || req.session.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const permissions = userService.getUserPermissions(user);
    
    if (permissions.includes(permission)) {
      return next();
    }
    
    res.status(403).json({ error: 'Permission denied' });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  generateJWT,
  checkPermission
};