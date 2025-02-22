import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Key for storing the private key in AsyncStorage
 */
const PRIVATE_KEY_STORAGE_KEY = 'agentWalletPrivateKey';

/**
 * Validates a private key string
 * @param privateKey - The private key to validate
 * @returns boolean indicating if the key is valid
 */
function isValidPrivateKey(privateKey: string): boolean {
  // Check if it's a valid hex string of correct length (32 bytes = 64 chars + '0x')
  return /^0x[0-9a-fA-F]{64}$/.test(privateKey);
}

/**
 * Save a private key securely in AsyncStorage
 * @param privateKey - The private key to be stored
 * @returns Promise<void>
 * @throws Error if private key is invalid or storage fails
 */
export async function savePrivateKey(privateKey: string): Promise<void> {
  try {
    if (!privateKey) {
      throw new Error('Private key cannot be empty');
    }

    if (!isValidPrivateKey(privateKey)) {
      throw new Error('Invalid private key format');
    }

    await AsyncStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKey);
    console.log('Private key saved successfully');
  } catch (error) {
    console.error('Error saving private key to storage:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save private key');
  }
}

/**
 * Retrieve the private key from AsyncStorage
 * @returns Promise<string | null> - The stored private key or null if not found
 * @throws Error if retrieval fails or stored key is invalid
 */
export async function getPrivateKey(): Promise<string | null> {
  try {
    const privateKey = await AsyncStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    
    if (privateKey && !isValidPrivateKey(privateKey)) {
      console.error('Retrieved invalid private key from storage');
      await deletePrivateKey(); // Clean up invalid key
      return null;
    }

    return privateKey;
  } catch (error) {
    console.error('Error retrieving private key from storage:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to retrieve private key');
  }
}

/**
 * Remove the private key from AsyncStorage
 * @returns Promise<void>
 * @throws Error if deletion fails
 */
export async function deletePrivateKey(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
    console.log('Private key deleted successfully');
  } catch (error) {
    console.error('Error deleting private key from storage:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete private key');
  }
}
