const { z } = require('zod');

const syncUserSchema = {
  body: z.object({
    supabaseId: z.string().min(1, 'Supabase ID is required'),
    email: z.string().email('Invalid email format'),
    authProvider: z.enum(['email', 'google']),
  }),
};

const selectRoleSchema = {
  body: z.object({
    role: z.enum(['client', 'freelancer'], {
      required_error: 'Role is required',
      invalid_type_error: 'Role must be either client or freelancer',
    }),
  }),
};

module.exports = {
  syncUserSchema,
  selectRoleSchema,
};
