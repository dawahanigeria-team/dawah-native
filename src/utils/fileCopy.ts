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

export const copyWithOverwrite = <TFile extends CopyableFile<TFile>>(
  source: TFile,
  destination: TFile
): void => {
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
