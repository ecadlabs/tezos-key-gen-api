const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Counter({
  name: `ephemeral_keys_signature_total`,
  labelNames: ['pool_id'],
  help: 'Total ephemeral keys signature produced for a particular pool'
})

export const getEphemeralKeysSignatureCounter = (poolName: string) => {
  if (!counterMap.has(poolName)) {
    counterMap.set(poolName, counter.labels(poolName))
  }

  return counterMap.get(poolName);
}
