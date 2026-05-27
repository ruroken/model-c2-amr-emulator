const DEFAULT_CONFIG = {
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

function numberFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getConfig() {
  return {
    amrId: process.env.AMR_ID || DEFAULT_CONFIG.amrId,
    amrMac: process.env.AMR_MAC || DEFAULT_CONFIG.amrMac,
    amrName: process.env.AMR_NAME || DEFAULT_CONFIG.amrName,
    simulationStart: process.env.SIMULATION_START || DEFAULT_CONFIG.simulationStart,
    baseDistanceM: numberFromEnv("BASE_DISTANCE_M", DEFAULT_CONFIG.baseDistanceM),
    baseOperatingS: numberFromEnv("BASE_OPERATING_S", DEFAULT_CONFIG.baseOperatingS),
    distancePerDeliveryM: numberFromEnv("DISTANCE_PER_DELIVERY_M", DEFAULT_CONFIG.distancePerDeliveryM),
    deliveryDurationS: numberFromEnv("DELIVERY_DURATION_S", DEFAULT_CONFIG.deliveryDurationS),
    betweenDeliveriesS: numberFromEnv("BETWEEN_DELIVERIES_S", DEFAULT_CONFIG.betweenDeliveriesS),
    workdayStartHourUtc: numberFromEnv("WORKDAY_START_HOUR_UTC", DEFAULT_CONFIG.workdayStartHourUtc),
    workdayEndHourUtc: numberFromEnv("WORKDAY_END_HOUR_UTC", DEFAULT_CONFIG.workdayEndHourUtc)
  };
}

function secondsSinceMidnightUtc(date) {
  return date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds() + date.getUTCMilliseconds() / 1000;
}

function startOfUtcDayMs(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function activeSecondsWithinDay(date, config) {
  const workdayStartS = config.workdayStartHourUtc * 3600;
  const workdayEndS = config.workdayEndHourUtc * 3600;
  const elapsedS = secondsSinceMidnightUtc(date);

  if (elapsedS <= workdayStartS) return 0;
  if (elapsedS >= workdayEndS) return workdayEndS - workdayStartS;
  return elapsedS - workdayStartS;
}

function elapsedActiveSeconds(start, now, config) {
  if (now <= start) return 0;

  const dayMs = 24 * 3600 * 1000;
  const startDayMs = startOfUtcDayMs(start);
  const nowDayMs = startOfUtcDayMs(now);
  const workdaySeconds = Math.max(0, (config.workdayEndHourUtc - config.workdayStartHourUtc) * 3600);

  if (startDayMs === nowDayMs) {
    return Math.max(0, activeSecondsWithinDay(now, config) - activeSecondsWithinDay(start, config));
  }

  const firstDayActive = Math.max(0, workdaySeconds - activeSecondsWithinDay(start, config));
  const fullDays = Math.max(0, Math.floor((nowDayMs - startDayMs) / dayMs) - 1);
  const currentDayActive = activeSecondsWithinDay(now, config);

  return firstDayActive + fullDays * workdaySeconds + currentDayActive;
}

function simulateUsage(now = new Date(), config = getConfig()) {
  const simulationStart = new Date(config.simulationStart);
  const activeSeconds = elapsedActiveSeconds(simulationStart, now, config);
  const cycleSeconds = config.deliveryDurationS + config.betweenDeliveriesS;
  const completedDeliveries = Math.floor(activeSeconds / cycleSeconds);
  const currentCycleS = activeSeconds % cycleSeconds;
  const currentDeliveryProgress = Math.min(currentCycleS, config.deliveryDurationS) / config.deliveryDurationS;
  const deliveryEquivalent = completedDeliveries + currentDeliveryProgress;

  return {
    amr_id: config.amrId,
    amr_mac: config.amrMac,
    amr_name: config.amrName,
    distance_traveled: round(config.baseDistanceM + deliveryEquivalent * config.distancePerDeliveryM, 1),
    distance_units: "m",
    generated_at: now.toISOString(),
    schema_version: "billing_usage_v1",
    time_operating: round(config.baseOperatingS + activeSeconds, 1),
    time_operating_units: "s"
  };
}

function round(value, places) {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

module.exports = {
  DEFAULT_CONFIG,
  elapsedActiveSeconds,
  getConfig,
  simulateUsage
};
