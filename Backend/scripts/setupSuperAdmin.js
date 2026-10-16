#!/usr/bin/env node

/**
 * SuperAdmin Setup Script
 * Interactive script to create encrypted SuperAdmin credentials
 */

const readline = require('readline');
const { saveSuperAdminCredentials } = require('../src/services/encryption.service');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const validateInput = (input, fieldName, minLength = 1) => {
  if (!input || input.trim().length < minLength) {
    console.log(`❌ ${fieldName} must be at least ${minLength} characters long`);
    return false;
  }
  return true;
};

const validatePassword = (password) => {
  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters long');
    return false;
  }

  if (!/[A-Z]/.test(password)) {
    console.log('❌ Password must contain at least one uppercase letter');
    return false;
  }

  if (!/[a-z]/.test(password)) {
    console.log('❌ Password must contain at least one lowercase letter');
    return false;
  }

  if (!/[0-9]/.test(password)) {
    console.log('❌ Password must contain at least one number');
    return false;
  }

  return true;
};

const setup = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 SuperAdmin Setup');
  console.log('='.repeat(60));
  console.log('\nThis will create encrypted SuperAdmin credentials.');
  console.log('These credentials are stored in a secure encrypted file.');
  console.log('\n⚠️  Important:');
  console.log('   - SuperAdmin has full system access');
  console.log('   - Keep these credentials secure');
  console.log('   - Credentials are encrypted and stored locally');
  console.log('   - NOT stored in the database\n');

  try {
    // Get username
    let username;
    while (true) {
      username = await question('Enter SuperAdmin username (min 4 chars): ');
      if (validateInput(username, 'Username', 4)) break;
    }

    // Get email
    let email;
    while (true) {
      email = await question('Enter SuperAdmin email: ');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format');
        continue;
      }
      break;
    }

    // Get password
    let password;
    while (true) {
      password = await question('Enter SuperAdmin password (min 8 chars, must include uppercase, lowercase, number): ');
      if (validatePassword(password)) break;
    }

    // Confirm password
    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match. Setup cancelled.');
      rl.close();
      process.exit(1);
    }

    console.log('\n📝 Creating SuperAdmin credentials...');

    // Check if encryption key is set
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
      console.log('\n❌ Error: ENCRYPTION_KEY not set or too short in .env file');
      console.log('   Please set ENCRYPTION_KEY to a random string of at least 32 characters');
      console.log('   Example: ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars');
      rl.close();
      process.exit(1);
    }

    // Save credentials
    await saveSuperAdminCredentials(username, email, password);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SuperAdmin Setup Complete!');
    console.log('='.repeat(60));
    console.log('\nCredentials Summary:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${'*'.repeat(password.length)}`);
    console.log('\n📁 Credentials saved to: ' + (process.env.SUPERADMIN_CREDENTIALS_PATH || './secure/superadmin.encrypted'));
    console.log('\n🔒 Security Notes:');
    console.log('   ✓ Credentials are encrypted with AES-256');
    console.log('   ✓ File permissions set to 0600 (owner read/write only)');
    console.log('   ✓ NOT stored in database');
    console.log('   ✓ Keep backup of credentials file');
    console.log('\n📝 Next Steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Login as SuperAdmin using these credentials');
    console.log('   3. Access admin panel to create other admins');
    console.log('\n⚠️  Keep your ENCRYPTION_KEY safe - without it, credentials cannot be decrypted!\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Check if .env is loaded
require('dotenv').config();

// Run setup
setup().catch((error) => {
  console.error('Setup error:', error);
  process.exit(1);
});
