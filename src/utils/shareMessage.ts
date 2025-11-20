const SHARE_SIGNATURE = '\n\nShared via Dawahnigeria Mobile App';

export const appendShareSignature = (message: string): string => {
  return `${message}${SHARE_SIGNATURE}`;
};

export { SHARE_SIGNATURE };
