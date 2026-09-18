import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { fetchCourseTees, searchCourses, selectCourseTee } from "../lib/api";
import {
  addFavoriteCourse,
  fetchFavoriteCourses,
  removeFavoriteCourse,
  type FavoriteCourse,
} from "../lib/favoriteCoursesApi";
import type { CourseSearchResult, CourseSelection, CourseStats, CourseTeeOption } from "../types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

/** Owns both the course picker and the tee picker as two peer rows (course
 * name + "Change course", tee as an always-visible dropdown once a course
 * is known) — mirroring how "Starting hole" is always a plain dropdown.
 * Only one course/tee pair is ever active: picking a new course immediately
 * replaces whatever was pending or already applied, instead of the two
 * showing side by side. */
export function CourseSearch({
  onSelect,
  confirmedCourseName,
  confirmedCourseStats,
}: {
  onSelect: (course: CourseSelection) => void;
  confirmedCourseName: string | null;
  confirmedCourseStats: CourseStats | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const [editingCourse, setEditingCourse] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<
    { id: string; name: string; location: string | null; tees: CourseTeeOption[] } | null
  >(null);
  const [loadingTees, setLoadingTees] = useState(false);
  const [selectedTeeKey, setSelectedTeeKey] = useState("");
  const [resolvingTee, setResolvingTee] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteCourse[] | null>(null);

  const hasSelection = Boolean(pendingCourse) || Boolean(confirmedCourseName);
  const displayName = pendingCourse?.name ?? confirmedCourseName;

  useEffect(() => {
    fetchFavoriteCourses()
      .then(setFavorites)
      .catch(() => setFavorites([]));
  }, []);

  function isFavorited(id: string): boolean {
    return favorites?.some((f) => f.id === id) ?? false;
  }

  async function toggleFavorite(course: { id: string; name: string; location: string | null }) {
    if (isFavorited(course.id)) {
      setFavorites((favs) => (favs ?? []).filter((f) => f.id !== course.id));
      await removeFavoriteCourse(course.id);
    } else {
      setFavorites((favs) => [...(favs ?? []), course]);
      await addFavoriteCourse(course);
    }
  }

  useEffect(() => {
    if (!editingCourse) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setSearching(false);
      setError(null);
      return;
    }

    setSearching(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const rows = await searchCourses(trimmed);
        if (id !== requestId.current) return; // a newer keystroke already superseded this request
        setResults(rows);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Search failed.");
        setResults(null);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, editingCourse]);

  async function handlePickCourse(result: { id: string; name: string; location: string | null }) {
    setError(null);
    setResults(null);
    setQuery("");
    setEditingCourse(false);
    setSelectedTeeKey("");
    setPendingCourse({ id: result.id, name: result.name, location: result.location, tees: [] });
    setLoadingTees(true);
    try {
      const detail = await fetchCourseTees(result.id);
      setPendingCourse({ id: result.id, name: detail.name, location: detail.location, tees: detail.tees });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load tees for that course.");
      setPendingCourse(null);
    } finally {
      setLoadingTees(false);
    }
  }

  function cancelEditing() {
    setEditingCourse(false);
    setQuery("");
    setResults(null);
    setError(null);
  }

  async function handlePickTee(teeKey: string) {
    if (!pendingCourse || !teeKey) return;
    setSelectedTeeKey(teeKey);
    setResolvingTee(true);
    setError(null);
    try {
      const course = await selectCourseTee(pendingCourse.id, teeKey);
      onSelect(course);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that tee.");
    } finally {
      setResolvingTee(false);
    }
  }

  return (
    <>
      <div className="mt-1">
        {!editingCourse ? (
          <div className="flex items-center justify-between gap-2">
            {displayName ? (
              <div className="font-semibold text-sm text-white">{displayName}</div>
            ) : (
              <div className="font-semibold text-sm italic text-white/60">No course selected</div>
            )}
            <button
              type="button"
              onClick={() => setEditingCourse(true)}
              className="text-xs text-white/70 hover:text-primary-400 shrink-0"
            >
              Change course
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any course (e.g. Pebble Beach)"
                  className="w-full rounded-lg border border-white/40 bg-transparent text-white placeholder:text-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60">…</span>
                )}
              </div>
              {hasSelection && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="text-xs text-white/70 hover:text-danger-400 shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>

            {error && <p className="text-xs text-danger-400">{error}</p>}

            {!results && favorites && favorites.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">
                  <Star size={12} aria-hidden fill="currentColor" /> Your favorites
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-white/20 divide-y divide-white/10">
                  {favorites.map((f) => (
                    <CourseRow key={f.id} course={f} favorited onSelect={handlePickCourse} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
              </div>
            )}

            {results &&
              (results.length === 0 ? (
                <p className="text-xs text-white/70">No courses found — try a different spelling or add a city.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-white/20 divide-y divide-white/10">
                  {results.map((r) => (
                    <CourseRow
                      key={r.id}
                      course={r}
                      favorited={isFavorited(r.id)}
                      onSelect={handlePickCourse}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {!pendingCourse && confirmedCourseStats && (
        <div className="text-xs text-white/70 mt-0.5">
          {confirmedCourseStats.teeLabel} tees · {confirmedCourseStats.totalYards} yds · Rating{" "}
          {confirmedCourseStats.courseRating.toFixed(1)} · Slope {confirmedCourseStats.slopeRating}
        </div>
      )}

      {!editingCourse && (pendingCourse || confirmedCourseStats) && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-white">Tee</label>
            {pendingCourse && (
              <button
                type="button"
                onClick={() => toggleFavorite(pendingCourse)}
                title={isFavorited(pendingCourse.id) ? "Remove from favorites" : "Save as a favorite course"}
                className={isFavorited(pendingCourse.id) ? "text-warning-400" : "text-white/60"}
              >
                <Star size={18} fill={isFavorited(pendingCourse.id) ? "currentColor" : "none"} />
              </button>
            )}
          </div>
          {pendingCourse ? (
            <select
              value={selectedTeeKey}
              disabled={loadingTees || resolvingTee}
              onChange={(e) => handlePickTee(e.target.value)}
              className="w-full rounded-lg border border-white/40 bg-transparent text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="" disabled className="text-black">
                {loadingTees ? "Loading tees…" : resolvingTee ? "Loading course…" : "Pick a tee"}
              </option>
              {pendingCourse.tees.map((t) => (
                <option key={t.key} value={t.key} className="text-black">
                  {t.label} — Par {t.parTotal}, {t.totalYards} yds
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-white/70">{confirmedCourseStats!.teeLabel}</div>
          )}
        </div>
      )}
    </>
  );
}

function CourseRow({
  course,
  favorited,
  onSelect,
  onToggleFavorite,
}: {
  course: { id: string; name: string; location: string | null };
  favorited: boolean;
  onSelect: (course: { id: string; name: string; location: string | null }) => void;
  onToggleFavorite: (course: { id: string; name: string; location: string | null }) => void;
}) {
  return (
    <div className="w-full flex items-center gap-1 px-1">
      <button
        type="button"
        onClick={() => onSelect(course)}
        className="flex-1 min-w-0 text-left px-2 py-2 text-sm text-white hover:bg-white/10 rounded"
      >
        <div className="font-semibold truncate">{course.name}</div>
        {course.location && <div className="text-xs text-white/60 truncate">{course.location}</div>}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(course);
        }}
        title={favorited ? "Remove from favorites" : "Save as a favorite course"}
        className={`shrink-0 px-2 ${favorited ? "text-warning-400" : "text-white/60"}`}
      >
        <Star size={16} fill={favorited ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
