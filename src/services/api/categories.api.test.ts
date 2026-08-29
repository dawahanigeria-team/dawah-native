import { isPublishedCategory, type Category } from './categories.api';

const category = (over: Partial<Category>): Category => ({
  id: '1',
  name: 'Test',
  img: '',
  ...over,
});

describe('category publishing filter', () => {
  test('curated categories are shown', () => {
    expect(
      isPublishedCategory(
        category({ id: '40255', name: 'Quran & Tafsir', status: 1 }),
      ),
    ).toBe(true);
  });

  test('rows with no status field are hidden', () => {
    // Verified against the live endpoint on 2026-08-29: of 37 rows, exactly
    // three omit `status` - "qura", "qur" and a duplicate "Quran & Tafseer" -
    // and all three have zero lectures. A `status !== 0` test would let all
    // three through and put "qura" on the Browse grid.
    expect(isPublishedCategory(category({ id: '67647', name: 'qura' }))).toBe(
      false,
    );
    expect(isPublishedCategory(category({ id: '68031', name: 'qur' }))).toBe(
      false,
    );
    expect(
      isPublishedCategory(
        category({ id: '66290', name: 'Quran & Tafseer' }),
      ),
    ).toBe(false);
  });

  test('explicitly unpublished rows are hidden', () => {
    expect(isPublishedCategory(category({ status: 0 }))).toBe(false);
  });
});
