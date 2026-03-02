#!/usr/bin/env bash

# Deploy script for building and running the mobile app on iOS Simulator
# Usage: ./scripts/deploy-sim.sh [simulator-name]
# Example: ./scripts/deploy-sim.sh "iPhone 17 Pro"

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/deploy-common.sh"

# Configuration
APP_NAME="RGR"
MOBILE_DIR="$PROJECT_ROOT/apps/mobile"
IOS_DIR="$MOBILE_DIR/ios"
WORKSPACE="$IOS_DIR/${APP_NAME}.xcworkspace"
SCHEME="${APP_NAME}"
CONFIGURATION="Debug"
SIMULATOR_NAME="${1:-iPhone 17 Pro}"
DERIVED_DATA_PATH="$IOS_DIR/build/DerivedData"
BUNDLE_ID="com.rgr.fleetmanager"

# Track Metro PID for cleanup
METRO_PID=""

# Cleanup on failure/exit
cleanup_on_exit() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ -n "$METRO_PID" ]]; then
        log_warning "Cleaning up Metro process ($METRO_PID)..."
        kill "$METRO_PID" 2>/dev/null || true
    fi
}
trap cleanup_on_exit EXIT

# Get the simulator UDID
get_simulator_udid() {
    xcrun simctl list devices available | grep "${SIMULATOR_NAME}" | head -1 | grep -oEi '[A-F0-9-]{36}'
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
    # Graceful kill first, then force after a short wait
    local pids
    pids=$(lsof -ti:8081 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 2
        pids=$(lsof -ti:8081 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    fi
}

# Main script
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       RGR - iOS Simulator Deploy           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    # Ensure we're working from known paths
    if [[ ! -f "$PROJECT_ROOT/package.json" ]] || [[ ! -d "$MOBILE_DIR" ]]; then
        log_error "Cannot find project root at $PROJECT_ROOT"
        exit 1
    fi

    # Get simulator UDID
    log_info "Finding ${SIMULATOR_NAME} simulator..."
    SIMULATOR_UDID=$(get_simulator_udid)

    if [[ -z "$SIMULATOR_UDID" ]]; then
        log_error "Could not find '${SIMULATOR_NAME}' simulator"
        echo "Available simulators:"
        xcrun simctl list devices available | grep -i "iphone"
        echo ""
        echo "Usage: $0 [simulator-name]"
        echo "Example: $0 \"iPhone 17 Pro\""
        exit 1
    fi
    log_success "Found simulator: ${SIMULATOR_UDID}"

    # Boot simulator if not already running
    log_info "Starting simulator..."
    if is_simulator_booted "$SIMULATOR_UDID"; then
        log_success "Simulator already running"
    else
        xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
        log_success "Simulator booted"
    fi

    # Open Simulator app
    open -a Simulator

    # Build the app
    log_info "Building ${APP_NAME} for simulator..."
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

    log_success "Build completed"

    # Find the built app
    log_info "Locating built app..."
    APP_PATH=$(find "${DERIVED_DATA_PATH}" -name "${APP_NAME}.app" -type d | grep -v "\.dSYM" | head -1)

    if [[ -z "$APP_PATH" ]]; then
        log_error "Could not find built app"
        exit 1
    fi
    log_success "Found app: ${APP_PATH}"

    # Install the app
    log_info "Installing app on simulator..."
    xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
    log_success "App installed"

    # Kill existing Metro processes
    log_info "Stopping any existing Metro processes..."
    kill_metro
    sleep 1
    log_success "Metro processes stopped"

    # Clear Metro cache
    log_info "Clearing Metro cache..."
    rm -rf "$MOBILE_DIR/node_modules/.cache/metro" 2>/dev/null || true
    rm -rf /tmp/metro-* 2>/dev/null || true
    rm -rf /tmp/haste-map-* 2>/dev/null || true
    watchman watch-del-all 2>/dev/null || true
    log_success "Metro cache cleared"

    # Start Metro bundler in background
    log_info "Starting Metro bundler..."
    cd "$MOBILE_DIR"
    npx expo start --clear --localhost &
    METRO_PID=$!

    # Wait for Metro to be ready
    log_info "Waiting for Metro to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
            log_success "Metro is ready"
            break
        fi
        if [ "$i" -eq 30 ]; then
            log_warning "Metro may still be starting, continuing anyway..."
        fi
        sleep 1
    done

    # Launch the app
    log_info "Launching ${APP_NAME}..."
    xcrun simctl terminate "$SIMULATOR_UDID" "$BUNDLE_ID" 2>/dev/null || true
    sleep 1
    xcrun simctl launch "$SIMULATOR_UDID" "$BUNDLE_ID"
    log_success "App launched"

    # Deploy succeeded — don't kill Metro on exit
    trap - EXIT

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
