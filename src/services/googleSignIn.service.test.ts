const mockConfigure = jest.fn();

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: mockConfigure,
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
