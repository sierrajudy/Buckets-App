/** Open-Meteo — free, no API key, generous rate limits, good enough
 * accuracy for "what's it like at the course right now" in a casual golf
 * app. Two calls: geocode the course's "City, State, Country" string to a
 * lat/lon, then ask for current conditions there. */
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface CurrentWeather {
  tempF: number;
  windMph: number;
  condition: string;
  emoji: string;
}

/** WMO weather codes, collapsed to the handful of conditions worth showing
 * next to a tee time. https://open-meteo.com/en/docs lists the full table;
 * anything not covered here (fog variants, drizzle, etc.) falls through to
 * the nearest neighbor rather than getting its own case. */
function describeWeatherCode(code: number): { condition: string; emoji: string } {
  if (code === 0) return { condition: "Clear", emoji: "☀️" };
  if (code <= 2) return { condition: "Partly cloudy", emoji: "🌤️" };
  if (code === 3) return { condition: "Cloudy", emoji: "☁️" };
  if (code <= 48) return { condition: "Foggy", emoji: "🌫️" };
  if (code <= 57) return { condition: "Drizzle", emoji: "🌦️" };
  if (code <= 67) return { condition: "Rain", emoji: "🌧️" };
  if (code <= 77) return { condition: "Snow", emoji: "❄️" };
  if (code <= 82) return { condition: "Showers", emoji: "🌦️" };
  if (code <= 99) return { condition: "Thunderstorms", emoji: "⛈️" };
  return { condition: "Unknown", emoji: "🌡️" };
}

/** Takes just the first comma-separated part of a "City, State, Country"
 * string — Open-Meteo's geocoder matches a plain city name far more
 * reliably than the whole string with state/country appended. */
function cityFromLocation(location: string): string {
  return location.split(",")[0]?.trim() ?? location;
}

export async function getCurrentWeather(location: string): Promise<CurrentWeather | null> {
  const city = cityFromLocation(location);
  if (!city) return null;

  const geoRes = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1`);
  if (!geoRes.ok) return null;
  const geoData = (await geoRes.json()) as { results?: { latitude: number; longitude: number }[] };
  const spot = geoData.results?.[0];
  if (!spot) return null;

  const forecastRes = await fetch(
    `${FORECAST_URL}?latitude=${spot.latitude}&longitude=${spot.longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`,
  );
  if (!forecastRes.ok) return null;
  const forecastData = (await forecastRes.json()) as {
    current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  };
  const current = forecastData.current;
  if (!current) return null;

  const { condition, emoji } = describeWeatherCode(current.weather_code);
  return {
    tempF: Math.round(current.temperature_2m),
    windMph: Math.round(current.wind_speed_10m),
    condition,
    emoji,
  };
}
