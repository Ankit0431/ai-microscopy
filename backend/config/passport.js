import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth strategy - Profile:', {
        id: profile.id,
        email: profile.emails[0]?.value,
        name: profile.displayName
      });

      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        console.log('Existing Google user found:', user.email);
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }
      
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        console.log('Existing user found by email, linking Google account:', user.email);
        user.googleId = profile.id;
        user.googleEmail = profile.emails[0].value;
        user.profilePicture = profile.photos[0]?.value || '';
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }
      
      
      console.log('Creating new Google user:', profile.emails[0].value);
      user = new User({
        googleId: profile.id,
        googleEmail: profile.emails[0].value,
        email: profile.emails[0].value,
        fullName: profile.displayName,
        profilePicture: profile.photos[0]?.value || '',
        isEmailVerified: true,
        lastLogin: new Date()
      });
      
      await user.save();
      console.log('New Google user created successfully:', user.email);
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth strategy error:', error);
      return done(error, null);
    }
  }));
  console.log('Google OAuth strategy configured successfully');
} else {
  console.log('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export default passport; 