import test from "node:test";
import assert from "node:assert/strict";
import { compareTrips, passesHardConstraints, rankCandidates, WEIGHTS } from "../src/services/matchingEngine.js";

const baseTrip = {
  destination: "Goa",
  start_date: "2026-10-03",
  end_date: "2026-10-05",
  budget_min: 10000,
  budget_max: 20000,
  travel_style: "Backpacking",
  interests: ["Beach", "Food", "Photography"],
  activities: ["Water sports", "Photography"],
};

test("weights total 100", () => {
  assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100);
});

test("identical trips receive full compatibility", () => {
  const result = compareTrips(baseTrip, { ...baseTrip });
  assert.equal(result.score, 100);
  assert.deepEqual(result.breakdown, {
    destination: 30,
    dates: 25,
    budget: 15,
    travelStyle: 10,
    interests: 10,
    activities: 10,
  });
});

test("destination comparison ignores case and surrounding whitespace", () => {
  const candidate = { ...baseTrip, destination: "  GOA  " };
  assert.equal(compareTrips(baseTrip, candidate).breakdown.destination, WEIGHTS.destination);
  assert.equal(passesHardConstraints(baseTrip, candidate), true);
});

test("different destinations fail the hard destination constraint", () => {
  const candidate = { ...baseTrip, destination: "Manali" };
  assert.equal(passesHardConstraints(baseTrip, candidate), false);
});

test("non-overlapping dates fail the hard date constraint", () => {
  const candidate = {
    ...baseTrip,
    start_date: "2026-11-01",
    end_date: "2026-11-05",
  };
  assert.equal(passesHardConstraints(baseTrip, candidate), false);
});

test("invalid date strings fail the hard date constraint", () => {
  const candidate = {
    ...baseTrip,
    start_date: "not-a-date",
    end_date: "2026-10-05",
  };
  assert.equal(passesHardConstraints(baseTrip, candidate), false);
});

test("partial overlap is accepted and produces a date contribution", () => {
  const candidate = {
    ...baseTrip,
    start_date: "2026-10-05",
    end_date: "2026-10-08",
  };
  const result = compareTrips(baseTrip, candidate);
  assert.equal(passesHardConstraints(baseTrip, candidate), true);
  assert.ok(result.breakdown.dates > 0);
});

test("missing optional data uses neutral scoring", () => {
  const candidate = {
    destination: "Goa",
    start_date: "2026-10-03",
    end_date: "2026-10-05",
    budget_min: null,
    budget_max: null,
    travel_style: null,
    interests: [],
    activities: [],
  };
  const result = compareTrips(baseTrip, candidate);
  assert.equal(result.breakdown.destination, 30);
  assert.equal(result.breakdown.dates, 25);
  assert.equal(result.breakdown.budget, 8);
  assert.equal(result.breakdown.travelStyle, 5);
  assert.equal(result.breakdown.interests, 5);
  assert.equal(result.breakdown.activities, 5);
});

test("candidate ranking excludes incompatible trips and sorts by score", () => {
  const lowerScore = {
    ...baseTrip,
    travel_style: "Luxury",
    interests: ["Museums"],
    activities: ["Hiking"],
  };
  const incompatible = { ...baseTrip, destination: "Manali" };
  const ranked = rankCandidates(baseTrip, [lowerScore, incompatible, { ...baseTrip }]);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].score, 100);
  assert.ok(ranked[0].score >= ranked[1].score);
  assert.ok(ranked.every((item) => item.candidate.destination === "Goa"));
});
