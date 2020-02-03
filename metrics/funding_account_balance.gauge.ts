const promClient = require('prom-client');

const counterMap = new Map();

const counter = new promClient.Gauge({
  name: `funding_account_balance_total`,
  labelNames: ['pool_id', 'pkh'],
  help: 'metric_help'
})

export const getFundingAccountGauge = (poolName: string, pkh: string) => {
  if (!counterMap.has(`${poolName}_${pkh}`)) {
    counterMap.set(`${poolName}_${pkh}`, counter.labels(poolName, pkh))
  }

  return counterMap.get(`${poolName}_${pkh}`);
}
