import { RedisClient } from "redis";
import { config } from "./config";
import { count, popKeys } from "./handlers/keys";
import { logger } from "./logger";
import { pools } from "./pools";
import { provisionEphemeralKey, pk, sign } from "./handlers/sign";
const promMid = require('express-prometheus-middleware');

const express = require('express')
const redis = require("redis");

const promClient = require('prom-client');
const collectDefaultMetrics = promClient.collectDefaultMetrics;
// const register = promClient.register;
// collectDefaultMetrics();

const ErrorStatus = [401, 403, 404, 500, 503];

const middlewareLogger = (func: any) => async (req: any, res: any) => {
    const start = process.hrtime();

    await func(req, res);
    const durationInMilliseconds = getActualRequestDurationInMilliseconds(start);
    const status = res.statusCode;

    const childLogger = logger.child({
      method: req.method,
      url: req.url,
      status,
      duration: durationInMilliseconds.toLocaleString()
    })

    ErrorStatus.includes(status)? childLogger.error(res.statusMessage): childLogger.info(res.statusMessage);
};

// helper function that will calculate the time taken to complete a request
const getActualRequestDurationInMilliseconds = (start: [number, number]) => {
  const NS_PER_SEC = 1e9; // convert to nanoseconds
  const NS_TO_MS = 1e6; // convert to milliseconds
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

const app = express()
const metrics = express()

app.use(require('body-parser').text({ type: '*/*' }))
app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  metricsApp: metrics
}))
app.post('/:network(edonet|granadanet|florencenet)', middlewareLogger((req: any, res: any) => popKeys(req, res)))
app.get('/:network(edonet|granadanet|florencenet)', middlewareLogger((req: any, res: any) => count(req, res)))
app.post('/:network(edonet|granadanet|florencenet)/ephemeral', middlewareLogger((req: any, res: any) => provisionEphemeralKey(req, res)))
app.get('/:network(edonet|granadanet|florencenet)/ephemeral/:id/keys/:key', middlewareLogger((req: any, res: any) => pk(req, res)))
app.post('/:network(edonet|granadanet|florencenet)/ephemeral/:id/keys/:key', middlewareLogger((req: any, res: any) => sign(req, res))) 

export const client: RedisClient = redis.createClient({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword
});

export const pubSub: RedisClient = redis.createClient({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword
});

const ready = async () => {
  return new Promise<void>((resolve, reject) => {
    client.on('ready', (err: any) => {
      if (err) {
        reject(err)
      } else {
        client.config("SET", "notify-keyspace-events", "Ex");
        resolve();
      }
    })
  })
}

ready().then(() => {
  pools.init(client)
  pools.initEphemeral(client, pubSub);

  app.listen(3000, function () {
    logger.info('API listening on port 3000!')
  })

  metrics.listen(3001, function () {
    logger.info('Metrics listening on port 3001!')
  });
}).catch(logger.error)
