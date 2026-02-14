# Clipboard History Feature

## Overview

The Clipboard History feature provides automatic monitoring and storage of clipboard content (text and images) with a global shortcut to access the history. Users can view, preview, and delete clipboard items through a dedicated window.

## Global Shortcut

- **macOS**: `Cmd+Shift+V`
- **Windows/Linux**: `Ctrl+Shift+V`

## Features

### Auto-Monitoring

- Automatically captures clipboard content when the user copies text or images
- Polling-based monitoring (500ms interval)
- Content hash comparison to detect changes and avoid duplicates
- Minimum content length filter (3 characters for text) to avoid saving very short snippets

### Supported Content Types

- **Text**: Saved as UUID-named `.txt` files
- **Images**: Saved as timestamp-named files with original extension (png, jpg, jpeg, gif, bmp, webp)

### History Window

- **Left sidebar**: List of clipboard items with preview (first 50 characters for text, filename for images)
- **Right panel**: Content preview (readonly textarea for text, image display for images)
- **Delete**: Individual item deletion with X button
- **Clear All**: Remove all items at once (with confirmation)

### Settings Integration

- Configurable save location in Settings dialog
- Error message displayed if save location not configured
- Settings path: `App Settings > Clipboard History Save Location`

## Architecture

### Main Process Modules

1. **clipboard-watcher.ts**
   - Polling-based clipboard monitoring
   - Content hash comparison (MD5)
   - Auto-save text and images to configured location
   - Start/stop lifecycle management

2. **clipboard-history-management.ts**
   - File operations (list, delete, clear)
   - Content retrieval (text content, image data URL)
   - IPC handler registration

3. **clipboard-history-window.ts**
   - Window lifecycle management (singleton pattern)
   - Global shortcut registration
   - Settings validation

### Renderer Components

1. **clipboard-history-window.ts**
   - Web Component for clipboard history UI
   - Two-panel layout (list + preview)
   - Dark mode support

### IPC Channels

- `clipboard-history:getItems` - Get all clipboard history items
- `clipboard-history:deleteItem` - Delete a specific item
- `clipboard-history:clearAll` - Clear all items
- `clipboard-history:getTextContent` - Get text content for an item
- `clipboard-history:getImageData` - Get image data as base64 URL
- `clipboard-history:closeWindow` - Close the window
- `clipboard-history:windowShown` - Window shown event (one-way IPC from main to renderer, triggers list refresh)

### Type Definitions

```typescript
interface ClipboardHistoryItem {
  id: string;
  type: 'text' | 'image';
  fileName: string;
  preview: string;
  modifiedAt: number;
}

interface ClipboardHistoryManagementAPI {
  getClipboardHistoryItems(): Promise<ClipboardHistoryItem[]>;
  deleteClipboardHistoryItem(id: string): Promise<void>;
  clearClipboardHistory(): Promise<void>;
  getTextContent(id: string): Promise<string>;
  getImageData(id: string): Promise<string>;
  closeClipboardHistoryWindow(): void;
}
```

## File Storage

### Text Files
- Format: `{UUID}.txt`
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.txt`

### Image Files
- Format: `{timestamp}.{extension}`
- Example: `1703123456789.png`

### Preview Generation
- Text: First 50 characters, newlines replaced with spaces
- Images: Filename displayed

## Error Handling

- `CLIPBOARD_NO_LOCATION` error when save location not configured
- Error dialog shown when attempting to open window without configuration
- Graceful handling of file read/write errors

## Dark Mode

The clipboard history window supports dark mode:
- Synced with app settings
- Applied on window load via `loadTheme()` and `applyTheme()`

## Usage

1. Configure clipboard history save location in Settings
2. Copy text or images - they are automatically saved
3. Press `Cmd+Shift+V` (macOS) or `Ctrl+Shift+V` (Windows/Linux) to open history
4. Click on items to preview
5. Use X button to delete individual items
6. Use trash icon in header to clear all
