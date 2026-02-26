#!/bin/bash

# Deploy script for building and running the mobile app on iOS Simulator
# Usage: ./scripts/deploy-sim.sh

set -e

# Configuration
APP_NAME="RGRFleet"
WORKSPACE="apps/mobile/ios/${APP_NAME}.xcworkspace"
SCHEME="${APP_NAME}"
CONFIGURATION="Debug"
SIMULATOR_NAME="iPhone 17 Pro"
DERIVED_DATA_PATH="apps/mobile/ios/build/DerivedData"
BUILD_DIR="apps/mobile/ios/build"
BUNDLE_ID="com.rgr.fleetmanager"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get the simulator UDID
get_simulator_udid() {
    xcrun simctl list devices available | grep "${SIMULATOR_NAME}" | head -1 | grep -oE '[A-F0-9-]{36}'
}

# Check if simulator is booted
is_simulator_booted() {
    local udid=$1
    xcrun simctl list devices | grep "${udid}" | grep -q "Booted"
}

# Kill any existing Metro processes
kill_metro() {
    pkill -f "expo start" 2>/dev/null || true
    pkill -f "react-native start" 2>/dev/null || true
    pkill -f "metro" 2>/dev/null || true
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
}

# Main script
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     RGR Fleet - iOS Simulator Deploy       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    # Ensure we're in the project root
    if [[ ! -f "package.json" ]] || [[ ! -d "apps/mobile" ]]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi

    # Get simulator UDID
    print_step "Finding ${SIMULATOR_NAME} simulator..."
    SIMULATOR_UDID=$(get_simulator_udid)

    if [[ -z "$SIMULATOR_UDID" ]]; then
        print_error "Could not find ${SIMULATOR_NAME} simulator"
        echo "Available simulators:"
        xcrun simctl list devices available | grep -i "iphone"
        exit 1
    fi
    print_success "Found simulator: ${SIMULATOR_UDID}"

    # Boot simulator if not already running
    print_step "Starting simulator..."
    if is_simulator_booted "$SIMULATOR_UDID"; then
        print_success "Simulator already running"
    else
        xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
        print_success "Simulator booted"
    fi

    # Open Simulator app
    open -a Simulator

    # Build the app
    print_step "Building ${APP_NAME} for simulator..."
    echo "    Workspace: ${WORKSPACE}"
    echo "    Scheme: ${SCHEME}"
    echo "    Configuration: ${CONFIGURATION}"
    echo ""

    xcodebuild \
        -workspace "${WORKSPACE}" \
        -scheme "${SCHEME}" \
        -configuration "${CONFIGURATION}" \
        -destination "platform=iOS Simulator,id=${SIMULATOR_UDID}" \
        -derivedDataPath "${DERIVED_DATA_PATH}" \
        -quiet \
        build

    print_success "Build completed"

    # Find the built app
    print_step "Locating built app..."
    APP_PATH=$(find "${DERIVED_DATA_PATH}" -name "${APP_NAME}.app" -type d | grep -v "\.dSYM" | head -1)

    if [[ -z "$APP_PATH" ]]; then
        print_error "Could not find built app"
        exit 1
    fi
    print_success "Found app: ${APP_PATH}"

    # Install the app
    print_step "Installing app on simulator..."
    xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
    print_success "App installed"

    # Kill existing Metro processes
    print_step "Stopping any existing Metro processes..."
    kill_metro
    sleep 1
    print_success "Metro processes stopped"

    # Clear Metro cache
    print_step "Clearing Metro cache..."
    rm -rf apps/mobile/node_modules/.cache/metro 2>/dev/null || true
    rm -rf /tmp/metro-* 2>/dev/null || true
    rm -rf /tmp/haste-map-* 2>/dev/null || true
    watchman watch-del-all 2>/dev/null || true
    print_success "Metro cache cleared"

    # Start Metro bundler in background
    print_step "Starting Metro bundler..."
    cd apps/mobile
    npx expo start --clear --localhost &
    METRO_PID=$!
    cd - > /dev/null

    # Wait for Metro to be ready
    print_step "Waiting for Metro to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
            print_success "Metro is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "Metro may still be starting, continuing anyway..."
        fi
        sleep 1
    done

    # Launch the app
    print_step "Launching ${APP_NAME}..."
    xcrun simctl terminate "$SIMULATOR_UDID" "$BUNDLE_ID" 2>/dev/null || true
    sleep 1
    xcrun simctl launch "$SIMULATOR_UDID" "$BUNDLE_ID"
    print_success "App launched"

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Deploy Complete!                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo "App: ${APP_NAME}"
    echo "Simulator: ${SIMULATOR_NAME}"
    echo "Bundle ID: ${BUNDLE_ID}"
    echo "Metro PID: ${METRO_PID}"
    echo ""
    echo -e "${YELLOW}Metro is running in the background.${NC}"
    echo -e "To stop Metro: ${BLUE}kill ${METRO_PID}${NC} or ${BLUE}pkill -f 'expo start'${NC}"
    echo ""
}

main "$@"
