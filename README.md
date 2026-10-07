# MiFlix Android TV V1.9.6

TV-first performance and navigation build.

## Main fixes

- Modal focus is now trapped inside the movie/series detail window on Android TV.
- D-pad Up/Down scrolls and focuses controls inside the active modal instead of moving the page behind it.
- The background page is locked while a modal is open.
- Details modal is wider (up to 97vw / 1500px) with lighter rendering.
- Android TV runtime disables browser trailer previews and smooth-motion effects that made WebView feel sluggish.
- TMDB card art uses smaller TV-friendly image sizes; hero/detail art stays higher resolution.
- Platform GIFs load only when the platform tile actually receives focus.
- Animated GIF covers are avoided for idle TV tiles where possible.
- Home startup uses only the first 8 cards per rail and only the first two collection rows.
- TV startup fetches Trending, Popular Movies and Popular Series first; heavier TMDB refreshes are delayed.
- Personal Torrentio setup and cloud sync bootstrap after the first screen is already navigable.
- WebView hardware acceleration/cache/overscroll settings tuned for TV.

## Build

The included GitHub Actions workflow creates `MiFlix-TV-v1.9.6.apk` and release tag `tv-v1.9.6`.

Existing repository secrets remain the same:
- `MIFLIX_TMDB_TOKEN`
- `MIFLIX_TORRENTIO_MANIFEST`

Supabase publishable defaults remain bundled in `private-config.js`; private TMDB/Torrentio values are injected only at build time.
