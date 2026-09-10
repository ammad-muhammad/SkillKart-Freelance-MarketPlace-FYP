const { ForbiddenError, UnauthorizedError } = require('../utils/apiError');
const { USER_ROLES, ROLE_HIERARCHY } = require('../utils/constants');
const User = require('../models/User');

const ROLE_PERMISSIONS = {
  superadmin: { level: 100, canAccess: ['*'], permissions: ['*'] },
  admin: { level: 90, canAccess: ['users', 'jobs', 'cms'], permissions: ['user:*', 'cms:*', 'job:*'] },
  contenteditor: { level: 50, canAccess: ['cms'], permissions: ['cms:read', 'cms:create', 'cms:update', 'cms:publish'] },
  freelancer: { level: 30, canAccess: ['profile', 'jobs'], permissions: ['profile:*', 'job:read', 'proposal:*'] },
  client: { level: 30, canAccess: ['profile', 'jobs'], permissions: ['profile:*', 'job:*', 'proposal:read'] },
  publicviewer: { level: 10, canAccess: ['public'], permissions: ['cms:read:public'] }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (req.user.role === 'superadmin' || allowedRoles.includes(req.user.role)) return next();
    throw new ForbiddenError(`Requires role: ${allowedRoles.join(', ')}`);
  } catch (error) { next(error); }
};

const requirePermission = (...permissions) => (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const rolePerms = ROLE_PERMISSIONS[req.user.role];
    if (!rolePerms) throw new ForbiddenError('Invalid role');
    if (rolePerms.permissions.includes('*')) return next();
    
    const hasPerms = permissions.every(p => 
      rolePerms.permissions.includes(p) || rolePerms.permissions.includes(p.split(':')[0] + ':*')
    );
    if (!hasPerms) throw new ForbiddenError('Insufficient permissions');
    next();
  } catch (error) { next(error); }
};

const requireResourceAccess = (...resources) => (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const rolePerms = ROLE_PERMISSIONS[req.user.role];
    if (rolePerms.canAccess.includes('*')) return next();
    if (!resources.every(r => rolePerms.canAccess.includes(r))) {
      throw new ForbiddenError('Access denied');
    }
    next();
  } catch (error) { next(error); }
};

// Guards TWO distinct things, both required — checking only one leaves the
// other wide open:
//   1. The role being ASSIGNED (req.body.role) can't be >= the caller's own
//      level — stops a caller from minting a peer/superior via the role field.
//   2. The EXISTING target user (req.params.id, when present — e.g.
//      block/unblock/update/role-change routes) can't already be at a level
//      >= the caller's — stops a caller from acting on (demoting, blocking,
//      editing) an equal-or-higher-ranked account regardless of what role
//      field the request does or doesn't send. Checking only #1 (the
//      original bug) let e.g. one 'admin' demote another 'admin' to
//      'client' via PUT /:id/role, or block/unblock any other admin,
//      since neither route/body carries the TARGET's current role at all.
const requireHigherRole = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;

    if (req.params.id) {
      const targetUser = await User.findById(req.params.id).select('role').lean();
      if (targetUser) {
        const targetCurrentLevel = ROLE_HIERARCHY[targetUser.role] || 0;
        if (userLevel <= targetCurrentLevel) throw new ForbiddenError('Cannot modify equal or higher roles');
      }
    }

    const desiredRole = req.body.role || req.params.role;
    if (desiredRole) {
      const desiredLevel = ROLE_HIERARCHY[desiredRole] || 0;
      if (userLevel <= desiredLevel) throw new ForbiddenError('Cannot assign equal or higher roles');
    }

    next();
  } catch (error) { next(error); }
};

module.exports = { ROLE_PERMISSIONS, requireRole, requirePermission, requireResourceAccess, requireHigherRole };
