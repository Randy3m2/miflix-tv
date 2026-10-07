MiFlix Android TV V1.9.5.1 Hotfix

Replace these files in your GitHub repo:
- app/src/main/res/layout/player_view_tv.xml
- app/build.gradle
- .github/workflows/build-tv-apk.yml

Root cause fixed:
Media3 PlayerView uses app:show_timeout, not app:controller_show_timeout.

Then commit to main and run the workflow again.
