const { colombiaDate, updateDollarRate } = require('../services/dollarRateService');
const env = require('../config/env');

// Colombia stays at UTC-05:00: 06:00 local = 11:00 UTC; 18:00 local = 23:00 UTC.
const nextRun = (now = new Date()) => {
  const date = colombiaDate(now);
  const morning = new Date(`${date}T06:00:00-05:00`);
  const evening = new Date(`${date}T18:00:00-05:00`);
  if (now < morning) return morning;
  if (now < evening) return evening;
  return new Date(morning.getTime() + 24 * 60 * 60 * 1000);
};

const startDollarRateJob = ({ update = updateDollarRate, now = () => new Date(),
  schedule = setTimeout, cancel = clearTimeout, logger = console,
  enabled = env.dollarRate.enabled, runOnStart = env.dollarRate.runOnStart } = {}) => {
  if (!enabled) return () => {};
  let stopped = false;
  let timer;
  let retryTimer;
  let running = false;
  const run = async (attempt = 1) => {
    if (stopped || running) return;
    running = true;
    try {
      await update();
    } catch (error) {
      logger.error(`[TRM] Update failed (attempt ${attempt}/3): ${error.message}`);
      if (!stopped && attempt < 3) retryTimer = schedule(() => run(attempt + 1), attempt * 30000);
    } finally {
      running = false;
    }
  };
  const arm = () => {
    if (stopped) return;
    const current = now();
    const target = nextRun(current);
    logger.log(`[TRM] Next update: ${target.toISOString()} (06:00/18:00 America/Bogota).`);
    timer = schedule(() => {
      if (stopped) return;
      if (retryTimer) cancel(retryTimer);
      arm();
      void run();
    }, target.getTime() - current.getTime());
  };
  arm();
  // Startup refresh covers a missed execution while the backend was off.
  if (runOnStart) void run();
  return () => { stopped = true; cancel(timer); if (retryTimer) cancel(retryTimer); };
};

module.exports = { nextRun, startDollarRateJob };
