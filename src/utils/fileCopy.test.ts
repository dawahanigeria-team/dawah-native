import { MissingCopySourceError, copyWithOverwrite } from "./fileCopy";

type MockFile = {
  exists: boolean;
  copy: jest.Mock<Promise<void>, [MockFile]>;
  delete: jest.Mock<void, []>;
};

const createMockFile = (exists = false): MockFile => ({
  exists,
  copy: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn(function (this: MockFile) {
    this.exists = false;
  }),
});

describe("copyWithOverwrite", () => {
  test("waits for the copy to finish before resolving", async () => {
    const source = createMockFile(true);
    const destination = createMockFile(false);
    let finishCopy!: () => void;
    source.copy.mockImplementation(() => new Promise(resolve => {
      finishCopy = resolve;
    }));

    let resolved = false;
    const copy = copyWithOverwrite(source, destination).then(() => {
      resolved = true;
    });
    await Promise.resolve();

    expect(source.copy).toHaveBeenCalledTimes(1);
    expect(destination.delete).not.toHaveBeenCalled();
    expect(resolved).toBe(false);

    finishCopy();
    await copy;
    expect(resolved).toBe(true);
  });

  test("deletes destination first when it already exists", async () => {
    const source = createMockFile(true);
    const destination = createMockFile(true);

    await copyWithOverwrite(source, destination);

    expect(destination.delete).toHaveBeenCalledTimes(1);
    expect(source.copy).toHaveBeenCalledTimes(1);
  });

  test("retries once when copy fails with file already exists", async () => {
    const source = createMockFile(true);
    const destination = createMockFile(false);

    source.copy
      .mockImplementationOnce(async () => {
        destination.exists = true;
        throw new Error("kotlin.io.FileAlreadyExistsException: destination exists");
      })
      .mockResolvedValueOnce(undefined);

    await copyWithOverwrite(source, destination);

    expect(source.copy).toHaveBeenCalledTimes(2);
    expect(destination.delete).toHaveBeenCalledTimes(1);
  });

  test("throws non-overwrite errors", async () => {
    const source = createMockFile(true);
    const destination = createMockFile(false);

    source.copy.mockImplementation(async () => {
      throw new Error("I/O failed");
    });

    await expect(copyWithOverwrite(source, destination)).rejects.toThrow("I/O failed");
    expect(destination.delete).not.toHaveBeenCalled();
  });
});

describe("copyWithOverwrite when the source has vanished", () => {
  test("reports the missing source instead of failing inside the native copy", async () => {
    const source = createMockFile(false);
    const destination = createMockFile(false);

    await expect(copyWithOverwrite(source, destination)).rejects.toThrow(MissingCopySourceError);
    expect(source.copy).not.toHaveBeenCalled();
  });

  test("leaves an existing destination intact", async () => {
    const source = createMockFile(false);
    const destination = createMockFile(true);

    await expect(copyWithOverwrite(source, destination)).rejects.toThrow(MissingCopySourceError);
    expect(destination.delete).not.toHaveBeenCalled();
    expect(destination.exists).toBe(true);
  });
});
