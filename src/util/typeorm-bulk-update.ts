export function typeormBulkUpdate<T>(data: T[]): string {
  return data
    .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
    .join(', ');
}
