import { z } from 'zod';

// Match status constants
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// List matches query validation
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Match ID parameter validation
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const isoDateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Must be a valid ISO date string' }
);

// Create match validation
export const createMatchSchema = z
  .object({
    sport: z.string().min(1, 'Sport is required'),
    homeTeam: z.string().min(1, 'Home team is required'),
    awayTeam: z.string().min(1, 'Away team is required'),
    startTime: isoDateStringSchema,
    endTime: isoDateStringSchema,
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['endTime'],
      });
    }
  });

// Update score validation
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
