# MiFlix Android TV V1.9.5

Android TV test build focused on remote-control navigation and native playback reliability.

## What changed

- D-pad spatial navigation throughout the UI.
- Up/Down no longer gets trapped by sliders such as Rounding/Blur/Intro length.
- TV settings layout is slimmer and easier to navigate from a couch.
- Native MiFlix splash screen on launch.
- Native Media3/ExoPlayer playback now uses a TextureView instead of SurfaceView to avoid black video when the player is layered over the MiFlix WebView.
- Media3 decoder fallback is enabled.
- TV Compatibility Mode is enabled by default and prefers 1080p/H.264 sources over Dolby Vision, AV1 and HEVC when possible.
- Android Back button closes the native player or navigates back inside MiFlix.
- Supabase URL and publishable key are prefilled.
- TMDB and personal Torrentio/TorBox defaults can be injected securely during the GitHub Actions build with repository secrets.

## Private build defaults

Do **not** paste a TorBox API key or TMDB Read Access Token directly into a public GitHub repository.

Create these repository Actions secrets instead:

- `MIFLIX_TMDB_TOKEN`
- `MIFLIX_TORRENTIO_MANIFEST`

The build workflow writes them into the APK at build time. They are not committed into the source repository.

Note: any secret embedded in an APK can still be extracted by someone who obtains the APK. This setup prevents accidental exposure in the public source code, but a truly private credential should ideally be fetched after login from your own protected backend.

## Build

See `BUILD_APK.md`.
