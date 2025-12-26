import { entity } from 'simpler-state';

export interface OnboardingState {
  hasSeenOnboarding: boolean;
}

const initialState: OnboardingState = {
  hasSeenOnboarding: false,
};

export const onboardingStore = entity(initialState);

export const useOnboardingStore = () => {
  const state = onboardingStore.use();

  const setHasSeenOnboarding = (hasSeen: boolean) => {
    onboardingStore.set({ hasSeenOnboarding: hasSeen });
  };

  return {
    ...state,
    setHasSeenOnboarding,
  };
};


