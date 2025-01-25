import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Key for storing the private key in AsyncStorage
 */
const PRIVATE_KEY_STORAGE_KEY = 'agentWalletPrivateKey';

/**
 * Save a private key securely in AsyncStorage
 * @param privateKey - The private key to be stored
 * @returns Promise<void>
 */
export async function savePrivateKey(privateKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKey);
  } catch (error) {
    console.error('Error saving private key to storage:', error);
    throw new Error('Failed to save private key.');
  }
}

/**
 * Retrieve the private key from AsyncStorage
 * @returns Promise<string | null> - The stored private key or null if not found
 */
export async function getPrivateKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error retrieving private key from storage:', error);
    throw new Error('Failed to retrieve private key.');
  }
}

/**
 * Remove the private key from AsyncStorage
 * @returns Promise<void>
 */
export async function deletePrivateKey(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error deleting private key from storage:', error);
    throw new Error('Failed to delete private key.');
  }
}
