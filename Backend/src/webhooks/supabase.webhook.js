const { handleSupabaseWebhook } = require('../services/sync.service');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const crypto = require('crypto');

/**
 * Supabase webhook handler
 * Handles user creation, updates, and deletion from Supabase
 */

/**
 * Verify webhook signature (optional but recommended)
 */
const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-webhook-signature'];
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) return true;
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.rawBody) // use raw bytes
    .digest('base64');

  // console.log('Expected:', expectedSignature);
  // console.log('Received:', signature);

  return signature === expectedSignature;
};

/**
 * Handle Supabase user created webhook
 */
const handleUserCreated = async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid webhook signature'
      });
    }

    const { type, record } = req.body;

    if (type !== 'INSERT') {
      return sendSuccess(res, {
        message: 'Event ignored',
        data: { type }
      });
    }

    // Sync user to MongoDB
    const user = await handleSupabaseWebhook('user.created', { user: record });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'User synced successfully',
      data: { userId: user._id }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return sendError(res, {
      statusCode: 500,
      message: 'Webhook processing failed',
      error
    });
  }
};

/**
 * Handle Supabase user updated webhook
 */
const handleUserUpdated = async (req, res) => {
  try {
    if (!verifyWebhookSignature(req)) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid webhook signature'
      });
    }

    const { type, record } = req.body;

    if (type !== 'UPDATE') {
      return sendSuccess(res, {
        message: 'Event ignored',
        data: { type }
      });
    }

    const user = await handleSupabaseWebhook('user.updated', { user: record });

    return sendSuccess(res, {
      message: 'User updated successfully',
      data: { userId: user._id }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return sendError(res, {
      statusCode: 500,
      message: 'Webhook processing failed',
      error
    });
  }
};

/**
 * Handle Supabase user deleted webhook
 */
const handleUserDeleted = async (req, res) => {
  try {
    if (!verifyWebhookSignature(req)) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid webhook signature'
      });
    }

    const { type, old_record } = req.body;

    if (type !== 'DELETE') {
      return sendSuccess(res, {
        message: 'Event ignored',
        data: { type }
      });
    }

    await handleSupabaseWebhook('user.deleted', { user: old_record });

    return sendSuccess(res, {
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return sendError(res, {
      statusCode: 500,
      message: 'Webhook processing failed',
      error
    });
  }
};

/**
 * Generic webhook handler
 * Handles all Supabase events
 */
const handleWebhook = async (req, res) => {
  try {
    if (!verifyWebhookSignature(req)) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid webhook signature'
      });
    }

    const { type, table, record, old_record } = req.body;

    console.log('Supabase webhook received:', { type, table });

    // Only handle auth.users table
    if (table !== 'users') {
      return sendSuccess(res, {
        message: 'Event ignored - not a user event',
        data: { type, table }
      });
    }

    let event;
    let data;

    switch (type) {
      case 'INSERT':
        event = 'user.created';
        data = { user: record };
        break;
      case 'UPDATE':
        event = 'user.updated';
        data = { user: record };
        break;
      case 'DELETE':
        event = 'user.deleted';
        data = { user: old_record };
        break;
      default:
        return sendSuccess(res, {
          message: 'Unknown event type',
          data: { type }
        });
    }

    const result = await handleSupabaseWebhook(event, data);

    return sendSuccess(res, {
      message: 'Webhook processed successfully',
      data: { event, result }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return sendError(res, {
      statusCode: 500,
      message: 'Webhook processing failed',
      error
    });
  }
};

module.exports = {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  handleWebhook
};
