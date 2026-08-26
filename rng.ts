export const hashString = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export class Seeded {
  #state: number;

  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  next = (): number => {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  nextInt = (min: number, max: number): number => min + Math.floor(this.next() * (max - min + 1));

  nextFloat = (min: number, max: number): number => min + this.next() * (max - min);

  pick = <T>(items: readonly T[]): T => items[this.nextInt(0, items.length - 1)]!;
}
