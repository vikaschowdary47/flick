// Signs release builds (APK and the Play Store AAB) with your upload key when
// these are set in ~/.gradle/gradle.properties, which stays out of the repo:
//   EQLSHARE_UPLOAD_STORE_FILE=/Users/you/keys/eqlshare-upload.jks
//   EQLSHARE_UPLOAD_STORE_PASSWORD=…
//   EQLSHARE_UPLOAD_KEY_ALIAS=upload
//   EQLSHARE_UPLOAD_KEY_PASSWORD=…
// Without them, release builds fall back to the debug key (fine for testing,
// rejected by the Play Store).
const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('EQLSHARE_UPLOAD_STORE_FILE')) {
                storeFile file(EQLSHARE_UPLOAD_STORE_FILE)
                storePassword EQLSHARE_UPLOAD_STORE_PASSWORD
                keyAlias EQLSHARE_UPLOAD_KEY_ALIAS
                keyPassword EQLSHARE_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes("EQLSHARE_UPLOAD_STORE_FILE")) return mod;
    // Add a release signing config after the debug one.
    gradle = gradle.replace(
      /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/,
      `$1${RELEASE_CONFIG}`,
    );
    // Release build type: use it when the key is configured.
    gradle = gradle.replace(
      /(release\s*\{\s*(?:\/\/[^\n]*\n\s*)*)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('EQLSHARE_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    mod.modResults.contents = gradle;
    return mod;
  });
};
