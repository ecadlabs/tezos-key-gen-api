import { RedisClient } from "redis";
import { AddressPool } from "../address-pool";
import { InMemorySigner } from "@taquito/signer";
import { logger } from "../logger";
import { getEphemeralKeysIssuedCounter } from "../metrics/ephemeral-keys-issued.counter";
import { getEphemeralKeysDiscardedCounter } from "../metrics/ephemeral-keys-discarded.counter";
import { getEphemeralKeysRecycledCounter } from "../metrics/ephemeral-keys-recycled.counter";
const uuidv4 = require('uuid/v4');

export interface EphemeralKeyConfig {
  expire: number,
  maxAmount: number, // In Tez
}

export class EphemeralKeyStore {
  constructor(
    public readonly id: string,
    private client: RedisClient,
    private config: EphemeralKeyConfig,
    public readonly pool: AddressPool
  ) {
    if (!pool) {
      throw new Error('Address pool is mandatory')
    }
  }

  public getRPC() {
    return this.pool.getRPC();
  }

  async recycle(id: string) {
    const { secret, amount } = await this.get(id);
    if (BigInt(amount) < (BigInt(this.config.maxAmount) * BigInt(1000000))) {
      getEphemeralKeysDiscardedCounter(this.id).inc();
      logger.info('Discarding key', { key: secret, id, amount })
    } else {
      logger.info('Recycling key', { key: secret, id, amount })
      try {
        await this.pool.queue.push(secret);
        getEphemeralKeysRecycledCounter(this.id).inc();
      } catch (ex) {
        getEphemeralKeysDiscardedCounter(this.id).inc();
        throw ex;
      }
    }
  }

  async create(): Promise<{ pkh: string, id: string } | undefined> {
    const id = uuidv4();

    const secretKey = await this.pool.pop();

    if (!secretKey) {
      return undefined;
    }
    const pkh = await new InMemorySigner(secretKey).publicKeyHash()
    const Tezos = await this.pool.taquito();
    const balance = await Tezos.tz.getBalance(pkh)
    const allowedAmount = balance.minus(this.config.maxAmount * 1000000).toNumber();

    const timeout = this.config.expire;
    this.client.set(`${this.id}:${id}:expire`, "", 'EX', timeout)
    this.client.set(`${this.id}:${id}:secret`, secretKey, 'EX', timeout * 2)
    this.client.set(`${this.id}:${id}:amount`, String(allowedAmount), 'EX', timeout * 2);

    getEphemeralKeysIssuedCounter(this.id).inc();

    return { id, pkh };
  }

  get(id: string) {
    return new Promise<{ secret: string, amount: string }>((resolve, reject) => {
      this.client.mget(`${this.id}:${id}:secret`, `${this.id}:${id}:amount`, (err, [secret, amount]) => {
        if (err) {
          reject(err)
        } else {
          resolve({ secret, amount })
        }
      })
    })
  }

  decr(id: string, amount: number) {
    return new Promise((resolve, reject) => {
      this.client.decrby(`${this.id}:${id}:amount`, amount, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      });
    })
  }
}
