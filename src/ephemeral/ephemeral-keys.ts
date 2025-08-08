import { RedisClientType } from "redis";
import { AddressPool } from "../address-pool";
import { InMemorySigner } from "@taquito/signer";
import { logger } from "../logger";
import { v4 as uuidv4 } from 'uuid';


export interface EphemeralKeyConfig {
  expire: number,
  maxAmount: number,
}

export class EphemeralKeyStore {
  constructor(
    public readonly id: string,
    private client: RedisClientType,
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
    if (!secret || !amount) {
      logger.info('Key not found or expired', { id });
      return;
    }
    if (BigInt(amount) < BigInt(this.config.maxAmount)) {
      logger.info('Discarding key', { key: secret, id, amount })
    } else {
      logger.info('Recycling key', { key: secret, id, amount })
      await this.pool.queue.push(secret);
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
    await this.client.setEx(`${this.id}:${id}:expire`, timeout, "")
    await this.client.setEx(`${this.id}:${id}:secret`, timeout * 2, secretKey)
    await this.client.setEx(`${this.id}:${id}:amount`, timeout * 2, String(allowedAmount));
    return { id, pkh };
  }

  async get(id: string) {
    const [secret, amount] = await this.client.mGet([`${this.id}:${id}:secret`, `${this.id}:${id}:amount`]);
    return { secret, amount };
  }

  async decr(id: string, amount: number) {
    await this.client.decrBy(`${this.id}:${id}:amount`, amount);
  }
}
