# Project Panel and Detail Panel

## Project Panel (Left Sidebar)

The project panel is a collapsible left sidebar (264px wide when expanded) that manages local folder projects.

### Features

- **Add projects** - Opens native folder picker dialog via `openFolderDialog()`
- **Remove projects** - Removes project from storage with confirmation
- **Select projects** - Clicking a project emits `project-selected` event
- **Collapsible** - Toggle button expands/collapses the panel

### Project Data

Each project contains:
- `path` - Absolute path to project folder
- `name` - Folder name
- `addedAt` - Timestamp when added

### Event Flow

1. User clicks project in `project-panel`
2. Emits `project-selected` event (bubbles, composed)
3. `app-container` catches event and forwards to:
   - `project-agent-dashboard` - Loads agents via IPC
   - `project-detail-panel` - Loads file tree via IPC

## Project Detail Panel (Right Sidebar)

The project detail panel is a collapsible right sidebar (264px wide when expanded) that displays the structure of selected project folders.

### File Tree Features

- **Recursive directory tree** - Shows all files and folders in project hierarchy
- **Expand/collapse folders** - Click directory nodes to toggle visibility
- **Visual distinction** - Blue folder icons, gray file icons for easy identification
- **Hidden file filtering** - Automatically excludes files starting with '.'
- **Alphabetical sorting** - Directories first, then files, both sorted A-Z
- **16px indentation** - Visual hierarchy with proper nesting levels
- **Empty state handling** - Graceful handling for no project selected or empty folders
- **Panel toggle** - Collapse/expand with smooth transitions

### File Tree UI

- Hierarchical tree view with folder/file icons
- Chevron indicators for expandable directories
- Hover effects on tree nodes
- Item count display
- Responsive panel width (264px when expanded, 0px when collapsed)

### File Tree Data Flow

1. User selects project in `project-panel`
2. `project-selected` event forwarded to `project-detail-panel`
3. `project-detail-panel.handleProjectSelected()` calls `getFileTree()` IPC method
4. Project management module reads folder contents recursively via `buildFileTree()` helper
5. File tree returned with `FileTreeNode[]` array structure
6. Component renders tree recursively with `renderTreeNode()` method
7. User interacts with tree via click events to expand/collapse directories

### File Tree Implementation

**Helpers in `src/main/project-management.ts`:**
- `buildFileTree(dirPath, options, currentDepth)` - Recursive helper to build file tree
- `isHidden(name)` - Filters files starting with '.'
- `listFilesRecursive(dirPath, options, currentDepth)` - Lists files for @mention tagging

**Component methods in `src/components/project-detail-panel.ts`:**
- `renderTreeNode(node, depth)` - Recursive rendering with proper indentation
- `toggleDirectory(path)` - Manages expanded/collapsed state via `Set<string>`
- `escapeHtml(text)` - XSS prevention for all file/folder names

### Security

- All file names and folder names escaped via `escapeHtml()` to prevent XSS
- File system operations wrapped in try-catch for graceful error handling
- Permission errors logged as warnings, don't crash the app
- Hidden files filtered by default to reduce clutter

## Related Files

- `src/components/project-panel.ts` - Project sidebar UI
- `src/components/project-detail-panel.ts` - File tree UI
- `src/main/project-management.ts` - File tree helpers and IPC handlers
- IPC channel: `project:getFileTree`
