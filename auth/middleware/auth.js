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
    
    // Check if permission exists in the actions array
    if (permissions && permissions.actions && permissions.actions.includes(permission)) {
      return next();
    }
    
    res.status(403).json({ error: 'Permission denied' });
  };
}

// Specific role middleware functions for cleaner route protection
function requireCustomer(req, res, next) {
  const user = req.user || req.session.user;
  
  if (!user) {
    return res.redirect('/login');
  }
  
  if (user.role === 'customer' || user.role === 'admin') {
    return next();
  }
  
  // Handle different response types
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(403).json({ error: 'Customer access required' });
  }
  
  res.status(403).send('Customer access required');
}

function requirePartner(req, res, next) {
  const user = req.user || req.session.user;
  
  if (!user) {
    return res.redirect('/login');
  }
  
  if (user.role === 'partner' || user.role === 'admin') {
    return next();
  }
  
  // Handle different response types
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(403).json({ error: 'Partner access required' });
  }
  
  res.status(403).send('Partner access required');
}

// Business rule: Partners cannot book appointments
function blockPartnerBooking(req, res, next) {
  const user = req.user || req.session.user;
  
  if (!user) {
    return res.redirect('/login');
  }
  
  // Block partners from accessing booking routes
  if (user.role === 'partner') {
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(403).json({ 
        error: 'Partners cannot book appointments. Please contact admin to change your role to customer.' 
      });
    }
    return res.status(403).send('Partners cannot book appointments. Please contact admin to change your role to customer.');
  }
  
  // Allow customers and admins
  if (user.role === 'customer' || user.role === 'admin') {
    return next();
  }
  
  // Fallback for unknown roles
  res.status(403).send('Insufficient permissions');
}

// Enhanced role checking with better error handling
function requireAnyRole(roles) {
  return (req, res, next) => {
    const user = req.user || req.session.user;
    
    if (!user) {
      if (req.accepts('json') && !req.accepts('html')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/login');
    }
    
    // Admin has access to everything
    if (user.role === 'admin') {
      return next();
    }
    
    // Check if user role is in allowed roles
    if (Array.isArray(roles) && roles.includes(user.role)) {
      return next();
    }
    
    if (typeof roles === 'string' && user.role === roles) {
      return next();
    }
    
    // Handle different response types for unauthorized access
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(403).json({ 
        error: `Access denied. Required role(s): ${Array.isArray(roles) ? roles.join(', ') : roles}` 
      });
    }
    
    res.status(403).send(`Access denied. Required role(s): ${Array.isArray(roles) ? roles.join(', ') : roles}`);
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
  requireCustomer,
  requirePartner,
  blockPartnerBooking,
  requireAnyRole,
  generateJWT,
  refreshJWT,
  verifyJWT,
  checkPermission,
  handleTokenRefresh
};