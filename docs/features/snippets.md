# Snippets Feature

## Overview
The Snippets feature provides a quick way to store and access text snippets via a global keyboard shortcut, with keyboard navigation for rapid copying to clipboard.

## Features
- **Global Shortcut**: Press Option+S (macOS) or Alt+S (Windows/Linux) to open/hide snippets
- **Auto-save**: Content automatically saves 500ms after you stop typing
- **Inline Name Editing**: Double-click snippet names to rename them in-place
- **Keyboard Navigation**: Use arrow keys to navigate snippets, Enter to copy and close
- **Clipboard Integration**: Press Enter on selected snippet to copy content and close window
- **Delete Confirmation**: Confirms before deleting snippets
- **User-Provided Names**: Snippets use meaningful names provided by the user (not timestamps)
- **Settings Integration**: Configure custom save location in App Settings
- **State Persistence**: Snippet window preserves state when hidden/shown
- **No Default Save**: Content won't persist if save location is not configured
- **Dark Mode**: Theme synced with app settings (light/dark mode)
- **Conflict Handling**: Appends counter (2), (3), etc. if name already exists

## Usage

### Opening the Snippets Window
Press Option+S (macOS) or Alt+S (Windows/Linux) to toggle the snippets window.

### Creating a New Snippet
1. Click the "+" button in the sidebar header
2. A new snippet is created with default name "New Snippet"
3. Start typing content in the textarea
4. Content auto-saves after 500ms of inactivity

### Renaming Snippets
1. Double-click the snippet name in the sidebar
2. Edit the name in-place
3. Press Enter or click away to save
4. Press Escape to cancel
5. Name auto-saves after 500ms

### Navigating Snippets with Keyboard
- **Arrow Down**: Select next snippet
- **Arrow Up**: Select previous snippet
- **Enter**: Copy selected snippet content to clipboard and close window

### Copying Snippet Content
1. Select a snippet by clicking it or using arrow keys
2. Press Enter to copy content to clipboard
3. Window closes automatically after copying

### Deleting Snippets
1. Hover over a snippet in the sidebar
2. Click the trash icon that appears
3. Confirm deletion in the dialog
4. If deleting the current snippet, automatically switches to another snippet

### Setting Save Location
1. Open App Settings (click "Settings" button in header)
2. Find "Snippet Save Location"
3. Click "Browse..." to select a folder
4. Location is saved to app settings

## Architecture

### Main Process
- **`src/main/snippet-management.ts`**: File operations and IPC handlers
  - Name sanitization for filesystem safety
  - Conflict detection with auto-incrementing counters
  - Direct rename when possible, copy+delete when needed
- **`src/main/snippet-window.ts`**: Window lifecycle and global shortcut
  - Error dialog when save location not configured

### Preload
- **`src/preload/snippet-management.ts`**: IPC bridge for snippet operations

### Renderer API
- **`src/api/snippet-management.ts`**: Type-safe API wrapper

### UI Components
- **`src/components/snippet-window.ts`**: Main snippets Web Component with:
  - Inline name editing
  - Keyboard navigation
  - Clipboard operations
  - Auto-save with debounce
  - Per-snippet timeout handling for edits

### IPC Channels
- `snippets:getFiles` - Get list of snippet files
- `snippets:readFile` - Read file content
- `snippets:createFile` - Create new file with user-provided name
- `snippets:saveContent` - Save file content
- `snippets:renameFile` - Rename file (handles conflicts)
- `snippets:deleteFile` - Delete file
- `snippets:closeWindow` - Close snippet window

## File Storage
- Default behavior: No save location configured by default
- Custom location: Configured in App Settings
- File format: Plain text (.txt)
- Naming: User-provided names
- Sorting: Alphabetical by name
- Name sanitization: Removes `<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`
- Conflict handling: Appends counter (2), (3), etc. if name exists

## Rename Behavior
- **Direct rename**: If target name doesn't exist, uses `fs.renameSync()` (efficient)
- **Conflict rename**: If target exists and is different file, uses counter suffix
- **Source exclusion**: When renaming "foo.txt" to "bar.txt", "bar.txt" existing check excludes "foo.txt"
- **Content preserved**: Content is preserved during rename operations

## Auto-save Behavior
- Debounce interval: 500ms (content and names)
- Triggers: On textarea input and name input blur
- Status indicator: Shows "Saving...", "Saved", "Unsaved", or "Error saving"
- Errors: Toast notification displayed, content kept in memory
- No location configured: Shows error dialog when opening window

## Keyboard Navigation
- Arrow keys navigate snippet list
- Enter copies content to clipboard and closes window
- Keyboard shortcuts disabled when editing content or names
- Visual feedback: Selected snippet highlighted with blue background

## Edge Cases Handled

### No Save Location Configured
- Shows error dialog: "Snippet Save Location Not Configured"
- Dialog message: "Please configure the snippet save location in Settings before using snippets."
- Window doesn't open until location is configured

### Save Errors
- Toast notification: "Failed to save snippet"
- Status shows "Error saving"
- Content kept in memory (not discarded)
- User can continue typing

### Name Conflicts
- Auto-appends counter: (2), (3), etc.
- Example: "API Key" → "API Key (2)" if "API Key" exists
- Per-snippet edit timeouts prevent cross-snippet interference

### Empty File List
- Shows message: "No snippets yet. Click + to create one."
- No content area shown

### Large File Content
- Textarea handles large content reasonably well (native browser behavior)

### Rapid Name Editing
- Per-snippet timeout tracking using Map
- Editing one snippet doesn't interfere with another
- Each snippet has independent debounce timer

## Security Considerations

### Path Validation
- Save location must exist and be accessible
- Only saves files within configured save location
- No arbitrary file access

### Content Sanitization
- Plain textarea (no HTML rendering)
- HTML escaped when displaying snippet names (XSS prevention)
- Never renders user content as HTML

### Name Sanitization
- Removes invalid filesystem characters
- Prevents path traversal attacks
- Ensures valid filenames on all platforms

## Performance Considerations

### File Loading
- All snippets loaded on window open
- Content kept in memory for fast switching
- Updated in memory after save

### File List Rendering
- Simple rendering (no virtual scrolling for now)
- Efficient for typical use cases (< 100 snippets)

### Auto-save Debounce
- 500ms debounce prevents excessive writes
- Per-snippet timeout handling for name edits
- Only saves if content changed

### Window Management
- Reuse window instance (show/hide pattern)
- Preserves state (scroll position, cursor position, content)
- Lower overhead than create/destroy cycle

## Differences from Quick Notepad

| Feature | Quick Notepad | Snippets |
|---------|---------------|----------|
| Shortcut | Option+A | Option+S |
| File Naming | Timestamp (auto) | User-provided |
| Auto-save Debounce | 2 seconds | 500ms |
| Rename | Not supported | Inline editing |
| Keyboard Navigation | Not supported | Arrow keys + Enter |
| Clipboard | Not integrated | Enter to copy |
| File Sorting | Modification date | Alphabetical |
| Delete | Single + Delete All | Single only |
