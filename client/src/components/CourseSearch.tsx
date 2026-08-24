import { useState } from "react";
import { searchCourses, selectCourse } from "../lib/api";
import type { CourseSearchResult, CourseSelection } from "../types";

export function CourseSearch({ onSelect }: { onSelect: (course: CourseSelection) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const rows = await searchCourses(query.trim());
      setResults(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

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
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any course (e.g. Pebble Beach)"
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

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
