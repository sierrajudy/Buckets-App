import { Router } from "express";
import { courseDisplayName, fetchGolfCourseTeeDetail, fetchGolfCourseTees, searchGolfCourses } from "../lib/golfCourseApi.js";
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

/** Every 18-hole tee available for this course, so the host can pick one
 * before the round is set up. */
coursesRouter.get("/:id", async (req, res) => {
  try {
    const detail = await fetchGolfCourseTees(req.params.id);
    if (detail.tees.length === 0) {
      return res.status(422).json({ error: "This course doesn't have 18-hole tee data available." });
    }
    res.json(detail);
  } catch {
    res.status(502).json({ error: "Couldn't load that course right now. Try again in a bit." });
  }
});

/** Resolves one specific tee into the room-ready course (par/yardage/handicap
 * per hole plus tee-level stats) and caches it so the room can reference it
 * by id like any other course. Tee keys can contain "/" (e.g. "Gold/White
 * Combo"), so this takes it as a query param rather than a path segment. */
coursesRouter.get("/:id/tee", async (req, res) => {
  const teeKey = typeof req.query.key === "string" ? req.query.key : "";
  if (!teeKey) return res.status(400).json({ error: "Missing tee selection." });

  try {
    const tee = await fetchGolfCourseTeeDetail(req.params.id, teeKey);
    if ("error" in tee) return res.status(422).json({ error: tee.error });

    const id = `gca-${req.params.id}-${encodeURIComponent(teeKey)}`;
    const course = {
      id,
      name: tee.name,
      pars: tee.pars,
      yardages: tee.yardages,
      handicaps: tee.handicaps,
      teeLabel: tee.teeLabel,
      totalYards: tee.totalYards,
      courseRating: tee.courseRating,
      slopeRating: tee.slopeRating,
      location: tee.location,
    };
    registerCourse(course);
    res.json(course);
  } catch {
    res.status(502).json({ error: "Couldn't load that tee right now. Try again in a bit." });
  }
});
