#!/bin/bash
# Increase file descriptor limit for Metro bundler
ulimit -n 10240

# Start Expo with iOS
npx expo start --ios
