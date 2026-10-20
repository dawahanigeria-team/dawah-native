import * as Sentry from '@sentry/react-native';
import { captureSentryException } from './sentry.config';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  withScope: jest.fn((callback: (scope: { setExtra: jest.Mock }) => void) =>
    callback({ setExtra: jest.fn() }),
  ),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: {} }));
jest.mock('expo-application', () => ({}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));


const captureException = Sentry.captureException as jest.Mock;

beforeEach(() => {
  captureException.mockClear();
});

describe('captureSentryException', () => {
  test('reports an ordinary failure', () => {
    captureSentryException(new Error('Something broke'), { action: 'anything' });

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  test('does not re-report an error the API client already declined as expected', () => {
    const error = Object.assign(new Error('Invalid or expired token: Expired token'), {
      statusCode: 401,
      isExpectedRefusal: true,
    });

    captureSentryException(error, { component: 'FavoritesApiService', action: 'getFavoriteIds' });

    expect(captureException).not.toHaveBeenCalled();
  });

  test('does not report a platform sign-in failure the user is told about on screen', () => {
    captureSentryException(new Error('NETWORK_ERROR'), { action: 'handleGoogleSignIn' });

    expect(captureException).not.toHaveBeenCalled();
  });
});
