/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'FastingLive',
  displayName: 'Hatchly Fast',
  deploymentTarget: '16.2',
  bundleIdentifier: '.fastinglive',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  colors: {
    $accent: '#FF6B9D',
    $widgetBackground: '#1A1216',
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [
        'group.com.hatchly.app',
      ],
  },
});
