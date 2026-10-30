import {
  getErrorMessage,
  isExpectedConnectivityMessage,
  isTransientNetworkError,
} from "../services/api/networkErrors";

export type UserFacingErrorKind = "network" | "credentials" | "rate_limit" | "server" | "other";

export interface UserFacingError {
  kind: UserFacingErrorKind;
  message: string;
}

type ErrorShape = {
  statusCode?: unknown;
  status?: unknown;
  isNetworkError?: unknown;
  isTimeout?: unknown;
};

// A server message is only shown when it already reads like a sentence for a
// person. Anything carrying status codes, JSON, or exception wording is hidden.
const TECHNICAL_MESSAGE = /error|exception|undefined|null|\bhttp|\b\d{3}\b|[{}[\]<>]|\bat \S+:\d+/i;
const MAX_PLAIN_MESSAGE_LENGTH = 120;

const statusOf = (error: unknown): number | undefined => {
  const shape = error as ErrorShape | null;
  const status = shape?.statusCode ?? shape?.status;
  return typeof status === "number" ? status : undefined;
};

export function toUserFacingError(error: unknown, fallback: string): UserFacingError {
  const raw = getErrorMessage(error);
  const shape = error as ErrorShape | null;
  const status = statusOf(error);

  if (
    shape?.isNetworkError === true ||
    shape?.isTimeout === true ||
    isTransientNetworkError(error) ||
    isExpectedConnectivityMessage(raw)
  ) {
    return {
      kind: "network",
      message: "We could not reach the server. Check your internet connection and try again.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: "credentials",
      message: "That email or password is not right. Check them, or reset your password.",
    };
  }
  if (status === 429) {
    return { kind: "rate_limit", message: "Too many attempts. Wait a minute, then try again." };
  }
  if (status !== undefined && status >= 500) {
    return { kind: "server", message: "Something went wrong on our side. Try again in a moment." };
  }
  if (raw.length > 0 && raw.length <= MAX_PLAIN_MESSAGE_LENGTH && !TECHNICAL_MESSAGE.test(raw)) {
    return { kind: "other", message: raw };
  }
  return { kind: "other", message: fallback };
}
