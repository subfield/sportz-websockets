import { z } from 'zod';

// List commentary query validation
export const listCommentaryQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

// Create commentary validation
export const createCommentarySchema = z.object({
    minute: z.coerce.number().int().nonnegative().optional(),
    sequence: z.coerce.number().int(),
    period: z.string().optional(),
    eventType: z.string().min(1, 'Event type is required'),
    actor: z.string().optional(),
    team: z.string().optional(),
    message: z.string().min(1, 'Message is required'),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
});
