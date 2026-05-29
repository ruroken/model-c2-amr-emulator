const DEFAULT_CONFIG = {
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

const AMRS = [
  {
    amrId: "C2M-000409",
    amrMac: "9c:b8:b4:5d:ee:ba",
    amrName: "Hammer",
    baseDistanceM: 23460.0,
    baseOperatingS: 12463467.3
  },
  {
    amrId: "C2S-000410",
    amrMac: "9c:b8:b4:5d:ee:bb",
    amrName: "Anvil",
    baseDistanceM: 18710.4,
    baseOperatingS: 11820321.8
  },
  {
    amrId: "C2L-000411",
    amrMac: "9c:b8:b4:5d:ee:bc",
    amrName: "Forge",
    baseDistanceM: 29342.8,
    baseOperatingS: 13688412.0
  }
];

function numberFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getConfig() {
  return {
    simulationStart: process.env.SIMULATION_START || DEFAULT_CONFIG.simulationStart,
    metersPerNavigatingSecond: numberFromEnv("METERS_PER_NAVIGATING_SECOND", DEFAULT_CONFIG.metersPerNavigatingSecond),
    minNavigateS: numberFromEnv("MIN_NAVIGATE_S", DEFAULT_CONFIG.minNavigateS),
    maxNavigateS: numberFromEnv("MAX_NAVIGATE_S", DEFAULT_CONFIG.maxNavigateS),
    minIdleS: numberFromEnv("MIN_IDLE_S", DEFAULT_CONFIG.minIdleS),
    maxIdleS: numberFromEnv("MAX_IDLE_S", DEFAULT_CONFIG.maxIdleS),
    minChargeEveryS: numberFromEnv("MIN_CHARGE_EVERY_S", DEFAULT_CONFIG.minChargeEveryS),
    maxChargeEveryS: numberFromEnv("MAX_CHARGE_EVERY_S", DEFAULT_CONFIG.maxChargeEveryS),
    minChargeDurationS: numberFromEnv("MIN_CHARGE_DURATION_S", DEFAULT_CONFIG.minChargeDurationS),
    maxChargeDurationS: numberFromEnv("MAX_CHARGE_DURATION_S", DEFAULT_CONFIG.maxChargeDurationS)
  };
}

function getAmr(amrId) {
  const envAmr = process.env.AMR_ID
    ? {
        amrId: process.env.AMR_ID,
        amrMac: process.env.AMR_MAC || "00:00:00:00:00:00",
        amrName: process.env.AMR_NAME || process.env.AMR_ID,
        baseDistanceM: numberFromEnv("BASE_DISTANCE_M", 0),
        baseOperatingS: numberFromEnv("BASE_OPERATING_S", 0)
      }
    : null;
  const amrs = envAmr ? [envAmr, ...AMRS] : AMRS;

  return amrs.find((amr) => amr.amrId === amrId);
}

function listAmrs() {
  return AMRS.map((amr) => ({
    amr_id: amr.amrId,
    amr_mac: amr.amrMac,
    amr_name: amr.amrName
  }));
}

function hashString(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomUnit(seed, index, label) {
  let value = hashString(`${seed}:${index}:${label}`);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;

  return (value >>> 0) / 4294967295;
}

function randomRangeS(seed, index, label, min, max) {
  return min + randomUnit(seed, index, label) * (max - min);
}

function simulateTimeline(amr, now, config) {
  const simulationStart = new Date(config.simulationStart);
  if (now <= simulationStart) {
    return { status: "idle", navigatingSeconds: 0, operatingSeconds: 0 };
  }

  const seed = amr.amrId;
  const targetElapsedS = (now.getTime() - simulationStart.getTime()) / 1000;
  let cursorS = 0;
  let status = "idle";
  let navigatingSeconds = 0;
  let operatingSeconds = 0;
  let blockIndex = 0;
  let nextChargeAtS = randomRangeS(seed, blockIndex, "charge-gap", config.minChargeEveryS, config.maxChargeEveryS);

  while (cursorS < targetElapsedS) {
    if (cursorS >= nextChargeAtS) {
      const chargeDurationS = randomRangeS(
        seed,
        blockIndex,
        "charge-duration",
        config.minChargeDurationS,
        config.maxChargeDurationS
      );
      const blockEndS = Math.min(cursorS + chargeDurationS, targetElapsedS);

      status = "charging";
      cursorS = blockEndS;
      blockIndex += 1;
      nextChargeAtS = cursorS + randomRangeS(seed, blockIndex, "charge-gap", config.minChargeEveryS, config.maxChargeEveryS);
      continue;
    }

    const navigatingDurationS = randomRangeS(seed, blockIndex, "navigate", config.minNavigateS, config.maxNavigateS);
    const navigatingEndS = Math.min(cursorS + navigatingDurationS, nextChargeAtS, targetElapsedS);
    const navigatingDeltaS = navigatingEndS - cursorS;

    if (navigatingDeltaS > 0) {
      status = "navigating";
      navigatingSeconds += navigatingDeltaS;
      operatingSeconds += navigatingDeltaS;
      cursorS = navigatingEndS;
    }

    if (cursorS >= targetElapsedS || cursorS >= nextChargeAtS) continue;

    const idleDurationS = randomRangeS(seed, blockIndex, "idle", config.minIdleS, config.maxIdleS);
    const idleEndS = Math.min(cursorS + idleDurationS, nextChargeAtS, targetElapsedS);
    const idleDeltaS = idleEndS - cursorS;

    if (idleDeltaS > 0) {
      status = "idle";
      operatingSeconds += idleDeltaS;
      cursorS = idleEndS;
    }

    blockIndex += 1;
  }

  return { status, navigatingSeconds, operatingSeconds };
}

function simulateUsage(amrId, now = new Date(), config = getConfig()) {
  const amr = getAmr(amrId);
  if (!amr) return null;

  const timeline = simulateTimeline(amr, now, config);

  return {
    amr_id: amr.amrId,
    amr_mac: amr.amrMac,
    amr_name: amr.amrName,
    distance_traveled: round(amr.baseDistanceM + timeline.navigatingSeconds * config.metersPerNavigatingSecond, 1),
    distance_units: "m",
    generated_at: now.toISOString(),
    schema_version: "billing_usage_v1",
    status: timeline.status,
    time_operating: round(amr.baseOperatingS + timeline.operatingSeconds, 1),
    time_operating_units: "s"
  };
}

function round(value, places) {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

module.exports = {
  AMRS,
  DEFAULT_CONFIG,
  getConfig,
  getAmr,
  listAmrs,
  simulateTimeline,
  simulateUsage
};
