// Keeps `expo prebuild` output building with React Native 0.88's Android Gradle
// Plugin 9.x, until Expo's template and every library catch up:
// - Gradle wrapper 9.4.1 (AGP 9.2 refuses older)
// - android.newDsl=false: expo-constants still uses android.libraryVariants
// - android.builtInKotlin=false: libraries (react-native-webview…) apply the
//   Kotlin plugin themselves, which clashes with AGP's built-in Kotlin
// - proguard-android-optimize.txt: AGP 9 rejects proguard-android.txt
// Remove each piece once a clean prebuild builds without it.
const fs = require("fs");
const path = require("path");
const { withAppBuildGradle, withDangerousMod, withGradleProperties } = require("expo/config-plugins");

const GRADLE_VERSION = "9.4.1";

function setProperty(properties, key, value) {
  const existing = properties.find((item) => item.type === "property" && item.key === key);
  if (existing) existing.value = value;
  else properties.push({ type: "property", key, value });
}

module.exports = function withAndroidGradle9(config) {
  config = withGradleProperties(config, (mod) => {
    setProperty(mod.modResults, "android.newDsl", "false");
    setProperty(mod.modResults, "android.builtInKotlin", "false");
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      /getDefaultProguardFile\((["'])proguard-android\.txt\1\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    );
    return mod;
  });

  config = withDangerousMod(config, [
    "android",
    (mod) => {
      const file = path.join(mod.modRequest.platformProjectRoot, "gradle/wrapper/gradle-wrapper.properties");
      if (fs.existsSync(file)) {
        const text = fs.readFileSync(file, "utf8");
        fs.writeFileSync(file, text.replace(/gradle-[\d.]+-(bin|all)\.zip/, `gradle-${GRADLE_VERSION}-$1.zip`));
      }
      return mod;
    },
  ]);

  return config;
};
