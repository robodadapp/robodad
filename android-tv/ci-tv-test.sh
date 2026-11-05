#!/bin/bash
# Runs on the virtual Android TV in GitHub Actions: the same steps as setting up the real TV.
set -x
O=out
adb install -r $O/robodad-tv.apk
adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME > $O/home-before.txt
STOCK=$(grep '/' $O/home-before.txt | sed 's#/.*##' | grep -v '^app.robodad.tv$' | head -1)
echo "stock launcher: $STOCK" > $O/home-after.txt
adb logcat -c
adb shell am start -n app.robodad.tv/.HomeActivity
sleep 15
adb exec-out screencap -p > $O/screen-1-home.png
adb shell input keyevent KEYCODE_DPAD_CENTER
sleep 3
adb exec-out screencap -p > $O/screen-2-note-closed.png
adb shell input keyevent KEYCODE_DPAD_DOWN
sleep 2
adb exec-out screencap -p > $O/screen-3-watch-row.png
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_DPAD_RIGHT
sleep 2
adb exec-out screencap -p > $O/screen-4-apps-row.png

# Switch off the stock home screen and press Home, exactly as on the real TV.
[ -n "$STOCK" ] && adb shell pm disable-user --user 0 "$STOCK" >> $O/home-after.txt 2>&1
adb shell input keyevent KEYCODE_HOME
sleep 6
adb exec-out screencap -p > $O/screen-5-after-home-button.png
adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME >> $O/home-after.txt

# Home again puts focus on "Talk to RoboDad"; OK opens the chat.
adb shell input keyevent KEYCODE_HOME
sleep 2
adb shell input keyevent KEYCODE_DPAD_CENTER
sleep 25
adb exec-out screencap -p > $O/screen-6-chat.png
adb shell input keyevent KEYCODE_TAB
adb shell input keyevent KEYCODE_DPAD_DOWN
sleep 2
adb exec-out screencap -p > $O/screen-7-chat-moved.png
adb shell input keyevent KEYCODE_BACK
adb shell input keyevent KEYCODE_BACK
adb shell input keyevent KEYCODE_BACK
sleep 3
adb exec-out screencap -p > $O/screen-8-back-home.png

# Undo, as you would on the real TV.
[ -n "$STOCK" ] && adb shell pm enable "$STOCK" >> $O/home-after.txt 2>&1
adb logcat -d -v brief > $O/logcat-full.txt
grep -E "chromium|AndroidRuntime|robodad|FATAL" $O/logcat-full.txt | tail -300 > $O/logcat.txt
rm -f $O/logcat-full.txt
adb shell pidof app.robodad.tv > $O/still-running.txt || echo "NOT RUNNING" > $O/still-running.txt
exit 0
