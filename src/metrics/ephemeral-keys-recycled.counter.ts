const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Counter({
  name: `ephemeral_keys_recycled_total`,
  labelNames: ['pool_id'],
  help: 'Total ephemeral keys recycled for a particular pool'
})

export const getEphemeralKeysRecycledCounter = (poolName: string) => {
  if (!counterMap.has(poolName)) {
    counterMap.set(poolName, counter.labels(poolName))
  }

  return counterMap.get(poolName);
}
