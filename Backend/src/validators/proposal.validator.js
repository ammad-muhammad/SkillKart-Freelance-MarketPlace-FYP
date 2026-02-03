const { z } = require('zod');

const createProposalSchema = {
  body: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    coverLetter: z.string().min(100, 'Cover letter must be at least 100 characters').max(3000),
    proposedBudget: z.object({
      amount: z.number().min(0),
      type: z.enum(['fixed', 'hourly']),
      currency: z.string().default('USD'),
    }),
    deliveryTime: z.object({
      value: z.number().min(1),
      unit: z.enum(['days', 'weeks', 'months']),
    }),
  }),
};

module.exports = {
  createProposalSchema,
};
