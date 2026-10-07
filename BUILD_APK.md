# Build MiFlix TV APK with GitHub Actions

The project already contains the workflow `.github/workflows/build-tv-apk.yml`.

1. Create a GitHub repository, e.g. `miflix-tv`.
2. Extract `MiFlix_AndroidTV_V1.9.4_Source.zip` and upload the CONTENTS of the extracted folder to the repository root. The repository root must show `app/`, `.github/`, `build.gradle`, `settings.gradle`, etc.
3. Open the repository's **Actions** tab.
4. Select **Build MiFlix Android TV APK**.
5. Click **Run workflow** > **Run workflow**.
6. Wait for the green check. The run exposes an artifact named `MiFlix-TV-v1.9.4` containing the APK.
7. The workflow also creates/updates a GitHub Release tagged `tv-v1.9.4` and attaches `MiFlix-TV-v1.9.4.apk`.

For a public repository, the direct APK URL is normally:
`https://github.com/<OWNER>/<REPO>/releases/download/tv-v1.9.4/MiFlix-TV-v1.9.4.apk`

This is a debug-signed APK intended for personal testing/sideloading. Android TV may ask you to allow installation from unknown sources for the app you use to download/install it.
