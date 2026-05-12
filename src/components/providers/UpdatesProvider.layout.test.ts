import { getUpdatesBannerTop } from './UpdatesProvider.layout';

describe('getUpdatesBannerTop', () => {
  test('uses top inset plus offset when available', () => {
    expect(getUpdatesBannerTop(47)).toBe(55);
  });

  test('uses minimum top spacing when inset is small', () => {
    expect(getUpdatesBannerTop(0)).toBe(16);
    expect(getUpdatesBannerTop(4)).toBe(16);
  });

  test('handles non-finite inset values safely', () => {
    expect(getUpdatesBannerTop(Number.NaN)).toBe(16);
  });
});
