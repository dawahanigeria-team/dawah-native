import AsyncStorage from 'expo-sqlite/kv-store';
import { logger } from '@/utils/logger';

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    logger.debug('Onboarding state has been reset');
    return true;
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return false;
  }
};