import { getUpdateIdFromManifest, isDismissedUpdate } from './UpdatesProvider.dismissal';

describe('UpdatesProvider dismissal helpers', () => {
  test('extracts update id from manifest when present', () => {
    expect(getUpdateIdFromManifest({ id: 'update-123' })).toBe('update-123');
  });

  test('returns null when manifest has no valid id', () => {
    expect(getUpdateIdFromManifest(undefined)).toBeNull();
    expect(getUpdateIdFromManifest({})).toBeNull();
    expect(getUpdateIdFromManifest({ id: 42 })).toBeNull();
    expect(getUpdateIdFromManifest({ id: '' })).toBeNull();
  });

  test('treats only matching update id as dismissed', () => {
    expect(isDismissedUpdate('update-123', 'update-123')).toBe(true);
    expect(isDismissedUpdate('update-123', 'update-456')).toBe(false);
    expect(isDismissedUpdate('update-123', null)).toBe(false);
    expect(isDismissedUpdate(null, 'update-123')).toBe(false);
  });
});
