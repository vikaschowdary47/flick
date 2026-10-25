# eqlShare store assets

Upload these when submitting each build.

| Store | File | Size | Notes |
|---|---|---|---|
| App Store (iPhone) | app-store/app-store-icon-1024.png | 1024×1024 | No transparency (required). Xcode also uses ios/Flick/Images.xcassets/AppIcon. |
| Mac App Store | mac-app-store/mac-icon-1024.png | 1024×1024 | macOS rounded tile with shadow; the app bundle uses flick-desktop/build/eqlshare.icns. |
| Google Play | play-store/play-store-icon-512.png | 512×512 | Play applies its own rounded mask. |
| Google Play | play-store/play-feature-graphic-1024x500.png | 1024×500 | Required feature graphic. |
| Microsoft Store | microsoft-store/store-logo-300.png | 300×300 | Store listing logo. |
| Microsoft Store | microsoft-store/box-art-1080.png | 1080×1080 | Optional 1:1 box art. |

In-app icons live with each app:
- iOS: flick-mobile/ios/Flick/Images.xcassets/AppIcon.appiconset (+ flick-mobile/assets/icon.png for Expo)
- Android: flick-mobile/android/app/src/main/res/mipmap-* (+ flick-mobile/assets/android-icon-*.png for Expo)
- macOS: flick-desktop/build/eqlshare.icns
- Windows: flick-desktop/build/icon.ico (installer) and flick-desktop/build/appx/* (MSIX / Microsoft Store tiles)
- Linux: flick-desktop/build/linux/*.png

Logo sources: assets/brand/. Regenerate app icons with `node flick-desktop/scripts/generate-icons.mjs` (needs macOS for the .icns).
Screenshots for each store still need to be captured from the apps.
