
import { StorageAccessFramework } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Requests permission to write to a directory using the Storage Access Framework.
 * This is required for Android 10 (API 29) and above.
 *
 * @returns {Promise<boolean>} A promise that resolves to true if permission is granted, and false otherwise.
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    // On iOS or web, StorageAccessFramework is not available or not needed for this purpose.
    // We can assume permission is granted or handled by the system.
    console.log('ℹ️ Storage permission not required on this platform.');
    return true;
  }

  try {
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      console.log('✅ Storage permission granted');
      return true;
    } else {
      console.log('❌ Storage permission denied');
      return false;
    }
  } catch (error) {
    console.error('Failed to request storage permission:', error);
    return false;
  }
};
