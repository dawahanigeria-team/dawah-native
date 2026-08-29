import {
  LECTURES_INTERRUPTED_MESSAGE,
  resolveLecturesListState,
} from './lecturesListState';

const base = {
  count: 0,
  isLoading: false,
  error: null as string | null,
  hasSettled: false,
  isSearching: false,
};

describe('lecturer lectures list state', () => {
  test('an interrupted request offers a retry instead of blaming the scholar', () => {
    // A cancelled request leaves no rows, no error and nothing settled. This is
    // the case that used to render "No lectures found for this scholar".
    expect(resolveLecturesListState({ ...base, hasSettled: false })).toEqual({
      kind: 'error',
      message: LECTURES_INTERRUPTED_MESSAGE,
      canRetry: true,
    });
  });

  test('a scholar with no lectures still reads as empty once a request settled', () => {
    expect(resolveLecturesListState({ ...base, hasSettled: true })).toEqual({
      kind: 'empty',
    });
  });

  test('a search that matches nothing is empty even before anything settled', () => {
    expect(
      resolveLecturesListState({ ...base, isSearching: true }),
    ).toEqual({ kind: 'empty' });
  });

  test('loading wins over an unsettled request so the retry never flashes mid-fetch', () => {
    expect(
      resolveLecturesListState({ ...base, isLoading: true }),
    ).toEqual({ kind: 'loading' });
  });

  test('a real error is shown in preference to the interruption wording', () => {
    expect(
      resolveLecturesListState({ ...base, error: 'Request timed out' }),
    ).toEqual({ kind: 'error', message: 'Request timed out', canRetry: true });
  });

  test('rows on screen render the list even if a later page failed', () => {
    expect(
      resolveLecturesListState({ ...base, count: 12, hasSettled: true }),
    ).toEqual({ kind: 'list' });
  });
});
