export interface Course {
  id: string;
  name: string;
  pars: number[];
  yardages: number[];
  handicaps: number[];
  teeLabel: string;
  totalYards: number;
  courseRating: number;
  slopeRating: number;
  /** "City, State, Country" as GolfCourseAPI reports it, for the Lobby's
   * weather chip — null for older cached/snapshotted courses that predate
   * this field. */
  location: string | null;
}

/** Courses only exist once a host has searched GolfCourseAPI and picked a
 * specific course + tee (see routes/courses.ts) — there is no default. */
const COURSE_CACHE = new Map<string, Course>();

/** Registers a course fetched from GolfCourseAPI so getCourse/isValidCourseId
 * can resolve it synchronously once a room references its id. */
export function registerCourse(course: Course): void {
  COURSE_CACHE.set(course.id, course);
}

export function getCourse(id: string | null): Course | null {
  if (!id) return null;
  return COURSE_CACHE.get(id) ?? null;
}

export function isValidCourseId(id: string): boolean {
  return COURSE_CACHE.has(id);
}
