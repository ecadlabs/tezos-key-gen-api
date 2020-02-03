import { RedisClient } from 'redis';

export class RedisQueue {

  constructor(private client: RedisClient, private listName: string) { }

  async pop() {
    return new Promise<string | undefined>(async (resolve, reject) => {
      if (!await this.size()) {
        resolve(undefined);
        return;
      }
      this.client.lpop(this.listName, (err: any, data: any) => {
        if (err) {
          reject(err);
          return
        }

        resolve(data);
      })
    })
  }

  async push(key: string) {
    this.client.rpush(this.listName, key);
  }

  async size() {
    return new Promise<number>((resolve, reject) => {
      return this.client.llen(this.listName, (err: any, data: any) => {
        if (err) {
          reject(err);
          return
        }
        resolve(data);
      })
    })
  }
}
