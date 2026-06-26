#!/bin/sh

set -eu

src_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

cd "$src_dir"
chmod +x android/gradlew

export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"
npx react-native run-android --no-packager "$@"

