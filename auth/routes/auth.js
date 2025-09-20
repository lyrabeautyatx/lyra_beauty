const express = require('express');
const passport = require('../strategies/google');
const { generateJWT, verifyJWT, handleTokenRefresh, requireAuth } = require('../middleware/auth');

// Load environment variables
require('dotenv').config();

const router = express.Router();

// Check if Google OAuth is configured
const isOAuthConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
console.log('OAuth configured:', isOAuthConfigured, 'Client ID:', process.env.GOOGLE_CLIENT_ID, 'Secret:', process.env.GOOGLE_CLIENT_SECRET ? '[present]' : '[missing]');

// Initiate Google OAuth
router.get('/google', (req, res, next) => {
  if (!isOAuthConfigured) {
    return res.status(503).json({ error: 'Google OAuth is not configured' });
  }
  
  // Check if we have the google strategy available
  try {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  } catch (error) {
    console.error('Google OAuth strategy error:', error);
    return res.status(503).json({ error: 'Google OAuth strategy not available' });
  }
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  if (!isOAuthConfigured) {
    return res.redirect('/login?error=oauth_not_configured');
  }
  
  passport.authenticate('google', { failureRedirect: '/login' })(req, res, () => {
    // Generate JWT token
    const token = generateJWT(req.user);
    
    // Set JWT token as HTTP-only cookie for session persistence
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Store user in session for compatibility with existing code
    req.session.user = req.user;
    
    console.log(`✓ JWT token set for user: ${req.user.email}`);
    
    // Redirect based on role
    if (req.user.role === 'admin') {
      res.redirect('/admin');
    } else if (req.user.role === 'partner') {
      // Future: redirect to partner dashboard
      res.redirect('/dashboard');
    } else {
      res.redirect('/dashboard');
    }
  });
});

// Get current user profile - now requires authentication
router.get('/profile', requireAuth, (req, res) => {
  const user = req.user || req.session.user;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      displayName: user.display_name || `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim(),
      role: user.role,
      username: user.username // For legacy compatibility
    }
  });
});

// Validate JWT token endpoint
router.post('/validate-token', (req, res) => {
  const token = req.body.token || req.headers.authorization?.split(' ')[1] || req.cookies.jwt_token;
  
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyJWT(token);
    res.json({ 
      valid: true, 
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      },
      expiresAt: decoded.exp
    });
  } catch (error) {
    res.status(401).json({ 
      valid: false, 
      error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', (req, res) => {
  const token = req.body.token || req.headers.authorization?.split(' ')[1] || req.cookies.jwt_token;
  
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyJWT(token);
    const newToken = generateJWT({
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
    
    // Set new token as cookie
    res.cookie('jwt_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ 
      success: true, 
      token: newToken,
      expiresIn: '24h'
    });
  } catch (error) {
    res.status(401).json({ 
      error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  // Clear JWT token cookie
  res.clearCookie('jwt_token');
  
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.redirect('/');
    });
  });
});

module.exports = router;