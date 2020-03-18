import { AddressPool } from "./address-pool";
import { RedisClient } from "redis";
import { readFileSync } from 'fs';
import { config } from "./config";
import { getKeyPoolSizeGauge } from "./metrics/key_pool_size.gauge";
import { getFundingAccountGauge } from "./metrics/funding_account_balance.gauge";
import { EphemeralKeyStore } from "./ephemeral/ephemeral-keys";
import { logger } from "./logger";

const METRIC_COLLECTION_INTERVAL = 10000;

export class Pools {
  private pools = new Map<string, AddressPool>();
  private ephemeralPools = new Map<string, EphemeralKeyStore>();
  private accounts: {
    [key: string]: {
      [key: string]: {
        regular: string,
        ephemeral: string
      }
    }
  } = {};

  init(redis: RedisClient) {
    const content = JSON.parse(readFileSync("pools-config.json").toString('utf8'))
    Object.keys(content).forEach((poolKey) => {
      const pool = new AddressPool(poolKey, {
        ...config,
        // TODO validate schema
        ...content[poolKey]
      },
        redis
      )
      pool.init();
      this.pools.set(poolKey, pool)

      setInterval(async () => {
        getKeyPoolSizeGauge(poolKey).set(await this.pools.get(poolKey)!.size())
        getFundingAccountGauge(poolKey, content[poolKey].funderPKH).set(Number(await this.pools.get(poolKey)!.getFundingBalance()))
      }, METRIC_COLLECTION_INTERVAL)
    })
    this.accounts = JSON.parse(readFileSync("accounts-config.json").toString('utf8'))
  }

  public initEphemeral(client: RedisClient, pubSub: RedisClient) {
    pubSub.on("message", async (_channel, message) => {
      const match = /^(.+):(.+):expire$/.exec(message);
      if (Array.isArray(match) && match.length === 3) {
        client.get(`${match[1]}:${match[2]}:secret`, (err, key) => {
          if (err) {
            logger.error(err)
            return
          }

          if (key) {
            setTimeout(async () => {
              logger.info(`Recycling key ${key}`)
              try {
                await pools.getPoolByID(match[1]).queue.push(key);
              } catch (ex) {
                logger.error(`Unable to recycle key: ${ex.message}`, { key })
              }
            })
          }
        })
      }
    });
    pubSub.subscribe("__keyevent@0__:expired");
    const content = JSON.parse(readFileSync("ephemeral-config.json").toString('utf8'))

    Object.keys(content).forEach((ephemeralPoolKey) => {
      this.ephemeralPools.set(ephemeralPoolKey, new EphemeralKeyStore(ephemeralPoolKey, client, {
        ...content[ephemeralPoolKey]
      }, this.pools.get(content[ephemeralPoolKey]['pool-id'])!))
    })
  }

  hasUser(account: string): boolean {
    return account in this.accounts
  }

  getPool(account: string, network: string): AddressPool | undefined {
    const exists = account in this.accounts && network in this.accounts[account];

    if (exists) {
      return this.pools.get(this.accounts[account][network].regular)
    }
  }

  getPoolByID(poolID: string): AddressPool | undefined {
    return this.pools.get(poolID)
  }

  getEphemeralPool(account: string, network: string): EphemeralKeyStore | undefined {
    const exists = account in this.accounts && network in this.accounts[account];

    if (exists) {
      return this.ephemeralPools.get(this.accounts[account][network].ephemeral)
    }
  }
}

export const pools = new Pools();
