import { readFileSync } from "node:fs";

const destinations = JSON.parse(
  readFileSync(new URL("../data/indian-tourism-destinations.json", import.meta.url), "utf8"),
);

const weatherRows = readFileSync(
  new URL("../data/india-weather-climatology.csv", import.meta.url),
  "utf8",
).trim().split(/\r?\n/);

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const latestWeather = weatherRows.slice(1).map((line) => {
  const cells = line.split(",");
  return { year: Number(cells[1]), values: cells.slice(2).map(Number) };
}).filter((row) => row.year === 2017)[0];

const clean = (value = "") => String(value).toLowerCase().normalize("NFKD")
  .replace(/[()]/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const aliases = {
  coorg: "kodagu",
  alleppey: "alappuzha",
  kashi: "varanasi",
  banaras: "varanasi",
  leh: "ladakh",
};

function destinationMatches(place, query) {
  const q = aliases[clean(query)] || clean(query);
  const candidates = [place.destination_name, place.state, place.district, ...(place.nearest_major_city ? [place.nearest_major_city.name] : [])]
    .map(clean);
  return candidates.some((candidate) => candidate && (candidate === q || candidate.includes(q) || q.includes(candidate)));
}

function interestScore(place, interests) {
  if (!interests.length) return 75;
  const searchable = clean([
    ...(place.trip_types || []),
    ...(place.activities_available || []),
    ...(place.primary_attractions || []),
    place.unique_experiences || "",
  ].join(" "));
  const hits = interests.filter((interest) => searchable.includes(clean(interest)));
  return Math.round(45 + (hits.length / interests.length) * 55);
}

function chooseBudgetTier(place, perPersonDaily) {
  const tiers = [
    ["budget", place.budget_category],
    ["mid-range", place.mid_range_category],
    ["luxury", place.luxury_category],
  ].filter(([, value]) => Array.isArray(value?.total_daily_range) && value.total_daily_range.length === 2);
  if (!tiers.length) return { name: "estimated", range: [1200, 2500] };
  const fit = tiers.find(([, tier]) => perPersonDaily >= Number(tier.total_daily_range[0]));
  const selected = fit || tiers[0];
  return { name: selected[0], range: selected[1].total_daily_range.map(Number) };
}

function seasonForMonth(month) {
  if ([12, 1, 2].includes(month)) return "Winter";
  if ([3, 4].includes(month)) return "Spring";
  if ([5, 6].includes(month)) return "Summer";
  if ([7, 8, 9].includes(month)) return "Monsoon";
  return "Autumn";
}

function makeSchedule(place, days) {
  const attractions = [...new Set([
    ...(place.primary_attractions || []),
    ...(place.hidden_gems || []),
  ].filter(Boolean))];
  const slots = ["09:00", "12:30", "15:30"];
  const schedule = [];
  for (let day = 0; day < days; day += 1) {
    const start = Math.floor((day * attractions.length) / days);
    const end = Math.floor(((day + 1) * attractions.length) / days);
    const selected = attractions.slice(start, end).slice(0, 3);
    schedule.push({
      day: day + 1,
      title: day === 0 ? "Explore the highlights" : day === days - 1 ? "Local experiences & leisure" : "Discover more of the destination",
      visits: selected.map((name, index) => ({
        time: slots[index],
        name,
        duration_hours: 1.5,
        note: "Confirm current opening hours, ticket prices and local access before visiting.",
      })),
      suggestion: selected.length ? "Keep travel time between nearby attractions flexible." : "Use this day for rest, local food and flexible exploration.",
    });
  }
  return schedule;
}

export function generateItinerary(input) {
  const destination = input.destination.trim();
  const candidates = destinations.filter((place) => destinationMatches(place, destination));
  if (!candidates.length) {
    const suggestions = destinations
      .filter((place) => clean(place.state).includes(clean(destination)) || clean(place.destination_name).includes(clean(destination).split(" ")[0]))
      .slice(0, 5)
      .map((place) => place.destination_name);
    const error = new Error("We couldn't find this destination in the Indian tourism dataset.");
    error.status = 404;
    error.suggestions = suggestions;
    throw error;
  }

  const days = input.days;
  const travelers = input.travelers;
  const perPersonDaily = input.total_budget / Math.max(1, days * travelers);
  const interests = (input.interests || []).map((item) => String(item).trim()).filter(Boolean);
  const month = Number(input.travel_date.slice(5, 7));
  const season = seasonForMonth(month);
  const ranked = candidates.map((place) => {
    const preference = interestScore(place, interests);
    const popularity = Math.max(0, Math.min(100, Number(place.popularity_score || 5) * 10));
    const seasonFit = (place.best_seasons || []).some((item) => clean(item).includes(clean(season))) ? 95 : 70;
    const tier = chooseBudgetTier(place, perPersonDaily);
    const [low, high] = tier.range;
    const budgetFit = perPersonDaily >= low ? 95 : Math.max(35, Math.round((perPersonDaily / Math.max(1, low)) * 80));
    const score = Math.round(preference * 0.45 + popularity * 0.25 + seasonFit * 0.15 + budgetFit * 0.15);
    return { place, preference, popularity, seasonFit, budgetFit, tier, score, dailyRange: [low, high] };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const [dailyLow, dailyHigh] = best.dailyRange;
  const estimatedLow = dailyLow * days * travelers;
  const estimatedHigh = dailyHigh * days * travelers;
  const estimatedMid = Math.round((estimatedLow + estimatedHigh) / 2);
  const budgetBreakdown = {
    accommodation: Math.round(estimatedMid * 0.4),
    food: Math.round(estimatedMid * 0.25),
    local_transport: Math.round(estimatedMid * 0.2),
    activities_and_entry: Math.round(estimatedMid * 0.15),
  };
  const explanations = [
    interests.length ? `Matched ${best.preference}/100 against your selected interests.` : "Ranked using destination popularity and budget fit because no interests were selected.",
    `Popularity score: ${best.popularity}/100 from the tourism dataset.`,
    `Season suitability: ${best.seasonFit}/100 for ${season}.`,
    `Budget fit: ${best.budgetFit}/100 using the ${best.tier.name} daily cost range.`,
  ];

  return {
    destination: best.place.destination_name,
    state: best.place.state,
    district: best.place.district,
    travel_date: input.travel_date,
    days,
    travelers,
    interests,
    recommendation_score: best.score,
    score_breakdown: {
      interests: best.preference,
      popularity: best.popularity,
      season: best.seasonFit,
      budget: best.budgetFit,
    },
    explanations,
    days_plan: makeSchedule(best.place, days),
    budget: {
      currency: "INR",
      tier: best.tier.name,
      daily_per_person_range: best.dailyRange,
      estimated_total_range: [estimatedLow, estimatedHigh],
      estimated_total_midpoint: estimatedMid,
      user_budget: input.total_budget,
      within_budget: estimatedLow <= input.total_budget,
      breakdown: budgetBreakdown,
    },
    destination_context: {
      best_seasons: best.place.best_seasons || [],
      avoid_seasons: best.place.avoid_seasons || [],
      rainfall_pattern: best.place.rainfall_pattern || "Seasonal conditions vary.",
      average_temperature: best.place.average_temperature || {},
      safety_rating: best.place.safety_rating ?? null,
      safety_notes: best.place.safety_notes || "",
      food_scene: best.place.food_scene || "",
      local_cuisine: best.place.local_cuisine_must_try || [],
      accessibility: best.place.accessibility || "Check locally",
      permits_required: Boolean(best.place.permits_required),
      permits_details: best.place.permits_details || "",
      climate_reference: latestWeather
        ? `India-wide historical average for ${MONTHS[month - 1]}: ${latestWeather.values[month - 1]}°C (2017 dataset; not a live forecast).`
        : "Historical weather reference unavailable.",
    },
    data_sources: [
      "SafeTrip-AI Indian Tourism Dataset (100 destination records)",
      "SafeTrip-AI Weather Data in India (1901–2017; national monthly climatology)",
    ],
    disclaimer: "This is a suggested plan based on reference datasets. Confirm opening hours, local transport, weather forecasts, permits and current prices before travel.",
  };
}

export function listItineraryDestinations() {
  return destinations.map((place) => ({
    name: place.destination_name,
    state: place.state,
    popularity_score: place.popularity_score,
  })).sort((a, b) => a.name.localeCompare(b.name));
}
