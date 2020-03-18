const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Counter({
  name: `keys_issued_total`,
  labelNames: ['pool_id'],
  help: 'metric_help'
})

export const getKeyIssuedCounter = (poolName: string) => {
  if (!counterMap.has(poolName)) {
    counterMap.set(poolName, counter.labels(poolName))
  }

  return counterMap.get(poolName);
}
