#!/bin/sh

set -eu

src_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

cd "$src_dir"
chmod +x android/gradlew

export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"

# The debug APK loads JavaScript from Metro on port 8081. When using a
# physical device over USB, route that port to the local development server
# before launching the app.
adb reverse tcp:8081 tcp:8081

npx react-native run-android --no-packager "$@"
