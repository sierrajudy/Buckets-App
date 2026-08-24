import { Router } from "express";
import { courseDisplayName, fetchGolfCourseDetail, searchGolfCourses } from "../lib/golfCourseApi.js";
import { registerCourse } from "../rooms/courses.js";

export const coursesRouter = Router();

coursesRouter.get("/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) return res.json([]);

  try {
    const results = await searchGolfCourses(query);
    res.json(
      results.map((c) => ({
        id: c.id,
        name: courseDisplayName(c.club_name, c.course_name),
        location: [c.location.city, c.location.state, c.location.country].filter(Boolean).join(", "),
      })),
    );
  } catch {
    res.status(502).json({ error: "Couldn't search courses right now. Try again in a bit." });
  }
});

coursesRouter.get("/:id", async (req, res) => {
  try {
    const detail = await fetchGolfCourseDetail(req.params.id);
    if ("error" in detail) return res.status(422).json({ error: detail.error });

    const id = `gca-${req.params.id}`;
    registerCourse({ id, name: detail.name, pars: detail.pars });
    res.json({ id, name: detail.name, pars: detail.pars });
  } catch {
    res.status(502).json({ error: "Couldn't load that course right now. Try again in a bit." });
  }
});
