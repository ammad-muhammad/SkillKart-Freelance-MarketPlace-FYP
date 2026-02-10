const { ForbiddenError, UnauthorizedError } = require('../utils/apiError');
const { USER_ROLES, ROLE_HIERARCHY } = require('../utils/constants');

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

const requireHigherRole = (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const targetRole = req.body.role || req.params.role;
    if (!targetRole) return next();
    
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    if (userLevel <= targetLevel) throw new ForbiddenError('Cannot modify equal or higher roles');
    next();
  } catch (error) { next(error); }
};

module.exports = { ROLE_PERMISSIONS, requireRole, requirePermission, requireResourceAccess, requireHigherRole };
