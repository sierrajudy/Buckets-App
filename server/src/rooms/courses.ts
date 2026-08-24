export interface Course {
  id: string;
  name: string;
  pars: number[];
}

/** Bootstrap set — used only as the default for a brand-new room before the
 * host searches for a real course via GolfCourseAPI (see routes/courses.ts).
 * Any course found through search gets cached into COURSE_CACHE at runtime. */
const SEED_COURSES: Course[] = [
  {
    id: "monarch-bay",
    name: "Monarch Bay Golf Club — Marina Course",
    pars: [4, 3, 3, 4, 3, 3, 3, 4, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3],
  },
  {
    id: "lake-chabot",
    name: "Lake Chabot Golf Course",
    pars: [4, 3, 5, 5, 4, 4, 3, 5, 3, 4, 4, 3, 4, 4, 4, 4, 3, 5],
  },
  {
    id: "stonebrae",
    name: "Stonebrae Country Club",
    pars: [4, 4, 3, 5, 4, 5, 3, 4, 4, 4, 3, 5, 3, 4, 3, 5, 4, 5],
  },
  {
    id: "metropolitan",
    name: "Metropolitan Golf Links",
    pars: [4, 4, 5, 4, 3, 5, 3, 4, 4, 5, 4, 3, 4, 4, 3, 4, 5, 4],
  },
  {
    id: "corica-south",
    name: "Corica Park — South Course",
    pars: [5, 4, 4, 4, 3, 5, 3, 4, 4, 4, 3, 4, 4, 4, 5, 3, 5, 4],
  },
  {
    id: "corica-north",
    name: "Corica Park — North Course",
    pars: [4, 5, 4, 3, 5, 3, 4, 4, 4, 4, 4, 4, 3, 5, 4, 5, 3, 4],
  },
  {
    id: "berkeley-cc",
    name: "Berkeley Country Club",
    pars: [4, 3, 4, 4, 4, 4, 4, 5, 4, 5, 4, 3, 4, 4, 4, 5, 3, 4],
  },
  {
    id: "blue-hill",
    name: "Blue Hill Country Club",
    pars: [5, 4, 4, 4, 3, 5, 4, 3, 4, 4, 4, 3, 5, 3, 4, 4, 4, 5],
  },
];

export const DEFAULT_COURSE_ID = "monarch-bay";

const COURSE_CACHE = new Map<string, Course>(SEED_COURSES.map((c) => [c.id, c]));

/** Registers a course fetched from GolfCourseAPI so getCourse/isValidCourseId
 * can resolve it synchronously once a room references its id. */
export function registerCourse(course: Course): void {
  COURSE_CACHE.set(course.id, course);
}

export function getCourse(id: string): Course {
  return COURSE_CACHE.get(id) ?? COURSE_CACHE.get(DEFAULT_COURSE_ID)!;
}

export function isValidCourseId(id: string): boolean {
  return COURSE_CACHE.has(id);
}
