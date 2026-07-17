const nodemailer = require('nodemailer');
const config = require('./index');

let transporter = null;

const createEmailTransporter = () => {
  // Validate config exists
  if (!config.email) {
    throw new Error('Email configuration not found in config');
  }

  const { host, port, secure, user, password } = config.email;

  // Validate required fields
  if (!host || !user || !password) {
    throw new Error(
      `Missing email configuration. Required: host, user, password. Got: host=${host}, user=${user}, password=${password ? '***' : 'MISSING'}`
    );
  }

  return nodemailer.createTransport({
    host,
    port: port || 587,
    secure: secure === true || secure === 'true',
    auth: {
      user,
      pass: password
    }
  });
};

// Create transporter once on startup
const getTransporter = () => {
  if (!transporter) {
    transporter = createEmailTransporter();
  }
  return transporter;
};

module.exports = getTransporter;