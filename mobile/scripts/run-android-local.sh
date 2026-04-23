#!/bin/sh

set -eu

src_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
mirror_root="/tmp/edu-scan-mobile-build"

mkdir -p "$mirror_root"

rsync -a --delete \
  --exclude '._*' \
  --exclude '.DS_Store' \
  --exclude '.AppleDouble' \
  --exclude '.git/' \
  --exclude '.kotlin/' \
  --exclude 'android/.gradle/' \
  --exclude 'android/build/' \
  --exclude 'android/app/build/' \
  --exclude 'android/app/.cxx/' \
  --exclude 'node_modules/*/android/build/' \
  --exclude 'node_modules/*/.kotlin/' \
  --exclude 'node_modules/.cache/' \
  --exclude '.gradle-local/' \
  "$src_dir/" "$mirror_root/"

cd "$mirror_root"

echo "[android-local] mirror: $mirror_root"

npx react-native run-android "$@"
