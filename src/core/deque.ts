/**
 * Bounded deque, mirroring `collections.deque(maxlen=...)`.
 *
 * The bound MATTERS upstream: `do_hold` does `bag.appendleft(...)` while the
 * bag can already hold a full 14-piece cycle, and a full deque discards from
 * the OPPOSITE end (the right). Silently dropping that piece changes the
 * piece sequence, so the truncation is preserved here.
 */
export class BoundedDeque<T> {
  private items: T[] = [];
  private readonly maxlen: number;

  constructor(maxlen: number) {
    this.maxlen = maxlen;
  }

  get length(): number {
    return this.items.length;
  }

  append(value: T): void {
    this.items.push(value);
    this.truncate();
  }

  appendleft(value: T): void {
    this.items.unshift(value);
    this.truncate();
  }

  extend(values: readonly T[]): void {
    for (const v of values) this.append(v);
  }

  popleft(): T {
    const value = this.items.shift();
    if (value === undefined) throw new Error("popleft from an empty deque");
    return value;
  }

  at(index: number): T {
    return this.items[index];
  }

  toArray(): readonly T[] {
    return this.items;
  }

  private truncate(): void {
    while (this.items.length > this.maxlen) {
      this.items.pop();
    }
  }
}
