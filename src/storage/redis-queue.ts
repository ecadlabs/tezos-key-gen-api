import { RedisClientType } from 'redis';

export class RedisQueue {

  constructor(private client: RedisClientType, private listName: string) { }

  async pop() {
    const size = await this.size();
    if (!size) {
      return undefined;
    }
    return await this.client.lPop(this.listName);
  }

  async push(key: string) {
    await this.client.rPush(this.listName, key);
  }

  async size() {
    return await this.client.lLen(this.listName);
  }
}
