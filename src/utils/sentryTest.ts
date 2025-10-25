/**
 * Sentry Test Utilities
 * Use these functions to test Sentry integration
 */

import { captureSentryException, captureSentryMessage, addSentryBreadcrumb, Sentry } from '../services/config/sentry.config';

/**
 * Test basic error capture
 */
export const testSentryError = () => {
  try {
    console.log('🧪 Testing Sentry error capture...');
    throw new Error('Test error from Dawah Nigeria app');
  } catch (error: any) {
    captureSentryException(error, {
      testType: 'manual_error_test',
      timestamp: new Date().toISOString(),
    });
    console.log('✅ Test error sent to Sentry');
  }
};

/**
 * Test message capture
 */
export const testSentryMessage = () => {
  console.log('🧪 Testing Sentry message capture...');
  captureSentryMessage('Test message from Dawah Nigeria app', 'info');
  console.log('✅ Test message sent to Sentry');
};

/**
 * Test breadcrumb logging
 */
export const testSentryBreadcrumb = () => {
  console.log('🧪 Testing Sentry breadcrumb...');
  addSentryBreadcrumb(
    'Test breadcrumb from Dawah Nigeria',
    'test',
    {
      action: 'manual_test',
      timestamp: new Date().toISOString(),
    }
  );
  console.log('✅ Test breadcrumb added');
};

/**
 * Test exception with context
 */
export const testSentryExceptionWithContext = () => {
  try {
    console.log('🧪 Testing Sentry exception with context...');

    // Add some breadcrumbs first
    addSentryBreadcrumb('User opened profile', 'navigation', { screen: 'profile' });
    addSentryBreadcrumb('User clicked settings', 'ui', { button: 'settings' });

    // Throw error
    throw new Error('Test error with rich context');
  } catch (error: any) {
    captureSentryException(error, {
      testType: 'context_test',
      userAction: 'testing_sentry',
      screen: 'test_screen',
      timestamp: new Date().toISOString(),
    });
    console.log('✅ Test exception with context sent to Sentry');
  }
};

/**
 * Test all Sentry features
 */
export const testAllSentryFeatures = () => {
  console.log('🧪 Testing all Sentry features...');

  testSentryBreadcrumb();

  setTimeout(() => {
    testSentryMessage();
  }, 1000);

  setTimeout(() => {
    testSentryError();
  }, 2000);

  setTimeout(() => {
    testSentryExceptionWithContext();
  }, 3000);

  console.log('✅ All Sentry tests queued');
};

/**
 * Trigger a crash (for testing native crash handling)
 */
export const testNativeCrash = () => {
  console.log('🧪 Testing native crash (this will crash the app!)...');
  Sentry.nativeCrash();
};
