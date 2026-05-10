import CryptoJS from 'crypto-js';

/**
 * Hashes a passcode using SHA-256.
 * Used for storing the "password" in the DB.
 */
export function hashPasscode(passcode: string): string {
  return CryptoJS.SHA256(passcode).toString();
}

/**
 * Encrypts data using a passcode.
 * We use the passcode and the user's UID to derive a robust key.
 */
export function encryptData(data: string, passcode: string, uid: string): string {
  // Deriving a key from passcode + uid for uniqueness
  const key = CryptoJS.PBKDF2(passcode, uid, {
    keySize: 256 / 32,
    iterations: 1000
  }).toString();
  
  return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * Decrypts data using a passcode.
 */
export function decryptData(encryptedData: string, passcode: string, uid: string): string {
  try {
    const key = CryptoJS.PBKDF2(passcode, uid, {
      keySize: 256 / 32,
      iterations: 1000
    }).toString();
    
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) throw new Error("Decryption failed: likely wrong passcode");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
}

/**
 * Generates a random alphanumeric recovery key (24 chars).
 */
export function generateRecoveryKey(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0; i < 24; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return retVal;
}
