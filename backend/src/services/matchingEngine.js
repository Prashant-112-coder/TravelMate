const WEIGHTS = {
  destination: 30,
  dates: 25,
  budget: 15,
  travelStyle: 10,
  interests: 10,
  activities: 10,
};

const clean = (value = "") =>
  String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");

const tokens = (value = "") => new Set(clean(value).split(" ").filter(Boolean));

const jaccard = (a = [], b = []) => {
  const left = new Set(a.map((x) => clean(x)).filter(Boolean));
  const right = new Set(b.map((x) => clean(x)).filter(Boolean));
  if (!left.size || !right.size) return null;
  const intersection = [...left].filter((x) => right.has(x)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
};

function destinationSimilarity(a, b) {
  if (!a || !b) return null;
  const left = clean(a);
  const right = clean(b);
  if (!left || !right) return null;
  if (left === right || left.includes(right) || right.includes(left)) return 1;
  const lt = tokens(a);
  const rt = tokens(b);
  const overlap = [...lt].filter((x) => rt.has(x)).length;
  return overlap ? overlap / Math.max(lt.size, rt.size) : 0;
}

function dateSimilarity(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return null;
  const as = new Date(aStart);
  const ae = new Date(aEnd);
  const bs = new Date(bStart);
  const be = new Date(bEnd);
  if ([as, ae, bs, be].some((d) => Number.isNaN(d.getTime()))) return null;
  const overlapStart = Math.max(as.getTime(), bs.getTime());
  const overlapEnd = Math.min(ae.getTime(), be.getTime());
  if (overlapEnd < overlapStart) return 0;
  const unionStart = Math.min(as.getTime(), bs.getTime());
  const unionEnd = Math.max(ae.getTime(), be.getTime());
  const union = Math.max(1, unionEnd - unionStart);
  return Math.min(1, (overlapEnd - overlapStart + 86400000) / union);
}

function budgetSimilarity(aMin, aMax, bMin, bMax) {
  if (aMin == null || aMax == null || bMin == null || bMax == null) return null;
  const leftMin = Number(aMin);
  const leftMax = Number(aMax);
  const rightMin = Number(bMin);
  const rightMax = Number(bMax);
  if (![leftMin, leftMax, rightMin, rightMax].every(Number.isFinite)) return null;
  const overlap = Math.max(0, Math.min(leftMax, rightMax) - Math.max(leftMin, rightMin));
  const union = Math.max(leftMax, rightMax) - Math.min(leftMin, rightMin);
  if (union <= 0) return leftMin === rightMin ? 1 : 0;
  return overlap > 0 ? overlap / union : 0;
}

function scalarSimilarity(a, b) {
  if (!a || !b) return null;
  return clean(a) === clean(b) ? 1 : 0;
}

const neutralIfMissing = (value) => value == null ? 0.5 : value;

export function compareTrips(source, candidate) {
  const destination = destinationSimilarity(source.destination, candidate.destination);
  const dates = dateSimilarity(source.start_date, source.end_date, candidate.start_date, candidate.end_date);
  const budget = budgetSimilarity(source.budget_min, source.budget_max, candidate.budget_min, candidate.budget_max);
  const travelStyle = scalarSimilarity(source.travel_style, candidate.travel_style);
  const interests = jaccard(source.interests, candidate.interests);
  const activities = jaccard(source.activities, candidate.activities);

  const breakdown = {
    destination: Math.round(neutralIfMissing(destination) * WEIGHTS.destination),
    dates: Math.round(neutralIfMissing(dates) * WEIGHTS.dates),
    budget: Math.round(neutralIfMissing(budget) * WEIGHTS.budget),
    travelStyle: Math.round(neutralIfMissing(travelStyle) * WEIGHTS.travelStyle),
    interests: Math.round(neutralIfMissing(interests) * WEIGHTS.interests),
    activities: Math.round(neutralIfMissing(activities) * WEIGHTS.activities),
  };

  const raw = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const score = Math.max(0, Math.min(100, raw));

  return {
    score,
    breakdown,
    features: {
      destination_similarity: destination,
      date_overlap: dates,
      budget_similarity: budget,
      style_similarity: travelStyle,
      interests_similarity: interests,
      activities_similarity: activities,
    },
    missing: [
      destination == null ? "destination" : null,
      dates == null ? "dates" : null,
      budget == null ? "budget" : null,
      travelStyle == null ? "travel style" : null,
      interests == null ? "interests" : null,
      activities == null ? "activities" : null,
    ].filter(Boolean),
  };
}

export function passesHardConstraints(source, candidate) {
  const destination = destinationSimilarity(source.destination, candidate.destination);
  const dates = dateSimilarity(source.start_date, source.end_date, candidate.start_date, candidate.end_date);
  return destination != null && destination > 0 && dates != null && dates > 0;
}

export function matchingEngineName() {
  return process.env.MATCHING_ENGINE || "baseline";
}

export function rankCandidates(source, candidates) {
  return candidates
    .filter((candidate) => passesHardConstraints(source, candidate))
    .map((candidate) => {
      const result = compareTrips(source, candidate);
      return { candidate, ...result };
    })
    .sort((a, b) => b.score - a.score);
}

export { WEIGHTS };
