#!/bin/bash
# Wrapper script to launch Electron with custom environment variables for testing
# Gets the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export TURBO_CARNIVAL_TEST_DATA_DIR="$SCRIPT_DIR/test-user-data"
exec "$SCRIPT_DIR/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" "$@"
