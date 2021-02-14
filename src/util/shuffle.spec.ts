import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('should shuffle with nulls', () => {
    const arr = ['a', 'b', 'c', null];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });
});
