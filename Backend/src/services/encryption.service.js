const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * Encrypt data
 */
const encrypt = (text, key) => {
  return CryptoJS.AES.encrypt(text, key).toString();
};

/**
 * Decrypt data
 */
const decrypt = (ciphertext, key) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Save SuperAdmin credentials (encrypted at rest, password one-way hashed)
 */
const saveSuperAdminCredentials = async (username, email, password) => {
  // Bcrypt-hash the password itself (same as every regular User account) —
  // on top of, not instead of, the AES encryption of the whole file below.
  // The old scheme stored the password reversibly (AES-decryptable back to
  // plaintext given ENCRYPTION_KEY) for the single most powerful account in
  // the system; a leaked credentials file + key recovered it instantly,
  // where a leaked bcrypt hash would not.
  const hashedPassword = await bcrypt.hash(password, 12);
  const credentials = {
    username,
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  const encrypted = encrypt(JSON.stringify(credentials), config.superadmin.encryptionKey);
  
  const credentialsPath = config.superadmin.credentialsPath;
  const dir = path.dirname(credentialsPath);
  
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(credentialsPath, encrypted, { mode: 0o600 });
  
  return true;
};

/**
 * Load SuperAdmin credentials
 */
const loadSuperAdminCredentials = async () => {
  try {
    const credentialsPath = config.superadmin.credentialsPath;
    const encrypted = await fs.readFile(credentialsPath, 'utf8');
    const decrypted = decrypt(encrypted, config.superadmin.encryptionKey);
    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
};

/**
 * Verify SuperAdmin credentials
 */
const verifySuperAdminCredentials = async (username, password) => {
  const credentials = await loadSuperAdminCredentials();

  if (!credentials || credentials.username !== username) {
    return false;
  }

  // bcrypt.compare is constant-time for the actual secret, unlike the old
  // plain `===` on a decrypted plaintext password.
  return bcrypt.compare(password, credentials.password);
};

/**
 * Change SuperAdmin password
 */
const changeSuperAdminPassword = async (oldPassword, newPassword) => {
  const credentials = await loadSuperAdminCredentials();

  if (!credentials || !(await bcrypt.compare(oldPassword, credentials.password))) {
    throw new Error('Invalid current password');
  }

  credentials.password = await bcrypt.hash(newPassword, 12);
  credentials.updatedAt = new Date().toISOString();
  
  const encrypted = encrypt(JSON.stringify(credentials), config.superadmin.encryptionKey);
  await fs.writeFile(config.superadmin.credentialsPath, encrypted, { mode: 0o600 });
  
  return true;
};

module.exports = {
  encrypt,
  decrypt,
  saveSuperAdminCredentials,
  loadSuperAdminCredentials,
  verifySuperAdminCredentials,
  changeSuperAdminPassword
};
