type ShouldSendSentryEventInput = {
  isDevelopment: boolean;
  devFlagValue?: string;
};

const isDevSentryEnabled = (devFlagValue?: string): boolean => devFlagValue === 'true';

export const shouldSendSentryEvent = ({
  isDevelopment,
  devFlagValue,
}: ShouldSendSentryEventInput): boolean => {
  if (!isDevelopment) return true;
  return isDevSentryEnabled(devFlagValue);
};
