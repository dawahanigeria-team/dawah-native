import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    console.log('Onboarding state has been reset');
    return true;
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return false;
  }
};