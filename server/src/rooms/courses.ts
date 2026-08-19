export interface Course {
  id: string;
  name: string;
  pars: number[];
}

export const COURSES: Course[] = [
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

export function getCourse(id: string): Course {
  return COURSES.find((c) => c.id === id) ?? COURSES.find((c) => c.id === DEFAULT_COURSE_ID)!;
}

export function isValidCourseId(id: string): boolean {
  return COURSES.some((c) => c.id === id);
}
