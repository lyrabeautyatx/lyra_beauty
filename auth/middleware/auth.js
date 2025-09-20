const jwt = require('jsonwebtoken');
const userService = require('../../services/user');

function requireAuth(req, res, next) {
  // Check for user in session (from Passport.js)
  if (req.user) {
    return next();
  }
  
  // Check for JWT token in headers or cookies
  let token = req.headers.authorization?.split(' ')[1];
  if (!token && req.cookies && req.cookies.jwt_token) {
    token = req.cookies.jwt_token;
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      // Check if token is close to expiring (within 1 hour) and refresh if needed
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = decoded.exp - now;
      
      // For JWT tokens, we'll trust the decoded data without database lookup for performance
      // The user data is embedded in the token
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tokenExpiry: decoded.exp
      };
      
      // If token expires in less than 1 hour, mark for refresh
      if (timeToExpiry < 3600) { // 1 hour in seconds
        req.shouldRefreshToken = true;
      }
      
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('JWT token expired, clearing cookie');
        if (req.cookies && req.cookies.jwt_token) {
          res.clearCookie('jwt_token');
        }
      } else {
        console.error('JWT verification failed:', error);
      }
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
    role: user.role,
    iat: Math.floor(Date.now() / 1000) // issued at time
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '24h'
  });
}

function refreshJWT(user) {
  // Generate a new token with extended expiry
  return generateJWT(user);
}

function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  } catch (error) {
    throw error;
  }
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

// Middleware to handle token refresh
function handleTokenRefresh(req, res, next) {
  if (req.shouldRefreshToken && req.user) {
    try {
      const newToken = refreshJWT(req.user);
      
      // Set the new token as an HTTP-only cookie
      res.cookie('jwt_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      // Also send in response header for API clients
      res.set('Authorization', `Bearer ${newToken}`);
      
      console.log('JWT token refreshed for user:', req.user.email);
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  generateJWT,
  refreshJWT,
  verifyJWT,
  checkPermission,
  handleTokenRefresh
};