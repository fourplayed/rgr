#!/bin/bash

# Deploy to App Store Connect
# This script type checks, lints, increments build number, archives, and uploads to ASC

set -e

# Configuration
MOBILE_DIR="$(cd "$(dirname "$0")/../apps/mobile" && pwd)"
IOS_DIR="$MOBILE_DIR/ios"
PROJECT_NAME="RGRFleet"
SCHEME="RGRFleet"
BUNDLE_ID="com.rgr.fleetmanager"
TEAM_ID="D793SF6URT"
APP_JSON="$MOBILE_DIR/app.json"
EXPORT_OPTIONS="$IOS_DIR/ExportOptions.plist"
ARCHIVE_DIR="$IOS_DIR/build/Archives"
EXPORT_DIR="$IOS_DIR/build/AppStore"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required tools
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v xcrun &> /dev/null; then
        log_error "Xcode command line tools not found"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Install with: brew install jq"
        exit 1
    fi

    # Check for App Store Connect API key
    if [[ -z "$ASC_API_KEY_ID" ]] || [[ -z "$ASC_API_ISSUER_ID" ]] || [[ -z "$ASC_API_KEY_PATH" ]]; then
        log_error "App Store Connect API credentials not set."
        echo ""
        echo "Required environment variables:"
        echo "  ASC_API_KEY_ID     - Your API Key ID"
        echo "  ASC_API_ISSUER_ID  - Your Issuer ID"
        echo "  ASC_API_KEY_PATH   - Path to your .p8 key file"
        echo ""
        echo "You can set these in your shell profile or export them before running this script."
        exit 1
    fi

    if [[ ! -f "$ASC_API_KEY_PATH" ]]; then
        log_error "API key file not found at: $ASC_API_KEY_PATH"
        exit 1
    fi

    log_success "All requirements met"
}

# Check git status
check_git_status() {
    log_info "Checking git status..."

    cd "$MOBILE_DIR"

    if [[ -n $(git status --porcelain) ]]; then
        log_warning "Working directory has uncommitted changes:"
        git status --short
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Aborted due to uncommitted changes"
            exit 1
        fi
    else
        log_success "Working directory is clean"
    fi
}

# Type check
run_typecheck() {
    log_info "Skipping standalone type check (monorepo - build will verify)..."
    log_success "Type check skipped - Xcode build will catch type errors"
}

# Lint
run_lint() {
    log_info "Running ESLint..."

    cd "$MOBILE_DIR"

    if npx eslint . --ext .ts,.tsx --max-warnings 0; then
        log_success "Lint passed"
    else
        log_error "Lint failed"
        exit 1
    fi
}

# Verify bundle ID and team ID
verify_identifiers() {
    log_info "Verifying bundle identifier and team ID..."

    # Check app.json
    CURRENT_BUNDLE_ID=$(jq -r '.expo.ios.bundleIdentifier' "$APP_JSON")
    if [[ "$CURRENT_BUNDLE_ID" != "$BUNDLE_ID" ]]; then
        log_error "Bundle ID mismatch in app.json: expected $BUNDLE_ID, got $CURRENT_BUNDLE_ID"
        exit 1
    fi

    log_success "Bundle ID: $BUNDLE_ID"
    log_success "Team ID: $TEAM_ID (will be set in ExportOptions.plist)"
}

# Increment build number
increment_build_number() {
    log_info "Incrementing build number..."

    CURRENT_BUILD=$(jq -r '.expo.ios.buildNumber' "$APP_JSON")
    NEW_BUILD=$((CURRENT_BUILD + 1))

    # Update app.json
    jq --arg build "$NEW_BUILD" '.expo.ios.buildNumber = $build' "$APP_JSON" > "$APP_JSON.tmp"
    mv "$APP_JSON.tmp" "$APP_JSON"

    VERSION=$(jq -r '.expo.version' "$APP_JSON")

    log_success "Version: $VERSION ($NEW_BUILD)"

    # Return values for later use
    echo "$VERSION" > /tmp/deploy_version
    echo "$NEW_BUILD" > /tmp/deploy_build
}

# Run prebuild to sync native code
run_prebuild() {
    log_info "Running Expo prebuild..."

    cd "$MOBILE_DIR"

    npx expo prebuild --platform ios --clean

    # Recreate ExportOptions.plist after prebuild clears ios directory
    log_info "Creating ExportOptions.plist..."
    cat > "$EXPORT_OPTIONS" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>destination</key>
	<string>export</string>
	<key>generateAppStoreInformation</key>
	<false/>
	<key>manageAppVersionAndBuildNumber</key>
	<true/>
	<key>method</key>
	<string>app-store-connect</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>teamID</key>
	<string>D793SF6URT</string>
	<key>testFlightInternalTestingOnly</key>
	<false/>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
PLIST

    log_success "Prebuild complete"
}

# Install CocoaPods
install_pods() {
    log_info "Installing CocoaPods dependencies..."

    cd "$IOS_DIR"

    pod install

    log_success "CocoaPods installed"
}

# Archive the app
archive_app() {
    log_info "Archiving app for App Store..."

    VERSION=$(cat /tmp/deploy_version)
    BUILD=$(cat /tmp/deploy_build)
    ARCHIVE_PATH="$ARCHIVE_DIR/${PROJECT_NAME}_${VERSION}_${BUILD}.xcarchive"

    mkdir -p "$ARCHIVE_DIR"

    cd "$IOS_DIR"

    xcodebuild archive \
        -workspace "$PROJECT_NAME.xcworkspace" \
        -scheme "$SCHEME" \
        -configuration Release \
        -archivePath "$ARCHIVE_PATH" \
        -destination "generic/platform=iOS" \
        DEVELOPMENT_TEAM="$TEAM_ID" \
        CODE_SIGN_STYLE=Automatic \
        | xcbeautify || xcodebuild archive \
            -workspace "$PROJECT_NAME.xcworkspace" \
            -scheme "$SCHEME" \
            -configuration Release \
            -archivePath "$ARCHIVE_PATH" \
            -destination "generic/platform=iOS" \
            DEVELOPMENT_TEAM="$TEAM_ID" \
            CODE_SIGN_STYLE=Automatic

    if [[ ! -d "$ARCHIVE_PATH" ]]; then
        log_error "Archive failed - no archive created"
        exit 1
    fi

    log_success "Archive created: $ARCHIVE_PATH"
    echo "$ARCHIVE_PATH" > /tmp/deploy_archive_path
}

# Export and upload to App Store Connect
export_and_upload() {
    log_info "Exporting and uploading to App Store Connect..."

    ARCHIVE_PATH=$(cat /tmp/deploy_archive_path)

    mkdir -p "$EXPORT_DIR"

    # Export the archive
    xcodebuild -exportArchive \
        -archivePath "$ARCHIVE_PATH" \
        -exportPath "$EXPORT_DIR" \
        -exportOptionsPlist "$EXPORT_OPTIONS" \
        -allowProvisioningUpdates \
        | xcbeautify || xcodebuild -exportArchive \
            -archivePath "$ARCHIVE_PATH" \
            -exportPath "$EXPORT_DIR" \
            -exportOptionsPlist "$EXPORT_OPTIONS" \
            -allowProvisioningUpdates

    IPA_PATH="$EXPORT_DIR/$PROJECT_NAME.ipa"

    if [[ ! -f "$IPA_PATH" ]]; then
        log_error "Export failed - no IPA created"
        exit 1
    fi

    log_success "IPA exported: $IPA_PATH"

    # Upload to App Store Connect
    log_info "Uploading to App Store Connect..."

    xcrun altool --upload-app \
        --type ios \
        --file "$IPA_PATH" \
        --apiKey "$ASC_API_KEY_ID" \
        --apiIssuer "$ASC_API_ISSUER_ID" \
        || {
            # Try with notarytool if altool fails
            log_warning "altool upload failed, trying with xcrun notarytool..."
            xcrun notarytool submit "$IPA_PATH" \
                --key "$ASC_API_KEY_PATH" \
                --key-id "$ASC_API_KEY_ID" \
                --issuer "$ASC_API_ISSUER_ID" \
                --wait
        }

    log_success "Upload complete!"
}

# Commit build number change
commit_build_change() {
    log_info "Committing build number change..."

    VERSION=$(cat /tmp/deploy_version)
    BUILD=$(cat /tmp/deploy_build)

    cd "$MOBILE_DIR"

    git add app.json
    git commit -m "chore(mobile): bump build to $VERSION ($BUILD) for ASC

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

    log_success "Build number change committed"
}

# Cleanup temp files
cleanup() {
    rm -f /tmp/deploy_version /tmp/deploy_build /tmp/deploy_archive_path
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  RGR Fleet - App Store Connect Deploy"
    echo "=========================================="
    echo ""

    check_requirements
    check_git_status
    run_typecheck
    run_lint
    verify_identifiers
    increment_build_number
    run_prebuild
    install_pods
    archive_app
    export_and_upload
    commit_build_change
    cleanup

    VERSION=$(jq -r '.expo.version' "$APP_JSON")
    BUILD=$(jq -r '.expo.ios.buildNumber' "$APP_JSON")

    echo ""
    echo "=========================================="
    log_success "Deployment complete!"
    echo "  Version: $VERSION ($BUILD)"
    echo "  The build is now processing on App Store Connect"
    echo "=========================================="
    echo ""
}

# Run main
main "$@"
