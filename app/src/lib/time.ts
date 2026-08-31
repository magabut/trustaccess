export function toOrgLocal(utcNow: Date, tzOffsetMin: number): Date {
  return new Date(utcNow.getTime() + tzOffsetMin * 60_000);
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
