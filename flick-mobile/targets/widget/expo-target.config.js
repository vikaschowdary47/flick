/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  // Not "FlickWidgets": that's the app's bridge module (modules/flick-widgets).
  name: "FlickWidgetExtension",
  displayName: "eqlDrop",
  // Interactive widgets (Copy latest clip) need iOS 17.
  deploymentTarget: "17.0",
  bundleIdentifier: ".widgets",
  frameworks: ["SwiftUI", "WidgetKit", "AppIntents", "ActivityKit"],
  colors: {
    $accent: { color: "#F67381", darkColor: "#F67381" },
    $widgetBackground: { color: "#FFF8EE", darkColor: "#10142A" },
  },
  entitlements: {
    // Same App Group as the app: the widgets read the app's snapshot.
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
