import { Router } from "express";
import { getCurrentWeather } from "../lib/weather.js";

export const weatherRouter = Router();

/** No auth needed — same public-passthrough treatment as /api/courses/search,
 * nothing user-specific here. */
weatherRouter.get("/", async (req, res) => {
  const location = typeof req.query.location === "string" ? req.query.location.trim() : "";
  if (!location) return res.status(400).json({ error: "Missing location." });

  try {
    const weather = await getCurrentWeather(location);
    if (!weather) return res.status(404).json({ error: "Couldn't find weather for that location." });
    res.json(weather);
  } catch {
    res.status(502).json({ error: "Couldn't fetch weather right now." });
  }
});
