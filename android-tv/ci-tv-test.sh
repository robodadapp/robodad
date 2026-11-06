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
adb shell input keyevent KEYCODE_DPAD_RIGHT
adb shell input keyevent KEYCODE_DPAD_CENTER
sleep 3
adb exec-out screencap -p > $O/screen-2-note-opened-by-ok.png
adb shell input keyevent KEYCODE_DPAD_CENTER
sleep 2
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

# Arm the surprise, switch the TV off, switch it on: the note should pop up by itself.
adb shell am start -n app.robodad.tv/.HomeActivity --ez armSurprise true
sleep 2
adb exec-out screencap -p > $O/screen-9-armed.png
adb shell input keyevent KEYCODE_SLEEP
sleep 5
adb shell input keyevent KEYCODE_WAKEUP
sleep 6
adb exec-out screencap -p > $O/screen-10-surprise-on-wake.png

# Siddhant's corner: the row of interest tiles, a YouTube tile and an ask-RoboDad tile.
adb shell input keyevent KEYCODE_HOME
sleep 2
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_DPAD_DOWN
sleep 2
adb exec-out screencap -p > $O/screen-11-corner.png
for i in 1 2 3 4; do adb shell input keyevent KEYCODE_DPAD_RIGHT; done
adb shell input keyevent KEYCODE_DPAD_CENTER
sleep 10
adb exec-out screencap -p > $O/screen-12-youtube-hitman.png
adb shell dumpsys window windows | grep -E 'mCurrentFocus' > $O/youtube-focus.txt
adb shell input keyevent KEYCODE_HOME
sleep 3
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_DPAD_CENTER
sleep 25
adb exec-out screencap -p > $O/screen-13-ask-guitar.png
adb shell input keyevent KEYCODE_HOME
sleep 2

# Undo, as you would on the real TV.
[ -n "$STOCK" ] && adb shell pm enable "$STOCK" >> $O/home-after.txt 2>&1
adb logcat -d -v brief > $O/logcat-full.txt
grep -E "chromium|AndroidRuntime|robodad|FATAL" $O/logcat-full.txt | tail -300 > $O/logcat.txt
rm -f $O/logcat-full.txt
adb shell pidof app.robodad.tv > $O/still-running.txt || echo "NOT RUNNING" > $O/still-running.txt
exit 0
