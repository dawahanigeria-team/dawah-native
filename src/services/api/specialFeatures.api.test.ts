import { applyListeningPreferences, parseSpecialFeatures } from './specialFeatures.api';

jest.mock('./base.api', () => ({ apiClient: { get: jest.fn() } }));

const lecture = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  status: '1',
  mp3_title: `Lecture ${id}`,
  mp3_url: `https://media.dawahnigeria.com/${id}.mp3`,
  mp3_duration: '1:02:03',
  lec_thumbnail: `https://media.dawahnigeria.com/thumb/${id}.jpeg`,
  lec_img: `https://media.dawahnigeria.com/large/${id}.jpeg`,
  rp_id: 14,
  lang_id: 7,
  ...overrides,
});

test('maps the raw tbl_mp3 rows the endpoint returns', () => {
  const [group] = parseSpecialFeatures([
    { name: ' MARRIAGE MANAGEMENT ', desc: 'after', more: [lecture(20963, { rpname: 'Dr Sharaafudeen Raji', lang: 'Yoruba' })] },
  ]);
  expect(group.name).toBe('MARRIAGE MANAGEMENT');
  expect(group.lectures[0]).toEqual({
    languageId: 7,
    lecturerId: 14,
    episode: expect.objectContaining({
      id: '20963',
      title: 'Lecture 20963',
      durationSec: 3723,
      coverUrl: 'https://media.dawahnigeria.com/thumb/20963.jpeg',
      coverUrlLarge: 'https://media.dawahnigeria.com/large/20963.jpeg',
      audioUrl: 'https://media.dawahnigeria.com/20963.mp3',
      rpname: 'Dr Sharaafudeen Raji',
      lecturerName: 'Dr Sharaafudeen Raji',
      language: 'Yoruba',
    }),
  });
});

test('works before the backend adds scholar names', () => {
  const [group] = parseSpecialFeatures([{ name: 'Row', more: [lecture(1)] }]);
  expect(group.lectures[0].episode.rpname).toBeUndefined();
});

test('drops unplayable or unpublished lectures and empty rows', () => {
  const groups = parseSpecialFeatures([
    { name: 'Hajj and It\'s Preparation', desc: 'hajj rulings', more: [] },
    { name: 'No tag', more: null },
    { name: 'Mixed', more: [lecture(1), lecture(2, { mp3_url: '' }), lecture(3, { status: '0' }), null] },
    { name: '', more: [lecture(4)] },
  ]);
  expect(groups.map((g) => g.name)).toEqual(['Mixed']);
  expect(groups[0].lectures.map((l) => l.episode.id)).toEqual(['1']);
});

test('ignores a body that is not a list', () => {
  expect(parseSpecialFeatures({ success: false, message: 'oops' })).toEqual([]);
  expect(parseSpecialFeatures(null)).toEqual([]);
});

describe('applyListeningPreferences', () => {
  const groups = parseSpecialFeatures([
    { name: 'Yoruba only', more: [lecture(1, { lang_id: 7, rp_id: 14 })] },
    { name: 'Mixed', more: [lecture(2, { lang_id: 8, rp_id: 235 }), lecture(3, { lang_id: 7, rp_id: 99 })] },
  ]);

  test('shows everything when preferences are not set', () => {
    expect(applyListeningPreferences(groups, { configured: false, languageIds: [], lecturerIds: [] })).toBe(groups);
  });

  test('keeps a lecture whose language OR scholar was chosen, and drops emptied rows', () => {
    const result = applyListeningPreferences(groups, { configured: true, languageIds: [8], lecturerIds: [99] });
    expect(result.map((g) => g.name)).toEqual(['Mixed']);
    expect(result[0].lectures.map((l) => l.episode.id)).toEqual(['2', '3']);
  });
});
