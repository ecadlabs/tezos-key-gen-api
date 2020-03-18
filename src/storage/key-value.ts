export class KeyValue {
  private map = new Map();

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): number {
    return this.map.get(key);
  }

  put(key: string, value: number) {
    return this.map.set(key, value);
  }
}

export const keyValue = new KeyValue();
