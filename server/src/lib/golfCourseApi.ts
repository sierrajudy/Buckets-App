const BASE_URL = "https://api.golfcourseapi.com/v1";

export interface GolfApiSearchResult {
  id: string;
  club_name: string;
  course_name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface GolfApiHole {
  par: number;
  yardage: number;
  handicap: number;
}

interface GolfApiTee {
  tee_name: string;
  number_of_holes: number;
  par_total: number;
  course_rating: number;
  slope_rating: number;
  total_yards: number;
  holes: GolfApiHole[];
}

interface GolfApiCourseDetail {
  id: string;
  club_name: string;
  course_name: string;
  location: { city?: string; state?: string; country?: string };
  tees: { male?: GolfApiTee[]; female?: GolfApiTee[] };
}

/** Many clubs have multiple courses (e.g. "Corica Park Gc" has a North and a
 * South course) that otherwise show up as visually-identical duplicates —
 * append the course name whenever it's a distinct value. */
export function courseDisplayName(clubName: string, courseName: string): string {
  const club = clubName?.trim() || "";
  const course = courseName?.trim() || "";
  if (!club) return course;
  if (!course || course.toLowerCase() === club.toLowerCase()) return club;
  return `${club} — ${course}`;
}

function apiKey(): string {
  const key = process.env.GOLF_COURSE_API_KEY;
  if (!key) throw new Error("GOLF_COURSE_API_KEY is not configured.");
  return key;
}

async function golfApiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!res.ok) throw new Error(`GolfCourseAPI request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchGolfCourses(query: string): Promise<GolfApiSearchResult[]> {
  const data = await golfApiFetch<{ courses: GolfApiSearchResult[] }>(
    `/search?search_query=${encodeURIComponent(query)}`,
  );
  return data.courses ?? [];
}

export interface TeeOption {
  key: string;
  label: string;
  courseRating: number;
  slopeRating: number;
  totalYards: number;
  parTotal: number;
}

export interface CourseTees {
  name: string;
  location: string | null;
  tees: TeeOption[];
}

function formatLocation(location: { city?: string; state?: string; country?: string }): string | null {
  const parts = [location.city, location.state, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function teeKey(gender: "male" | "female", teeName: string): string {
  return `${gender}:${teeName}`;
}

function teeLabel(gender: "male" | "female", teeName: string): string {
  return `${teeName} (${gender === "male" ? "Men's" : "Women's"})`;
}

/** Every 18-hole tee available for a course, across both tee sets, for the
 * host to pick from once they've settled on the club/course itself. */
export async function fetchGolfCourseTees(id: string): Promise<CourseTees> {
  const data = await golfApiFetch<{ course: GolfApiCourseDetail }>(`/courses/${encodeURIComponent(id)}`);
  const course = data.course;

  const tees: TeeOption[] = [];
  for (const gender of ["male", "female"] as const) {
    for (const tee of course.tees[gender] ?? []) {
      if (tee.number_of_holes !== 18) continue;
      tees.push({
        key: teeKey(gender, tee.tee_name),
        label: teeLabel(gender, tee.tee_name),
        courseRating: tee.course_rating,
        slopeRating: tee.slope_rating,
        totalYards: tee.total_yards,
        parTotal: tee.par_total,
      });
    }
  }

  return { name: courseDisplayName(course.club_name, course.course_name), location: formatLocation(course.location), tees };
}

export interface ResolvedTee {
  name: string;
  location: string | null;
  teeLabel: string;
  courseRating: number;
  slopeRating: number;
  totalYards: number;
  pars: number[];
  yardages: number[];
  handicaps: number[];
}

/** Resolves one specific tee (by the key returned from fetchGolfCourseTees)
 * into the full per-hole data Buckets needs to run a round on it. */
export async function fetchGolfCourseTeeDetail(
  id: string,
  key: string,
): Promise<ResolvedTee | { error: string }> {
  const data = await golfApiFetch<{ course: GolfApiCourseDetail }>(`/courses/${encodeURIComponent(id)}`);
  const course = data.course;

  const [gender, teeName] = key.includes(":") ? [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)] : [null, null];
  if (gender !== "male" && gender !== "female") return { error: "Invalid tee selection." };

  const tee = (course.tees[gender] ?? []).find((t) => t.tee_name === teeName && t.number_of_holes === 18);
  if (!tee) return { error: "That tee is no longer available for this course." };

  return {
    name: courseDisplayName(course.club_name, course.course_name),
    location: formatLocation(course.location),
    teeLabel: teeLabel(gender, tee.tee_name),
    courseRating: tee.course_rating,
    slopeRating: tee.slope_rating,
    totalYards: tee.total_yards,
    pars: tee.holes.map((h) => h.par),
    yardages: tee.holes.map((h) => h.yardage),
    handicaps: tee.holes.map((h) => h.handicap),
  };
}
