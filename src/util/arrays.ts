export function padArrayToClosestPower<T>(arr: T[]): (T | null)[] {
  let ceilPower = 1;

  while (Math.pow(2, ceilPower) < arr.length) {
    ceilPower++;
  }

  // it's a power of 2 already
  if (Math.pow(2, ceilPower) === arr.length) return arr;

  const newArr = [...arr];
  for (let i = 0; i < Math.pow(2, ceilPower) - arr.length; i++) {
    newArr.push(null);
  }

  return newArr;
}
