const User = require('../models/User');
const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');

class AuthService {
  /**
   * Sync Supabase user to MongoDB
   */
  async syncUser(supabaseId, email, authProvider) {
    let user = await User.findOne({ supabaseId });

    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      return user;
    }

    // Create new user
    user = await User.create({
      supabaseId,
      email,
      authProvider,
      lastLogin: new Date(),
    });

    return user;
  }

  /**
   * Set user role
   */
  async setUserRole(userId, role) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role) {
      throw new ApiError(400, 'Role already set. Cannot change role.');
    }

    user.role = role;
    await user.save();

    return user;
  }

  /**
   * Mark profile as complete
   */
  async markProfileComplete(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.isProfileComplete = true;
    await user.save();

    return user;
  }

  /**
   * Verify Supabase token
   */
  async verifyToken(token) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new ApiError(401, 'Invalid token');
    }

    return user;
  }
}

module.exports = new AuthService();
