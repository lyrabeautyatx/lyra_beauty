const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userService = require('../../services/user');

// Load environment variables
require('dotenv').config();

// Only initialize Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('Initializing Google OAuth strategy with client ID:', process.env.GOOGLE_CLIENT_ID);
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user based on Google profile
      const user = await userService.findOrCreateUser(profile);
      return done(null, user);
    } catch (error) {
      console.error('Error in Google OAuth strategy:', error);
      return done(error, null);
    }
  }));
} else {
  console.warn('Google OAuth credentials not configured. Google Sign-In will not be available.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;