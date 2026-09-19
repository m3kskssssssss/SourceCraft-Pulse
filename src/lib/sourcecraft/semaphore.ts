// Простейший асинхронный семафор: ограничивает число одновременных операций.
// Нужен, чтобы не бомбить API SourceCraft параллельными запросами.

export class Semaphore {
  private inFlight = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (limit < 1) throw new Error('Semaphore limit должен быть ≥ 1');
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.inFlight < this.limit) {
      this.inFlight += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolvePromise) => {
      this.queue.push(() => {
        this.inFlight += 1;
        resolvePromise();
      });
    });
  }

  private release(): void {
    this.inFlight -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}
