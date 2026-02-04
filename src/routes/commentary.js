import { Router } from "express";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
    // Validate match ID from params
    const paramsValidation = matchIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: JSON.stringify(paramsValidation.error)
        });
    }

    // Validate query parameters
    const queryValidation = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
        return res.status(400).json({
            error: "Invalid query parameters",
            details: JSON.stringify(queryValidation.error)
        });
    }

    const { id: matchId } = paramsValidation.data;
    const limit = Math.min(queryValidation.data.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        res.status(200).json({
            message: "Commentary list",
            data
        });
    } catch (error) {
        console.error("Failed to fetch commentary:", error);
        res.status(500).json({ error: "Failed to fetch commentary" });
    }
});

commentaryRouter.post("/", async (req, res) => {
    // Validate match ID from params
    const paramsValidation = matchIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: JSON.stringify(paramsValidation.error)
        });
    }

    // Validate commentary data from body
    const bodyValidation = createCommentarySchema.safeParse(req.body);
    if (!bodyValidation.success) {
        return res.status(400).json({
            error: "Invalid commentary payload",
            details: JSON.stringify(bodyValidation.error)
        });
    }

    const { id: matchId } = paramsValidation.data;
    const commentaryData = bodyValidation.data;

    try {
        const [newCommentary] = await db
            .insert(commentary)
            .values({
                matchId,
                ...commentaryData,
            })
            .returning();

        if (res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(newCommentary.matchId, newCommentary);
        }

        res.status(201).json({
            message: "Commentary created successfully",
            data: newCommentary
        });
    } catch (error) {
        console.error("Failed to create commentary:", error);
        res.status(500).json({ error: "Failed to create commentary" });
    }
});
