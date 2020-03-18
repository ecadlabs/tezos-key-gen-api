export class Queue {
  private addresses: string[] = [];

  pop(): string | undefined {
    return this.addresses.pop();
  }

  push(key: string) {
    this.addresses.push(key);
  }

  size(): number {
    return this.addresses.length;
  }
}


export const queue = new Queue();
