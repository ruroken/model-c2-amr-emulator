const assert = require("node:assert/strict");
const test = require("node:test");
const { elapsedActiveSeconds, simulateUsage } = require("../src/simulator");

const config = {
  amrId: "C2M-000409",
  amrMac: "9c:b8:b4:5d:ee:ba",
  amrName: "Hammer",
  simulationStart: "2026-05-11T15:00:44.959Z",
  baseDistanceM: 23460.0,
  baseOperatingS: 12463467.3,
  distancePerDeliveryM: 420,
  deliveryDurationS: 720,
  betweenDeliveriesS: 480,
  workdayStartHourUtc: 7,
  workdayEndHourUtc: 19
};

test("operating time increases during workday hours", () => {
  const start = new Date("2026-05-12T08:00:00.000Z");
  const now = new Date("2026-05-12T09:30:00.000Z");

  assert.equal(elapsedActiveSeconds(start, now, config), 5400);
});

test("operating time pauses overnight", () => {
  const start = new Date("2026-05-12T18:30:00.000Z");
  const now = new Date("2026-05-13T07:30:00.000Z");

  assert.equal(elapsedActiveSeconds(start, now, config), 3600);
});

test("usage response preserves billing schema and increases counters", () => {
  const usage = simulateUsage(new Date("2026-05-11T15:20:44.959Z"), config);

  assert.equal(usage.amr_id, "C2M-000409");
  assert.equal(usage.schema_version, "billing_usage_v1");
  assert.equal(usage.distance_units, "m");
  assert.equal(usage.time_operating_units, "s");
  assert.equal(usage.generated_at, "2026-05-11T15:20:44.959Z");
  assert.ok(usage.distance_traveled > config.baseDistanceM);
  assert.ok(usage.time_operating > config.baseOperatingS);
});
