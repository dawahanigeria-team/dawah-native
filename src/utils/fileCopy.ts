export interface CopyableFile<TFile> {
  exists: boolean;
  copy(destination: TFile): void;
  delete(): void;
}

const isFileAlreadyExistsError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /filealreadyexistsexception|already exists/i.test(error.message);
};

/**
 * The file we were about to copy is gone. Raised before the destination is
 * touched, so a vanished source cannot also destroy an existing good copy.
 */
export class MissingCopySourceError extends Error {
  constructor(message = 'The downloaded file is no longer on disk') {
    super(message);
    this.name = 'MissingCopySourceError';
  }
}

export const copyWithOverwrite = <TFile extends CopyableFile<TFile>>(
  source: TFile,
  destination: TFile
): void => {
  if (!source.exists) {
    throw new MissingCopySourceError();
  }

  if (destination.exists) {
    destination.delete();
  }

  try {
    source.copy(destination);
  } catch (error) {
    if (!isFileAlreadyExistsError(error)) {
      throw error;
    }

    if (destination.exists) {
      destination.delete();
    }

    source.copy(destination);
  }
};
