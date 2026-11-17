import test from "node:test";
import assert from "node:assert/strict";
import { generateItinerary, listItineraryDestinations } from "../src/services/itineraryEngine.js";

const request = {
  destination: "Goa",
  travel_date: "2026-12-10",
  days: 3,
  travelers: 2,
  total_budget: 30000,
  interests: ["Beach", "Food"],
};

test("generates a day-wise itinerary for a supported destination", () => {
  const result = generateItinerary(request);
  assert.equal(result.destination, "Goa");
  assert.equal(result.days_plan.length, 3);
  assert.ok(result.recommendation_score >= 0 && result.recommendation_score <= 100);
  assert.ok(result.days_plan.every((day) => day.visits.length <= 3));
  assert.equal(result.budget.currency, "INR");
});

test("supports common destination aliases", () => {
  const result = generateItinerary({ ...request, destination: "Mysuru" });
  assert.match(result.destination.toLowerCase(), /mysore|mysuru/);
});

test("returns an actionable not-found error for unsupported destinations", () => {
  assert.throws(
    () => generateItinerary({ ...request, destination: "Atlantis" }),
    (error) => error.status === 404 && /tourism dataset/i.test(error.message),
  );
});

test("lists destinations from the tourism dataset", () => {
  const results = listItineraryDestinations();
  assert.ok(results.length >= 50);
  assert.ok(results.some((place) => place.name === "Goa"));
});
