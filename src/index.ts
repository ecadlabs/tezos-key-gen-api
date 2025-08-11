import { createClient, RedisClientType } from "redis";
import { config } from "./config";
import { count, popKeys } from "./handlers/keys";
import { logger } from "./logger";
import { pools } from "./pools";
import { provisionEphemeralKey, pk, sign } from "./handlers/sign";
const promMid = require('express-prometheus-middleware');

const express = require('express')

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
app.post('/:network', middlewareLogger((req: any, res: any) => popKeys(req, res)))
app.get('/:network', middlewareLogger((req: any, res: any) => count(req, res)))
app.post('/:network/ephemeral', middlewareLogger((req: any, res: any) => provisionEphemeralKey(req, res)))
app.get('/:network/ephemeral/:id/keys/:key', middlewareLogger((req: any, res: any) => pk(req, res)))
app.post('/:network/ephemeral/:id/keys/:key', middlewareLogger((req: any, res: any) => sign(req, res))) 

export const client: RedisClientType = createClient({
  socket: {
    host: config.redisHost,
    port: config.redisPort,
    connectTimeout: 30000,
    reconnectStrategy: (retries) => {
      logger.info('Redis client reconnecting', { retries });
      if (retries > 10) {
        logger.error('Redis client max retries exceeded');
        return new Error('Max retries exceeded');
      }
      return Math.min(retries * 1000, 3000);
    }
  },
  password: config.redisPassword
});

export const pubSub: RedisClientType = createClient({
  socket: {
    host: config.redisHost,
    port: config.redisPort,
    connectTimeout: 30000,
    reconnectStrategy: (retries) => {
      logger.info('Redis pubSub reconnecting', { retries });
      if (retries > 10) {
        logger.error('Redis pubSub max retries exceeded');
        return new Error('Max retries exceeded');
      }
      return Math.min(retries * 1000, 3000);
    }
  },
  password: config.redisPassword
});

const ready = async () => {
  logger.info('Connecting to Redis...');
  
  // Add connection event handlers
  client.on('connect', () => logger.info('Redis client connected'));
  client.on('ready', () => logger.info('Redis client ready'));
  client.on('error', (err) => logger.error('Redis client error', { error: err.message }));
  client.on('end', () => logger.warn('Redis client connection ended'));
  client.on('reconnecting', () => logger.info('Redis client reconnecting'));
  
  pubSub.on('connect', () => logger.info('Redis pubSub connected'));
  pubSub.on('ready', () => logger.info('Redis pubSub ready'));
  pubSub.on('error', (err) => logger.error('Redis pubSub error', { error: err.message }));
  pubSub.on('end', () => logger.warn('Redis pubSub connection ended'));
  pubSub.on('reconnecting', () => logger.info('Redis pubSub reconnecting'));
  
  try {
    await client.connect();
    await pubSub.connect();
    await client.configSet("notify-keyspace-events", "Ex");
    logger.info('Redis setup completed successfully');
  } catch (error) {
    logger.error('Failed to setup Redis', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

ready().then(async () => {
  process.on('uncaughtException', function(err){
    logger.error(`Uncaught exception: ${err.message}`)   
  })
  pools.init(client)
  await pools.initEphemeral(client, pubSub);

  app.listen(3000, function () {
    logger.info('API listening on port 3000!')
  })

  metrics.listen(3001, function () {
    logger.info('Metrics listening on port 3001!')
  });
}).catch(logger.error)
