const mockConfigure = jest.fn();
const mockSignIn = jest.fn();
const mockGetTokens = jest.fn();

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: mockConfigure,
    hasPlayServices: jest.fn(async () => true),
    signIn: (...args: unknown[]) => mockSignIn(...args),
    getTokens: (...args: unknown[]) => mockGetTokens(...args),
  },
}));

describe("googleSignIn.service", () => {
  beforeEach(() => {
    jest.resetModules();
    mockConfigure.mockReset();
  });

  test("configures Google Sign-In once when a web client id is present", () => {
    jest.doMock("../config/env", () => ({
      ENV: {
        GOOGLE_WEB_CLIENT_ID: "web-client-id",
        GOOGLE_IOS_CLIENT_ID: "ios-client-id",
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      ensureGoogleSigninConfigured,
      resetGoogleSigninConfigurationForTests,
    } = require("./googleSignIn.service");

    ensureGoogleSigninConfigured();
    ensureGoogleSigninConfigured();

    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledWith({
      webClientId: "web-client-id",
      iosClientId: "ios-client-id",
    });

    resetGoogleSigninConfigurationForTests();
  });

  test("throws a clear error when Google Sign-In is not configured", () => {
    jest.doMock("../config/env", () => ({
      ENV: {
        GOOGLE_WEB_CLIENT_ID: "",
        GOOGLE_IOS_CLIENT_ID: "",
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      ensureGoogleSigninConfigured,
      resetGoogleSigninConfigurationForTests,
    } = require("./googleSignIn.service");

    expect(() => ensureGoogleSigninConfigured()).toThrow(
      "Google Sign-In is not configured for this build."
    );
    expect(mockConfigure).not.toHaveBeenCalled();

    resetGoogleSigninConfigurationForTests();
  });
});

describe('interactive Google sign-in', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSignIn.mockReset();
    mockGetTokens.mockReset();
    jest.doMock('../config/env', () => ({ ENV: { GOOGLE_WEB_CLIENT_ID: 'web', GOOGLE_IOS_CLIENT_ID: '' } }));
  });
  test('cancellation returns without requesting tokens', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled', data: null });
    const { signInWithGoogle } = require('./googleSignIn.service');
    await expect(signInWithGoogle()).resolves.toBeNull();
    expect(mockGetTokens).not.toHaveBeenCalled();
  });
  test('uses the successful response token without another native call', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'id', user: { email: 'test@example.test', name: 'Test' } } });
    const { signInWithGoogle } = require('./googleSignIn.service');
    await expect(signInWithGoogle()).resolves.toMatchObject({ identityToken: 'id' });
    expect(mockGetTokens).not.toHaveBeenCalled();
  });
  test('retrieves the token after successful sign-in if the response omitted it', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: null, user: {} } });
    mockGetTokens.mockResolvedValue({ idToken: 'fallback' });
    const { signInWithGoogle } = require('./googleSignIn.service');
    await expect(signInWithGoogle()).resolves.toMatchObject({ identityToken: 'fallback' });
  });
  test('keeps a genuinely missing token visible', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: null, user: {} } });
    mockGetTokens.mockResolvedValue({ idToken: null });
    const { signInWithGoogle } = require('./googleSignIn.service');
    await expect(signInWithGoogle()).rejects.toThrow('No ID token');
  });
});

test('repeated taps do not overlap native sign-in, and the guard resets', async () => {
  jest.resetModules();
  mockSignIn.mockReset();
  jest.doMock('../config/env', () => ({ ENV: { GOOGLE_WEB_CLIENT_ID: 'web', GOOGLE_IOS_CLIENT_ID: '' } }));
  let complete!: (value: unknown) => void;
  mockSignIn.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const { signInWithGoogle } = require('./googleSignIn.service');
  const first = signInWithGoogle();
  await expect(signInWithGoogle()).resolves.toBeNull();
  expect(mockSignIn).toHaveBeenCalledTimes(1);
  complete({ type: 'cancelled', data: null });
  await expect(first).resolves.toBeNull();
  mockSignIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
  await expect(signInWithGoogle()).resolves.toBeNull();
  expect(mockSignIn).toHaveBeenCalledTimes(2);
});
