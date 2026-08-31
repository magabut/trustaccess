export const EVENTS: Record<string, { name: string; capacity: number; main: boolean }> = {
  'panel-discussion': { name: 'Panel Discussion', capacity: 15, main: true },
  workshop: { name: 'Workshop', capacity: 15, main: true },
  'vibe-coding': { name: 'Vibe Coding', capacity: 15, main: true },
  concert: { name: 'Concert', capacity: 100, main: false },
};

export const ALL_SLUGS = Object.keys(EVENTS);
export const MAIN_SLUGS = ALL_SLUGS.filter((s) => EVENTS[s].main);

export function isKnownEvent(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(EVENTS, slug);
}

export function isMainEvent(slug: string): boolean {
  return !!EVENTS[slug]?.main;
}
