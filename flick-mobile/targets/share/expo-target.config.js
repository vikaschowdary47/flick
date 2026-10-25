/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  // "eqlDrop it" in the iOS share sheet.
  type: "share",
  name: "FlickShareExtension",
  displayName: "eqlDrop it",
  deploymentTarget: "17.0",
  bundleIdentifier: ".share",
  frameworks: ["SwiftUI", "UniformTypeIdentifiers"],
  entitlements: {
    // Reads the app's session from the same App Group.
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
