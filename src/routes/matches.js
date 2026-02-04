import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

const matchRouter = Router();

const MAX_LENGTH = 100;
const DEFAULT_LENGTH = 50;

matchRouter.get("/", async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query", details: JSON.stringify(parsed.error) });
    }

    const limit = Math.min(parsed.data.limit ?? DEFAULT_LENGTH, MAX_LENGTH);

    try {
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
        res.json({ message: "Matches List", data: data });
    } catch (error) {
        res.status(500).json({ error: "Failed to list matches" });
    }
});

matchRouter.post("/", async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    const { data: { startTime, endTime, homeScore, awayScore } } = parsed;

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: JSON.stringify(parsed.error) });
    }

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();
        res.status(201).json({ message: "Match created successfully", data: event });
    } catch (error) {
        res.status(500).json({ error: "Failed to create match" });
    }
});

// matchRouter.put("/:id", (req, res) => {
//     res.json({ message: "Update Match" });
// });

// matchRouter.get("/:id", (req, res) => {
//     res.json({ message: "Get Match" });
// });

export default matchRouter;