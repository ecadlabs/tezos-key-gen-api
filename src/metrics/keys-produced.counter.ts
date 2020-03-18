const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Counter({
  name: `keys_produced_total`,
  labelNames: ['pool_id'],
  help: 'metric_help'
})

export const getKeyProducedCounter = (poolName: string) => {
  if (!counterMap.has(poolName)) {
    counterMap.set(poolName, counter.labels(poolName))
  }

  return counterMap.get(poolName);
}
