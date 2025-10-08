export function typeormBulkUpdate<T>(data: Array<T>[]): [T[], string] {
  let globalIdx = 0;
  const placeholder = data
    .map((batch, i) => {
      return `(${batch.map(() => `$${++globalIdx}`).join(', ')})`;
    })
    .join(', ');

  return [data.flatMap(t => t), placeholder];
}
