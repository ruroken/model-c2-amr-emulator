const assert = require("node:assert/strict");
const test = require("node:test");
const { listAmrs, simulateTimeline, simulateUsage } = require("../src/simulator");

const config = {
  simulationStart: "2026-05-11T15:00:44.959Z",
  metersPerNavigatingSecond: 0.58,
  minNavigateS: 15,
  maxNavigateS: 300,
  minIdleS: 30,
  maxIdleS: 900,
  minChargeEveryS: 12 * 3600,
  maxChargeEveryS: 16 * 3600,
  minChargeDurationS: 2 * 3600,
  maxChargeDurationS: 3 * 3600
};

const amr = {
  amrId: "C2M-000409",
  amrMac: "9c:b8:b4:5d:ee:ba",
  amrName: "Hammer",
  baseDistanceM: 23460.0,
  baseOperatingS: 12463467.3
};

test("lists multiple AMRs", () => {
  const amrs = listAmrs();

  assert.ok(amrs.length >= 3);
  assert.deepEqual(amrs[0], {
    amr_id: "C2M-000409",
    amr_mac: "9c:b8:b4:5d:ee:ba",
    amr_name: "Hammer"
  });
  assert.ok(amrs.some((listedAmr) => listedAmr.amr_id === "C2S-000410"));
  assert.ok(amrs.some((listedAmr) => listedAmr.amr_id === "C2L-000411"));
});

test("timeline includes charging windows", () => {
  const timeline = simulateTimeline(amr, new Date("2026-05-12T05:00:44.959Z"), config);

  assert.equal(timeline.status, "charging");
});

test("usage response preserves billing schema and includes status", () => {
  const usage = simulateUsage("C2M-000409", new Date("2026-05-11T15:20:44.959Z"), config);

  assert.equal(usage.amr_id, "C2M-000409");
  assert.equal(usage.schema_version, "billing_usage_v1");
  assert.equal(usage.distance_units, "m");
  assert.equal(usage.time_operating_units, "s");
  assert.equal(usage.generated_at, "2026-05-11T15:20:44.959Z");
  assert.match(usage.status, /^(navigating|charging|idle)$/);
  assert.ok(usage.distance_traveled > amr.baseDistanceM);
  assert.ok(usage.time_operating > amr.baseOperatingS);
});

test("unknown AMR returns null", () => {
  assert.equal(simulateUsage("C2M-999999", new Date("2026-05-11T15:20:44.959Z"), config), null);
});
