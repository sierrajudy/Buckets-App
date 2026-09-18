import { useEffect, useState } from "react";
import { fetchWeather, type CurrentWeather } from "../lib/api";

/** A small "☀️ 72°F · 5mph wind" chip for the course card in the Lobby —
 * fetched once per location string (a course's city), not live-updating.
 * Silently renders nothing on failure (an unrecognized city, the geocoder
 * having no match, Open-Meteo being down) rather than showing an error for
 * what's just a nice-to-have. */
export function WeatherChip({ location }: { location: string | null }) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    setWeather(null);
    if (!location) return;
    let cancelled = false;
    fetchWeather(location)
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location]);

  if (!weather) return null;

  return (
    <div className="text-xs text-neutral-400 mt-0.5">
      {weather.emoji} {weather.tempF}°F, {weather.condition.toLowerCase()} · {weather.windMph}mph wind
    </div>
  );
}
