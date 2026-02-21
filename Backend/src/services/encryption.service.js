const CryptoJS = require('crypto-js');
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
 * Save SuperAdmin credentials (encrypted)
 */
const saveSuperAdminCredentials = async (username, email, password) => {
  const credentials = {
    username,
    email,
    password,
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
  
  if (!credentials) {
    return false;
  }

  return credentials.username === username && credentials.password === password;
};

/**
 * Change SuperAdmin password
 */
const changeSuperAdminPassword = async (oldPassword, newPassword) => {
  const credentials = await loadSuperAdminCredentials();
  
  if (!credentials || credentials.password !== oldPassword) {
    throw new Error('Invalid current password');
  }

  credentials.password = newPassword;
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
