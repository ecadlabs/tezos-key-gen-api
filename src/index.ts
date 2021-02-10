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

const app = express()
const metrics = express()

app.use(require('body-parser').text({ type: '*/*' }))
app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  metricsApp: metrics
}))
app.post('/:network(edonet|delphinet|carthagenet)', (req: any, res: any) => popKeys(req, res))
app.get('/:network(edonet|delphinet|carthagenet)', (req: any, res: any) => count(req, res))
app.post('/:network(edonet|delphinet|carthagenet)/ephemeral', (req: any, res: any) => provisionEphemeralKey(req, res))
app.get('/:network(edonet|delphinet|carthagenet)/ephemeral/:id/keys/:key', (req: any, res: any) => pk(req, res))
app.post('/:network(edonet|delphinet|carthagenet)/ephemeral/:id/keys/:key', (req: any, res: any) => sign(req, res))

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
