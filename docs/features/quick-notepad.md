# Quick Notepad Feature

## Overview
The Quick Notepad provides a simple, distraction-free text editor that can be instantly accessed via a global keyboard shortcut.

## Features
- **Global Shortcut**: Press Option+A (macOS) or Alt+A (Windows/Linux) to open/hide the notepad
- **Auto-save**: Content automatically saves 2 seconds after you stop typing
- **File Management**: Create, delete, and switch between notes via sidebar
- **Delete Notes**: Delete individual notes or all notes at once with confirmation dialogs
- **Settings Integration**: Configure custom save location in App Settings
- **State Persistence**: Notepad window preserves state when hidden/shown
- **No Default Save**: Content won't persist if save location is not configured
- **Dark Mode**: Theme synced with app settings (light/dark mode)
- **Auto-refresh**: Files and theme reload when window is shown after being hidden

## Usage

### Opening the Notepad
Press Option+A (macOS) or Alt+A (Windows/Linux) to toggle the notepad window.

### Creating a New Note
1. Click the "New Note" button in the sidebar
2. A new file is created with timestamp filename (YYYY-MM-DD-HHMMSS.txt)
3. Start typing

### Switching Between Notes
Click any note in the sidebar to switch to it. The current note is auto-saved before switching.

### Deleting Notes
- **Delete a single note**: Hover over a note in the sidebar and click the trash icon that appears. Confirm the deletion in the dialog.
- **Delete all notes**: Click the "Delete All" button in the sidebar header. Confirm the deletion in the dialog.
- After deleting the current note, the app automatically switches to the most recent note or creates a new one if no notes remain.

### Setting Save Location
1. Open App Settings (click "Settings" button in header)
2. Find "Notepad Save Location"
3. Click "Browse..." to select a folder
4. Location is saved to app settings

## Architecture

### Main Process
- **`src/main/notepad-management.ts`**: File operations and IPC handlers
- **`src/main/notepad-window.ts`**: Window lifecycle and global shortcut

### Preload
- **`src/preload/notepad-management.ts`**: IPC bridge for notepad operations

### Renderer API
- **`src/api/notepad-management.ts`**: Type-safe API wrapper

### UI Components
- **`src/components/notepad-window.ts`**: Main notepad Web Component with theme sync
- **`src/components/settings-dialog.ts`**: Settings dialog with notepad configuration

### Theme Integration
The notepad window syncs with the app's theme settings:
- Loads theme preference from `settings.json` on startup
- Applies `dark` class to document element when dark mode is active
- Uses the same Tailwind `dark:` prefixed utilities as the main app
- Theme changes in main app don't affect open notepad window (requires reopen)

### IPC Channels
- `notepad:getFiles` - Get list of notepad files
- `notepad:readFile` - Read file content
- `notepad:createFile` - Create new file
- `notepad:saveContent` - Save file content
- `notepad:deleteFile` - Delete file (supports single file deletion)
- `notepad:windowShown` - One-way IPC event sent when window is shown (triggers file/theme refresh)

## Window Refresh Behavior
- **Trigger**: BrowserWindow `show` event fires when window becomes visible
- **Main Process**: Sends `notepad:windowShown` IPC message to renderer
- **Renderer**: Listens for event and reloads:
  - Theme preference (syncs with main app settings)
  - File list (reflects external changes)
  - Current file content
- **Benefit**: Changes made outside the notepad (new files, theme changes) are visible on reopen

## File Storage
- Default behavior: No save location configured by default
- Custom location: Configured in App Settings
- File format: Plain text (.txt)
- Naming: Timestamp format (YYYY-MM-DD-HHMMSS.txt)
- Files are sorted by modification date (newest first)

## Auto-save Behavior
- Debounce interval: 2 seconds
- Triggers: On textarea input event
- Status indicator: Shows "Saving...", "Saved", "Unsaved", or "Error saving"
- Errors: Toast notification displayed, content kept in memory
- No location configured: Shows message "Not configured" in status

## Edge Cases Handled

### No Save Location Configured
- Sidebar shows message: "Please configure save location in Settings"
- "New Note" button is disabled
- Status shows "Not configured"
- Textarea shows message: "Please configure notepad save location in App Settings"

### Save Errors
- Toast notification: "Failed to save note"
- Status shows "Error saving"
- Content kept in memory (not discarded)
- User can continue typing

### Multiple Shortcut Activations
- Toggle logic: If window visible, hide; if hidden, show
- No window creation on repeat activations (use existing window)
- Focus window if already visible (bring to front)

### Empty File List
- Shows message: "No notes yet. Click 'New Note' to create one."
- Focus textarea for immediate typing

### Large File Content
- Textarea handles large content reasonably well (native browser behavior)

## Security Considerations

### Path Validation
- Save location must exist and be accessible
- No path traversal protection currently implemented (future enhancement)
- Only saves files within configured save location

### Content Sanitization
- Plain textarea (no HTML rendering)
- HTML escaped when displaying file names (XSS prevention)
- Never renders user content as HTML

### File System Access
- Only accesses files within configured save location
- No arbitrary file access

## Performance Considerations

### File Loading
- Lazy load file content when user switches to it
- Only current file kept in memory

### File List Rendering
- Simple rendering (no virtual scrolling for now)
- Efficient for typical use cases (< 100 files)

### Auto-save Debounce
- 2-second debounce prevents excessive writes
- Only saves if content changed

### Window Management
- Reuse window instance (show/hide pattern)
- Preserves state (scroll position, cursor position, content)
- Lower overhead than create/destroy cycle

