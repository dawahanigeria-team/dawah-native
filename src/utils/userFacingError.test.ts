import { toUserFacingError } from "./userFacingError";

const apiError = (message: string, statusCode?: number, flags: object = {}) =>
  Object.assign(new Error(message), { statusCode }, flags);

const FALLBACK = "Unable to sign in. Please try again.";

describe("toUserFacingError", () => {
  test("a dropped connection becomes a network message with a retry hint", () => {
    expect(toUserFacingError(new Error("Network request failed"), FALLBACK)).toEqual({
      kind: "network",
      message: "We could not reach the server. Check your internet connection and try again.",
    });
  });

  test("an ApiError flagged as timeout is a network error", () => {
    const error = apiError("The request timed out.", undefined, { isTimeout: true });
    expect(toUserFacingError(error, FALLBACK).kind).toBe("network");
  });

  test("401 and 403 map to credentials", () => {
    expect(toUserFacingError(apiError("Unauthorized", 401), FALLBACK).kind).toBe("credentials");
    expect(toUserFacingError(apiError("Forbidden", 403), FALLBACK).kind).toBe("credentials");
  });

  test("429 and 5xx get their own wording", () => {
    expect(toUserFacingError(apiError("x", 429), FALLBACK).kind).toBe("rate_limit");
    expect(toUserFacingError(apiError("x", 503), FALLBACK).message).toBe(
      "Something went wrong on our side. Try again in a moment.",
    );
  });

  test("a plain server sentence is kept", () => {
    expect(toUserFacingError(new Error("Email is already registered."), FALLBACK)).toEqual({
      kind: "other",
      message: "Email is already registered.",
    });
  });

  test.each([
    "ApiError: Request failed with status 422",
    '{"detail":"bad"}',
    "TypeError: undefined is not an object",
    "",
  ])("technical text %j falls back", (raw) => {
    expect(toUserFacingError(new Error(raw), FALLBACK)).toEqual({ kind: "other", message: FALLBACK });
  });
});
