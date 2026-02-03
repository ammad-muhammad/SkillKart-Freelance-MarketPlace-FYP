const { z } = require('zod');

const createClientProfileSchema = {
  body: z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phoneNumber: z.string().optional(),
    location: z
      .object({
        country: z.string().optional(),
        city: z.string().optional(),
        timezone: z.string().optional(),
      })
      .optional(),
    bio: z.string().max(1000).optional(),
    website: z.string().url().optional().or(z.literal('')),
    companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
    industry: z.string().optional(),
  }),
};

const createFreelancerProfileSchema = {
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    title: z.string().min(2, 'Title must be at least 2 characters'),
    phoneNumber: z.string().optional(),
    location: z
      .object({
        country: z.string().optional(),
        city: z.string().optional(),
        timezone: z.string().optional(),
      })
      .optional(),
    bio: z.string().max(2000).optional(),
    hourlyRate: z.number().min(0).optional(),
    skills: z
      .array(
        z.object({
          name: z.string().min(1),
          level: z.enum(['beginner', 'intermediate', 'expert']).default('intermediate'),
        })
      )
      .min(1, 'At least one skill is required'),
    availability: z.enum(['full-time', 'part-time', 'contract', 'hourly']).optional(),
  }),
};

module.exports = {
  createClientProfileSchema,
  createFreelancerProfileSchema,
};
