const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const passport = require('passport');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const { UNAUTHORIZED } = require('../utils/constants');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_TOKEN_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await User.findById(payload.id);
      if (!user)
        return done(
          new AppError(
            'The user belonging to this token does no longer exist!',
            UNAUTHORIZED
          ),
          false
        );

      if (user.changedPasswordAfter(payload.iat))
        return done(
          new AppError(
            'User recently change password! Please log in again.',
            UNAUTHORIZED
          ),
          false
        );
      done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);
