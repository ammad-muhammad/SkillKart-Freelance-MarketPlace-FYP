const { z } = require('zod');

const createJobSchema = {
  body: z.object({
    title: z.string().min(10, 'Title must be at least 10 characters').max(200),
    description: z.string().min(50, 'Description must be at least 50 characters').max(5000),
    category: z.string().min(2, 'Category is required'),
    skills: z.array(z.string()).min(1, 'At least one skill is required').max(15),
    budget: z.object({
      type: z.enum(['fixed', 'hourly']),
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
      currency: z.string().default('USD'),
    }),
    duration: z
      .enum(['less-than-week', '1-4-weeks', '1-3-months', '3-6-months', '6-months-plus'])
      .optional(),
    experienceLevel: z.enum(['entry', 'intermediate', 'expert']),
    projectType: z.enum(['one-time', 'ongoing']).default('one-time'),
    deadline: z.string().datetime().optional(),
  }),
};

const updateJobSchema = {
  body: z.object({
    title: z.string().min(10).max(200).optional(),
    description: z.string().min(50).max(5000).optional(),
    category: z.string().min(2).optional(),
    skills: z.array(z.string()).min(1).max(15).optional(),
    budget: z
      .object({
        type: z.enum(['fixed', 'hourly']),
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
        currency: z.string().default('USD'),
      })
      .optional(),
    duration: z
      .enum(['less-than-week', '1-4-weeks', '1-3-months', '3-6-months', '6-months-plus'])
      .optional(),
    experienceLevel: z.enum(['entry', 'intermediate', 'expert']).optional(),
    projectType: z.enum(['one-time', 'ongoing']).optional(),
    status: z.enum(['active', 'closed', 'cancelled']).optional(),
    deadline: z.string().datetime().optional(),
  }),
};

const jobQuerySchema = {
  query: z.object({
    page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
    category: z.string().optional(),
    skills: z.string().optional(),
    budgetType: z.enum(['fixed', 'hourly']).optional(),
    minBudget: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxBudget: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    experienceLevel: z.enum(['entry', 'intermediate', 'expert']).optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest', 'budget-high', 'budget-low']).default('newest'),
  }),
};

module.exports = {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
};
