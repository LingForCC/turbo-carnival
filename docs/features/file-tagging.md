# File Tagging in Chat

The app allows users to tag .txt and .md files from the project folder to include them as context in AI conversations.

## File Tagging Features

- **@mention trigger** - Type `@` in chat input to open autocomplete dropdown
- **File filtering** - Type after `@` to filter files by name
- **Keyboard navigation** - Arrow keys to navigate, Enter to select, Escape to close
- **Visual feedback** - Blue tag badges show attached files with file icons
- **Easy removal** - X button on each tag or "Clear all" button
- **Session persistence** - Tagged files persist across messages in same conversation
- **Agent switching** - Tagged files cleared when switching agents

## File Tagging UI

- Autocomplete dropdown positioned above chat input
- File list shows all .txt and .md files from project (recursive, max 10 levels deep)
- Hidden files excluded by default
- File badges display file name and extension
- Hover effects on autocomplete options
- Selected file highlighted in autocomplete

## File Tagging Data Flow

1. User types `@` in chat input
2. `handleTextareaInput()` detects `@` and shows autocomplete
3. `loadAvailableFiles()` fetches all .txt/.md files via IPC (`files:list`)
4. User selects file from dropdown (click or Enter key)
5. `selectFileForTagging()` adds file to `taggedFiles` array, removes `@` from input
6. When sending message, file paths passed to IPC
7. Main process reads file contents via `files:readContents` and includes as system messages
8. Tagged files persist for conversation until manually removed or agent switched

## File Content Inclusion

- Full file content included as system message with format: `[File: filename]\n{content}`
- Multiple files included as separate system messages
- File contents read at send time, not cached
- Errors reading files logged but don't block message sending
- No size limits on tagged files

## File Tagging State

The `chat-panel` component maintains:
- `taggedFiles` - Array of currently tagged files `{ name, path }`
- `availableFiles` - All .txt/.md files in project `{ name, path, extension }`
- `showAutocomplete` - Whether dropdown is visible
- `autocompleteQuery` - Current filter text after `@`
- `autocompleteIndex` - Selected index for keyboard navigation

## Security

- All file names escaped via `escapeHtml()` before rendering
- File paths in data attributes also escaped
- File system operations wrapped in try-catch
- Only .txt and .md files can be tagged (configurable)

## Related Files

- `src/components/chat-panel.ts` - File tagging UI and state management
- `src/main/project-management.ts` - `listFilesRecursive()` helper for file listing
- IPC channels: `files:list`, `files:readContents`
