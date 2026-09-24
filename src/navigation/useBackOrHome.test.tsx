import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useBackOrHome } from './useBackOrHome';

const mockRouter = { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

function Screen({ onReady }: { onReady: (back: () => void) => void }) {
  const back = useBackOrHome();
  React.useEffect(() => { onReady(back); }, [back, onReady]);
  return null;
}

beforeEach(() => { jest.clearAllMocks(); });

test.each([true, false])('lecture Back has an exit when history exists: %s', async (hasHistory) => {
  mockRouter.canGoBack.mockReturnValue(hasHistory);
  let back!: () => void;
  let root!: TestRenderer.ReactTestRenderer;
  await act(async () => { root = TestRenderer.create(<Screen onReady={value => { back = value; }} />); });
  act(() => back());
  if (hasHistory) {
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  } else {
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    expect(mockRouter.back).not.toHaveBeenCalled();
  }
  act(() => root.unmount());
});
