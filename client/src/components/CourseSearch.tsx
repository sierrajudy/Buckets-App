import { useEffect, useRef, useState } from "react";
import { searchCourses, selectCourse } from "../lib/api";
import type { CourseSearchResult, CourseSelection } from "../types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function CourseSearch({ onSelect }: { onSelect: (course: CourseSelection) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
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
  }, [query]);

  async function handlePick(result: CourseSearchResult) {
    setSelectingId(result.id);
    setError(null);
    try {
      const course = await selectCourse(result.id);
      onSelect(course);
      setResults(null);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that course.");
    } finally {
      setSelectingId(null);
    }
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
                disabled={selectingId !== null}
                onClick={() => handlePick(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                <div className="font-semibold">{r.name}</div>
                {r.location && <div className="text-xs text-neutral-500">{r.location}</div>}
                {selectingId === r.id && <div className="text-xs text-green-600 mt-0.5">Loading course…</div>}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
