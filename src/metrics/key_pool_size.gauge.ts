const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Gauge({
  name: `keys_pool_size_total`,
  labelNames: ['pool_id'],
  help: 'metric_help'
})

export const getKeyPoolSizeGauge = (poolName: string) => {
  if (!counterMap.has(poolName)) {
    counterMap.set(poolName, counter.labels(poolName))
  }

  return counterMap.get(poolName);
}
