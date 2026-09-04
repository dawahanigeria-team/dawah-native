import { MissingCopySourceError, copyWithOverwrite } from "./fileCopy";

type MockFile = {
  exists: boolean;
  copy: jest.Mock<void, [MockFile]>;
  delete: jest.Mock<void, []>;
};

const createMockFile = (exists = false): MockFile => ({
  exists,
  copy: jest.fn(),
  delete: jest.fn(function (this: MockFile) {
    this.exists = false;
  }),
});

describe("copyWithOverwrite", () => {
  test("copies when destination does not exist", () => {
    const source = createMockFile(true);
    const destination = createMockFile(false);

    copyWithOverwrite(source, destination);

    expect(source.copy).toHaveBeenCalledTimes(1);
    expect(destination.delete).not.toHaveBeenCalled();
  });

  test("deletes destination first when it already exists", () => {
    const source = createMockFile(true);
    const destination = createMockFile(true);

    copyWithOverwrite(source, destination);

    expect(destination.delete).toHaveBeenCalledTimes(1);
    expect(source.copy).toHaveBeenCalledTimes(1);
  });

  test("retries once when copy fails with file already exists", () => {
    const source = createMockFile(true);
    const destination = createMockFile(false);

    source.copy
      .mockImplementationOnce(() => {
        destination.exists = true;
        throw new Error("kotlin.io.FileAlreadyExistsException: destination exists");
      })
      .mockImplementationOnce(() => undefined);

    copyWithOverwrite(source, destination);

    expect(source.copy).toHaveBeenCalledTimes(2);
    expect(destination.delete).toHaveBeenCalledTimes(1);
  });

  test("throws non-overwrite errors", () => {
    const source = createMockFile(true);
    const destination = createMockFile(false);

    source.copy.mockImplementation(() => {
      throw new Error("I/O failed");
    });

    expect(() => copyWithOverwrite(source, destination)).toThrow("I/O failed");
    expect(destination.delete).not.toHaveBeenCalled();
  });
});

describe("copyWithOverwrite when the source has vanished", () => {
  test("reports the missing source instead of failing inside the native copy", () => {
    const source = createMockFile(false);
    const destination = createMockFile(false);

    expect(() => copyWithOverwrite(source, destination)).toThrow(MissingCopySourceError);
    expect(source.copy).not.toHaveBeenCalled();
  });

  test("leaves an existing destination intact", () => {
    const source = createMockFile(false);
    const destination = createMockFile(true);

    expect(() => copyWithOverwrite(source, destination)).toThrow(MissingCopySourceError);
    expect(destination.delete).not.toHaveBeenCalled();
    expect(destination.exists).toBe(true);
  });
});
