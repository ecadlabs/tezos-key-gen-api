import { AddressPool } from "./address-pool";
import { RedisClientType } from "redis";
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

  init(redis: RedisClientType) {
    logger.info('Starting pools initialization...');
    
    try {
      const content = JSON.parse(readFileSync("pools-config.json").toString('utf8'))
      logger.info('Loaded pools config', { poolKeys: Object.keys(content) });
      
      Object.keys(content).forEach((poolKey) => {
        try {
          logger.info('Initializing pool', { poolKey, config: content[poolKey] });
          
          const pool = new AddressPool(poolKey, {
            ...config,
            // TODO validate schema
            ...content[poolKey]
          },
            redis
          )
          pool.init();
          this.pools.set(poolKey, pool)
          logger.info('Successfully initialized pool', { poolKey });

          setInterval(async () => {
            try {
              getKeyPoolSizeGauge(poolKey).set(await this.pools.get(poolKey)!.size())
              getFundingAccountGauge(poolKey, content[poolKey].funderPKH).set(Number(await this.pools.get(poolKey)!.getFundingBalance()))
            } catch (ex) {
              const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
              logger.error('Error in metric collection', { poolKey, error: errorMessage });
            }
          }, METRIC_COLLECTION_INTERVAL)
        } catch (ex) {
          const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
          logger.error('Failed to initialize pool', { poolKey, error: errorMessage });
        }
      })
      
      logger.info('Pools initialization completed', { totalPools: this.pools.size });
    } catch (ex) {
      const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
      logger.error('Failed to load pools config', { error: errorMessage });
    }
    
    try {
      this.accounts = JSON.parse(readFileSync("accounts-config.json").toString('utf8'))
      logger.info('Loaded accounts config', { accounts: Object.keys(this.accounts) });
    } catch (ex) {
      const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
      logger.error('Failed to load accounts config', { error: errorMessage });
    }
  }

  public async initEphemeral(client: RedisClientType, pubSub: RedisClientType) {
    logger.info('Starting ephemeral pools initialization...');
    
    await pubSub.subscribe("__keyevent@0__:expired", (message) => {
      const match = /^(.+):(.+):expire$/.exec(message);
      if (Array.isArray(match) && match.length === 3) {
        setTimeout(async () => {
          try {
            const pool = this.ephemeralPools.get(match[1]);
            if (pool) {
              await pool.recycle(match[2])
            }
          } catch (ex) {
            const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
            logger.error(`Unable to recycle key, it will be discarded: ${errorMessage}`, { ephemeralPool: match[1], key: match[2] })
          }
        })
      }
    });
    
    try {
      const content = JSON.parse(readFileSync("ephemeral-config.json").toString('utf8'))
      logger.info('Loaded ephemeral config', { ephemeralPoolKeys: Object.keys(content) });

      Object.keys(content).forEach((ephemeralPoolKey) => {
        try {
          const poolId = content[ephemeralPoolKey]['pool-id'];
          const basePool = this.pools.get(poolId);
          
          logger.info('Initializing ephemeral pool', { ephemeralPoolKey, poolId, basePoolFound: !!basePool });
          
          if (!basePool) {
            logger.error('Base pool not found for ephemeral pool', { ephemeralPoolKey, poolId, availablePools: Array.from(this.pools.keys()) });
            return;
          }
          
          this.ephemeralPools.set(ephemeralPoolKey, new EphemeralKeyStore(ephemeralPoolKey, client, {
            ...content[ephemeralPoolKey]
          }, basePool))
          
          logger.info('Successfully initialized ephemeral pool', { ephemeralPoolKey });
        } catch (ex) {
          const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
          logger.error('Failed to initialize ephemeral pool', { ephemeralPoolKey, error: errorMessage });
        }
      })
      
      logger.info('Ephemeral pools initialization completed', { totalEphemeralPools: this.ephemeralPools.size });
    } catch (ex) {
      const errorMessage = ex instanceof Error ? ex.message : 'Unknown error';
      logger.error('Failed to load ephemeral config', { error: errorMessage });
    }
  }

  hasUser(account: string): boolean {
    return account in this.accounts
  }

  getPool(account: string, network: string): AddressPool | undefined {
    logger.debug('getPool called', { account, network, accounts: Object.keys(this.accounts) });
    
    const exists = account in this.accounts && network in this.accounts[account];
    logger.debug('Account/network check', { account, network, exists, accountExists: account in this.accounts, networkExists: exists ? network in this.accounts[account] : false });

    if (exists) {
      const poolId = this.accounts[account][network].regular;
      const pool = this.pools.get(poolId);
      logger.debug('Pool lookup result', { account, network, poolId, poolFound: !!pool, availablePools: Array.from(this.pools.keys()) });
      return pool;
    } else {
      logger.warn('Pool not found', { account, network, availableAccounts: Object.keys(this.accounts), availableNetworks: account in this.accounts ? Object.keys(this.accounts[account]) : [] });
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
