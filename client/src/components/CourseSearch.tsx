import { useEffect, useRef, useState } from "react";
import { fetchCourseTees, searchCourses, selectCourseTee } from "../lib/api";
import type { CourseSearchResult, CourseSelection, CourseTees } from "../types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function CourseSearch({ onSelect }: { onSelect: (course: CourseSelection) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [tees, setTees] = useState<CourseTees | null>(null);
  const [loadingTees, setLoadingTees] = useState(false);
  const [resolvingTee, setResolvingTee] = useState(false);

  useEffect(() => {
    if (picked) return; // a course is already picked — the tee dropdown owns the UI now
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
  }, [query, picked]);

  async function handlePickCourse(result: CourseSearchResult) {
    setPicked({ id: result.id, name: result.name });
    setResults(null);
    setError(null);
    setLoadingTees(true);
    try {
      const detail = await fetchCourseTees(result.id);
      setTees(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load tees for that course.");
      setTees(null);
    } finally {
      setLoadingTees(false);
    }
  }

  function handleChangeCourse() {
    setPicked(null);
    setTees(null);
    setError(null);
  }

  async function handlePickTee(teeKey: string) {
    if (!picked || !teeKey) return;
    setResolvingTee(true);
    setError(null);
    try {
      const course = await selectCourseTee(picked.id, teeKey);
      onSelect(course);
      setPicked(null);
      setTees(null);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that tee.");
    } finally {
      setResolvingTee(false);
    }
  }

  if (picked) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">{picked.name}</div>
          <button
            type="button"
            onClick={handleChangeCourse}
            className="text-xs text-neutral-500 hover:text-green-600 dark:hover:text-green-400 shrink-0"
          >
            Change course
          </button>
        </div>

        {loadingTees && <p className="text-xs text-neutral-500">Loading tees…</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}

        {tees && tees.tees.length > 0 && (
          <select
            defaultValue=""
            disabled={resolvingTee}
            onChange={(e) => handlePickTee(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="" disabled>
              {resolvingTee ? "Loading course…" : "Pick a tee"}
            </option>
            {tees.tees.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} — Par {t.parTotal}, {t.totalYards} yds
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any course (e.g. Pebble Beach)"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">…</span>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {results &&
        (results.length === 0 ? (
          <p className="text-xs text-neutral-500">No courses found — try a different spelling or add a city.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handlePickCourse(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <div className="font-semibold">{r.name}</div>
                {r.location && <div className="text-xs text-neutral-500">{r.location}</div>}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
