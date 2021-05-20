import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';
import { b58cencode, prefix, Prefix } from '@taquito/utils';
import { logger } from './logger';
import { keyValue } from './storage/key-value';
import { RedisQueue } from "./storage/redis-queue";
import { RedisClient } from 'redis';
import { RemoteSigner } from '@taquito/remote-signer';
import { getKeyProducedCounter } from './metrics/keys-produced.counter';
import { getKeyIssuedCounter } from './metrics/keys-issued.counter';

const crypto = require('crypto');

export interface PoolConfig {
  redisListName: string;
  rpcUrl: string;
  targetBuffer: number;
  tzAmount: number;
  batchSize: number;
  lastJobKey: string;
  funderPKH: string;
  remoteSignerUrl: string;
  autoRefillDurationMS: number;
}

export class AddressPool {

  queue: RedisQueue;
  private logger;

  constructor(
    public readonly id: string,
    private config: PoolConfig,
    client: RedisClient
  ) {
    this.logger = logger.child({ pool: id })
    this.queue = new RedisQueue(client, config.redisListName);
  }

  public getRPC() {
    return this.config.rpcUrl;
  }

  public init() {
    if (this.config.autoRefillDurationMS) {
      setInterval(async () => {
        await this.generateKeys()
      }, this.config.autoRefillDurationMS)
    }
  }

  public async taquito() {
    const tezos = new TezosToolkit(this.config.rpcUrl)
    tezos.setProvider({ signer: new RemoteSigner(this.config.funderPKH, this.config.remoteSignerUrl) })
    return tezos;
  }

  async getFundingBalance() {
    const Tezos = await this.taquito();
    return (await Tezos.tz.getBalance(await Tezos.signer.publicKeyHash())).toString()
  }

  async pop() {
    const result = await this.queue.pop();

    setTimeout(async () => {
      await this.generateKeys()
    })

    if (result) {
      getKeyIssuedCounter(this.id).inc();
    }

    return result;
  }

  async size() {
    return this.queue.size();
  }

  private async generateKeys() {
    try {
      const Tezos = await this.taquito()
      const { level } = await Tezos.rpc.getBlockHeader()

      if (await this.queue.size() < this.config.targetBuffer && (!keyValue.has(this.config.lastJobKey) || keyValue.get(this.config.lastJobKey) < level)) {
        this.logger.info('Generating new keys...', { level })
        keyValue.put(this.config.lastJobKey, level);
        const dests: { key: string, pkh: string }[] = [];

        for (let i = 0; i < this.config.batchSize; i++) {
          const keyBytes = Buffer.alloc(32);
          crypto.randomFillSync(keyBytes)

          const key = b58cencode(new Uint8Array(keyBytes), prefix[Prefix.SPSK]);
          const pkh = await new InMemorySigner(key).publicKeyHash();
          dests.push({ key, pkh });
        }

        const batch = Tezos.batch()
        dests.forEach(({ pkh }) => {
          batch.withTransfer({ to: pkh, amount: this.config.tzAmount, gasLimit:2000 });
        })

        const op = await batch.send();
        await op.confirmation();

        for (const { key } of dests) {
          await this.queue.push(key);
        }

        getKeyProducedCounter(this.id).inc(this.config.batchSize)
        this.logger.info('New batch generated', { keys: dests, opHash: op.hash })
      }
    } catch (ex) {
      this.logger.error(ex.message);
    }
  }
}
