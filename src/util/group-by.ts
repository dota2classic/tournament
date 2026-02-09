type Groupable = unknown

export function groupBy<T extends Groupable, KeyOf extends keyof T>(
  arr: T[],
  groupKey: KeyOf,
): Map<T[KeyOf], T> {
  const grouped = new Map<T[KeyOf], T>

  for (const el of arr) {
    grouped.set(el[groupKey], el);
  }

  return grouped;
}
