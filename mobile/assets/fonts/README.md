# Fonts

- `PlayfairDisplay-Bold.ttf`: Playfair Display Bold, used for the app's display headings (`typography.display`,
  `typography.h1`). Source: Google Fonts (https://fonts.google.com/specimen/Playfair+Display). License: SIL Open Font
  License 1.1 (https://openfontlicense.org), which allows bundling in apps. Use the family name `PlayfairDisplay-Bold`
  on both platforms (it is the file name on Android and the PostScript name on iOS) with no `fontWeight`.

Where each copy lives (keep them identical when updating the font):

- Android: `android/app/src/main/assets/fonts/PlayfairDisplay-Bold.ttf`
- iOS: `ios/PropertyProApp/PlayfairDisplay-Bold.ttf`, listed in `Info.plist` (`UIAppFonts`) and in the Xcode project's
  Resources phase.
