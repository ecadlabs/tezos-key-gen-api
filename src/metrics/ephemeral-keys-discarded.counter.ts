const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Counter({
  name: `ephemeral_keys_discarded_total`,
  labelNames: ['pool_id'],
  help: 'Total ephemeral keys discarded for a particular pool'
})

export const getEphemeralKeysDiscardedCounter = (poolName: string) => {
  if (!counterMap.has(poolName)) {
    counterMap.set(poolName, counter.labels(poolName))
  }

  return counterMap.get(poolName);
}
