# Android release preparation

## Current candidate

- Package ID: `com.webplatformz.terradeck`. Keep this stable once registered in Play.
- Display version: read from the first release in `src/data/releases.ts`.
- Android upload version: `versionCode 2` in `android/app/build.gradle`.
  Increase this integer for every subsequent uploaded bundle, even on testing tracks.
- Target SDK 36, minimum SDK 24 (Android 7.0). Recheck Play's current target requirements
  at submission time; building successfully is not Play approval.
- Cloud backup and device transfer are excluded by manifest and XML rules, including
  device-protected storage. No save migration or schema change is needed.
- A local release bundle is unsigned until you complete the signing wizard.

## Build and signing

1. Run `npm run android:sync` to build and copy the latest web app and notices.
2. Open Android Studio with `npm run android:open`. In Gradle settings, select
   **JDK 21**. Do not use a bundled JDK 25 with Gradle 8.14.3. Set `JAVA_HOME` to
   the JDK 21 installation for terminal builds; leave global Java settings alone.
3. Choose **Build → Generate Signed App Bundle / APK → Android App Bundle**.
4. Create an **upload key** using the wizard if you do not have one. Save it outside
   the repository. Enter passwords only in Android Studio, not in chat or source files.
   Back up the key, alias and passwords securely in separate trusted locations.
5. Select the **release** variant and generate the signed `.aab`. The wizard shows
   its output folder. Check package ID, version and certificate before uploading.
6. Enable **Play App Signing** when Play offers it. The upload key authenticates
   your uploads; Google manages the app-signing key used for delivered installs.

For an unsigned compile check, use Android Studio's terminal:
`cd android && ./gradlew :app:bundleRelease :app:lintRelease`.
Default unsigned output: `android/app/build/outputs/bundle/release/app-release.aab`.
Do not upload an unsigned file or use the debug signing key as the release upload key.

**Existing Pixel progress:** the debug build and Play-delivered build normally have
different signing certificates. One cannot update the other in place. Do not uninstall
the existing app without accepting loss of its local collection. Browser saves are
separate. No automatic save-export/import feature is currently provided.

## Device acceptance before upload

- Release variant: airplane-mode cold start, maps/flags/fonts, EN/DE, touch/zoom
  and magnifier, collection flips, daily tour, achievements and licence downloads.
- Background, force-stop and relaunch with unfinished normal and daily challenges;
  verify progress and cooldowns survive. Test a same-key in-place release update.
- Status/navigation bars, gesture and three-button navigation, small-screen scrolling.
- System Back with cards, help, normal challenges and tours: current wrapper uses
  Capacitor's default behavior, not game-aware overlay/exit handling. Review and
  resolve unacceptable exits before declaring the release ready.
- External links, return from browser and sharing/copy fallback. Inspect actual
  network traffic and merged release manifest before final Data safety declarations.
- Check all launcher icon densities, adaptive icon and splash on a real device.
  Existing launcher assets show the Capacitor placeholder logo; replace them with
  approved TerraDeck branding before a public release.
- Uninstall/reinstall and backup/transfer expectations on supported devices; no
  cross-device restore should be promised. Manufacturer behavior must be checked.

## Play Console checklist (requires account verification)

- Create a game named **TerraDeck**, default English, then add German.
  Confirm free/paid choice with the owner before submission.
- Start with a testing track. Check the current account-specific device verification,
  tester count, test duration and production-access requirements in Play Console.
- Prepare a 512×512 store icon, 1024×500 feature graphic and real phone screenshots;
  verify current format requirements. Do not use mock screenshots as app evidence.
- Complete content rating, target audience, ads, app access and Data safety forms.
  No login is required and no ads/analytics SDK is intentionally integrated.
  Do not infer the final declarations solely from this checklist: assess the release
  app, embedded SDKs, external links, sharing and public GitHub reports.
- Target audience is an owner decision. Selecting children may trigger additional
  Families requirements; do not choose an age group merely to bypass policy.
- Publish an accessible Android-specific privacy-policy URL. Existing web help
  describes GitHub Pages requests; bundled Android gameplay does not load Pages.
  Accurately distinguish local WebView storage, no backup, external links and any
  user-initiated sharing/reporting. Review applicable controller/contact obligations.
- Supply an owner-approved public support contact. Do not reuse personal contact
  information from chat; no email is approved for publication.
- Review developer-profile public disclosures, EN/DE listing, release notes and
  legal/privacy information with the owner. Signing is not approval to publish.
- Upload the signed AAB only after explicit approval, review Play's automated
  findings/pre-launch report, test Play-delivered installations, then obtain separate
  production-rollout approval.

## Draft store copy — not approved for publication

**Name (EN/DE):** TerraDeck

**English short description:** Learn countries on the map, earn stamps and build your collectible atlas.

**English full description:**

Turn geography practice into a collectible atlas. Open a country pack, choose its
continent and find it on an unlabelled map. Two successful encounters earn Visitor
and Explorer stamps and unlock that country's card. Mistakes reveal the answer
without taking away your earned stamps.

Explore 168 playable countries, zoom into the map, discover country facts and
Field notes, and try five-stop daily tours. Achievements track your journey.
Switch between English and German at any time.

Game content is bundled for offline play. Progress stays on your device: there is
no account, cloud saving or cross-device sync. Uninstalling or clearing app data
removes the local collection. External links and sharing may use other services.

TerraDeck is an independent hobby learning game. Maps and facts are simplified;
it is not an official atlas or a tool for navigation.

**German short description:** Lerne Länder auf der Karte, sammle Stempel und fülle deinen Sammelatlas.

**German full description:**

Mach aus Geografieübungen einen Sammelatlas. Öffne ein Länderpäckchen, wähle den
Kontinent und finde das Land auf einer unbeschrifteten Karte. Zwei erfolgreiche
Begegnungen bringen Besucher- und Entdecker-Stempel und schalten die Länderkarte
frei. Fehler zeigen die Lösung, nehmen dir aber keine verdienten Stempel weg.

Entdecke 168 spielbare Länder, zoome in die Karte, lies Länderfakten und
Entdecker-Notizen und probiere tägliche Touren mit fünf Stopps. Erfolge begleiten
deine Reise. Wechsle jederzeit zwischen Deutsch und Englisch.

Die Spielinhalte sind für die Offline-Nutzung enthalten. Dein Fortschritt bleibt
auf deinem Gerät: ohne Konto, Cloud-Spielstand oder geräteübergreifende
Synchronisierung. Deinstallieren oder Löschen der App-Daten entfernt die lokale
Sammlung. Externe Links und Teilen können andere Dienste nutzen.

TerraDeck ist ein unabhängiges Hobby-Lernspiel. Karten und Fakten sind vereinfacht;
es ist kein offizieller Atlas und kein Navigationswerkzeug.
