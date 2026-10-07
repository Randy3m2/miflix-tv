# Build MiFlix TV V1.9.6

1. Upload/replace the contents of this folder in the existing `miflix-tv` repository.
2. Keep the existing GitHub Actions repository secrets:
   - `MIFLIX_TMDB_TOKEN`
   - `MIFLIX_TORRENTIO_MANIFEST`
3. Make sure `.github/workflows/build-tv-apk.yml` is replaced with the V1.9.6 file.
4. Commit directly to `main`.
5. Open **Actions > Build MiFlix Android TV APK > Run workflow**.
6. A successful build produces `MiFlix-TV-v1.9.6.apk` and a release tagged `tv-v1.9.6`.

## Recommended upgrade test

After installing over the previous APK:
1. Navigate Home with the D-pad and compare response speed.
2. Open a movie or series.
3. Press Down repeatedly. Focus must remain inside the detail modal and the modal itself should scroll.
4. Reach Play / episodes / sources without the background page moving.
5. Close with Back and verify focus returns to the card you opened.
