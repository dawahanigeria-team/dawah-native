import { buildLecturerAbout, lecturerAboutFacts } from './lecturerAbout';

test('splits the place off a real record and keeps the catalogue facts', () => {
  // rplisting_multi_nid_api.php?id=10 and its newest leclisting_rp.php row, 2026-11-13.
  const about = buildLecturerAbout(
    {
      name: 'Prof. Abdur-Razzaaq Abdul Majeed Alaro (Ilorin)',
      language: 'Yoruba',
      total_audio: 1738,
      total_albums: 103,
      views: 37550,
    },
    { lang: 'Yoruba', updated_date: 'Sat, 2026/10/24 - 19:22' },
  );

  expect(about).toEqual({
    fullName: 'Prof. Abdur-Razzaaq Abdul Majeed Alaro (Ilorin)',
    displayName: 'Prof. Abdur-Razzaaq Abdul Majeed Alaro',
    place: 'Ilorin',
    isLate: false,
    language: 'Yoruba',
    lectures: 1738,
    albums: 103,
    plays: 37550,
    latestUpload: new Date(2026, 9, 24, 19, 22),
  });
});

test('marks a late scholar and drops the honorific bracket and stray dash', () => {
  const about = buildLecturerAbout({
    name: 'Shaykh Rasheed Buwayb (Iwo)- [RahimahuLlah]',
  });

  expect(about.displayName).toBe('Shaykh Rasheed Buwayb');
  expect(about.place).toBe('Iwo');
  expect(about.isLate).toBe(true);
});

test('reads the curly-brace and lowercase spellings of the honorific', () => {
  expect(
    buildLecturerAbout({
      name: 'Shaykh Luqman Saalih Abu Sufyaan Al-AlMaheey {RahimahuLlah}',
    }),
  ).toMatchObject({
    displayName: 'Shaykh Luqman Saalih Abu Sufyaan Al-AlMaheey',
    place: null,
    isLate: true,
  });
  expect(buildLecturerAbout({ name: 'Shaykh Abc (Kano) [Rahimahullah]' }).isLate).toBe(
    true,
  );
});

test('leaves a plain name whole and does not read "Rahimah" as the honorific', () => {
  expect(buildLecturerAbout({ name: 'Ustaadh-Habeebullaah-Al-Edewiy' })).toMatchObject({
    displayName: 'Ustaadh-Habeebullaah-Al-Edewiy',
    place: null,
    isLate: false,
  });
  expect(buildLecturerAbout({ name: 'Ustadh Abu Rahimah Ekoyeni (Ibadan)' })).toMatchObject(
    { displayName: 'Ustadh Abu Rahimah Ekoyeni', place: 'Ibadan', isLate: false },
  );
});

test('reports missing data as null instead of inventing it', () => {
  expect(buildLecturerAbout({ name: 'Barrister Garba Hassan(Bauchi)' })).toEqual({
    fullName: 'Barrister Garba Hassan(Bauchi)',
    displayName: 'Barrister Garba Hassan',
    place: 'Bauchi',
    isLate: false,
    language: null,
    lectures: null,
    albums: null,
    plays: null,
    latestUpload: null,
  });
});

test('falls back to the latest lecture language and ignores an unreadable date', () => {
  const about = buildLecturerAbout(
    { name: 'Dr Ahmad Bello Dogarawa', language: '' },
    { lang: 'Hausa', updated_date: 'not a date' },
  );

  expect(about.language).toBe('Hausa');
  expect(about.latestUpload).toBeNull();
});

test('treats the API "Unknown" language placeholder as no language', () => {
  expect(buildLecturerAbout({ name: 'Shaykh Rajab', language: 'Unknown' }).language).toBeNull();
  expect(
    buildLecturerAbout({ name: 'Shaykh Rajab', language: 'Unknown' }, { lang: 'Hausa' }).language,
  ).toBe('Hausa');
});

test('lists the catalogue facts as the sheet shows them', () => {
  const about = buildLecturerAbout(
    {
      name: 'Prof. Abdur-Razzaaq Abdul Majeed Alaro (Ilorin)',
      total_audio: 1738,
      total_albums: 103,
      views: 37550,
    },
    { updated_date: 'Sat, 2026/10/24 - 19:22' },
  );

  expect(lecturerAboutFacts(about)).toEqual([
    { key: 'lectures', label: '1,738 lectures' },
    { key: 'albums', label: '103 albums' },
    { key: 'plays', label: '37,550 plays' },
    { key: 'latestUpload', label: 'Latest upload Oct 24, 2026' },
  ]);
});

test('drops facts with no data and keeps a genuine zero', () => {
  const about = buildLecturerAbout({ name: 'Shaykh Rajab', total_audio: 1, total_albums: 0 });

  expect(lecturerAboutFacts(about)).toEqual([
    { key: 'lectures', label: '1 lecture' },
    { key: 'albums', label: '0 albums' },
  ]);
});
