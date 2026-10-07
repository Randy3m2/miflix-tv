# Build MiFlix TV V1.9.5 with GitHub Actions

## 1. Replace the source in the repository

Upload the contents of `MiFlix_AndroidTV_V1.9.5_Source` to the repository root. The root should contain `app/`, `.github/`, `build.gradle`, `settings.gradle`, etc.

## 2. Add personal build secrets

In GitHub open:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Create these two secrets:

- `MIFLIX_TMDB_TOKEN` = your TMDB API Read Access Token
- `MIFLIX_TORRENTIO_MANIFEST` = your configured Torrentio/TorBox manifest URL

The Supabase Project URL and Publishable Key are already prefilled in `private-config.js` because the publishable key is designed for client applications.

## 3. Build

Open:

`Actions -> Build MiFlix Android TV APK -> Run workflow -> Run workflow`

The workflow builds `MiFlix-TV-v1.9.5.apk` and publishes/updates the release tagged `tv-v1.9.5`.

Direct release URL pattern:

`https://github.com/<OWNER>/<REPO>/releases/download/tv-v1.9.5/MiFlix-TV-v1.9.5.apk`

## 4. Install on TV

You can download the APK from the GitHub Release or generate a Downloader code from the release URL.

## First TV test checklist

1. Launch: MiFlix splash appears, then Home.
2. Settings: D-pad Down passes Rounding, Blur and Intro length without changing them unless Left/Right is used.
3. Supabase URL/key are already present.
4. Sign in with the same MiFlix account used on PC and run Sync Now.
5. Verify profile/My List/progress.
6. Open a movie/episode and press Play.
7. TV Compatibility Mode should prefer a broadly compatible 1080p/H.264 source when available.
8. Verify picture + audio + subtitles.
9. Verify Back closes the native player and returns to the same MiFlix screen.
