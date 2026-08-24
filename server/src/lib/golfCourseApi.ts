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
  holes: GolfApiHole[];
}

interface GolfApiCourseDetail {
  id: string;
  club_name: string;
  course_name: string;
  location: { city?: string; state?: string; country?: string };
  tees: { male?: GolfApiTee[]; female?: GolfApiTee[] };
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

/** Picks the first 18-hole tee available (preferring men's tees), since Buckets
 * only tracks par per hole — yardage/rating/slope differ by tee but par rarely does. */
export async function fetchGolfCourseDetail(
  id: string,
): Promise<{ name: string; pars: number[] } | { error: string }> {
  const data = await golfApiFetch<{ course: GolfApiCourseDetail }>(`/courses/${encodeURIComponent(id)}`);
  const course = data.course;
  const tee = course.tees.male?.find((t) => t.number_of_holes === 18) ?? course.tees.female?.find((t) => t.number_of_holes === 18);

  if (!tee) {
    return { error: "This course doesn't have 18-hole tee data available." };
  }

  return {
    name: course.club_name || course.course_name,
    pars: tee.holes.map((h) => h.par),
  };
}
