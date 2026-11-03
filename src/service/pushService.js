/**
 * Akarabo Studio - Push Notification Service
 * Integrated FCM v1 Heads-Up Notification Handler
 */

const {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), 'serviceAccountKey.json');
let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } catch (error) {
    console.error(
      '[FCM] Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:',
      error.message,
    );
  }
} else if (fs.existsSync(serviceAccountPath)) {
  try {
    credential = cert(require(path.resolve(serviceAccountPath)));
  } catch (error) {
    console.error(
      '[FCM] Could not load Firebase service-account credentials:',
      error.message,
    );
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = applicationDefault();
}

// 2. Initialize Firebase Admin App singleton
if (!getApps().length && credential) {
  initializeApp({
    credential,
    ...(process.env.FIREBASE_PROJECT_ID
      ? { projectId: process.env.FIREBASE_PROJECT_ID }
      : {}),
  });
  console.log('[FCM] Firebase Admin SDK initialized successfully.');
}

/**
 * Sends a high-priority FCM push notification with Heads-Up capability for Android & iOS devices.
 *
 * @param {string} token - Target user's active FCM device token
 * @param {string} title - Title of the notification banner
 * @param {string} body - Main text message
 * @param {object} [data={}] - Custom data payload (e.g., { route: '/bookings/123' })
 * @returns {Promise<string|null>} Message ID on success, or null/error object
 */
const sendHeadsUpNotification = async (token, title, body, data = {}) => {
  if (!token) {
    console.warn('[FCM] Push skipped: Target device token is missing.');
    return null;
  }

  // Ensure all values inside data payload are strings (FCM requirement)
  const formattedData = Object.entries({
    ...data,
    title: String(title),
    body: String(body),
  }).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  // High-priority FCM payload optimized for Samsung & Android Heads-Up alerts
  const message = {
    token,
    notification: {
      title,
      body,
    },
    data: formattedData,
    android: {
      priority: 'high',
      notification: {
        channelId: 'akarabo_alerts_v1',
        priority: 'max',
        defaultSound: true,
        visibility: 'public',
      },
    },
  };

  try {
    const response = await getMessaging().send(message);
    console.log('[FCM] Heads-Up notification delivered. Message ID:', response);
    return response;
  } catch (error) {
    console.error('[FCM] Delivery failed:', error.message);
    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      return { invalidToken: true };
    }
    throw error;
  }
};

module.exports = { sendHeadsUpNotification };
