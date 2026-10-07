# MiFlix Android TV V1.9.4

First Android TV test build of the MiFlix V1.9.4 web UI with a native Android TV player.

## Included
- Android TV launcher app (`com.miflix.tv`)
- MiFlix V1.9.4 UI bundled locally in a WebView
- Native Android Media3 / ExoPlayer playback
- External subtitle URLs passed to Media3
- Preferred audio/subtitle language support
- Remote-friendly Play/Pause/Seek via Media3 PlayerView
- Supabase account + sync UI from MiFlix V1.9.4
- Profiles, My List, Continue Watching, Collections and Add-ons
- Watch Party LAN discovery bridge
- GitHub Actions APK builder

## First TV test
1. Install the APK on Android TV.
2. Open MiFlix.
3. Add the same TMDB credential and add-ons used on PC (private add-on tokens remain local by design).
4. In Settings > Account & sync, enter the same Supabase URL + publishable key and sign in with the same account.
5. Press Sync now. Your profiles, My List and playback progress should be restored.
6. Test a movie/episode. Playback is handled by native Media3/ExoPlayer, not the Windows FFmpeg browser bridge.

## Build
The repo includes `.github/workflows/build-tv-apk.yml`.
Push the project to GitHub and run **Actions > Build MiFlix Android TV APK > Run workflow**.
The workflow uploads `MiFlix-TV-v1.9.4.apk` as an artifact.
