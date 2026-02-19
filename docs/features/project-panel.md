# Project Panel and Detail Panel

## Project Panel (Left Sidebar)

The project panel is a collapsible left sidebar (264px wide when expanded) that displays projects as subfolders of a configured project folder.

### Features

- **Folder-based projects** - Projects are automatically loaded from a "Project Folder" configured in Settings > General
- **Auto-detection** - All immediate subfolders of the project folder appear as projects
- **Real-time updates** - Folder watcher detects add/remove/rename of subfolders and updates the list automatically
- **Select projects** - Clicking a project emits `project-selected` event
- **Collapsible** - Toggle button expands/collapses the panel
- **Scrollable list** - Always-visible scrollbar (8px wide) when projects exceed panel height, with dark mode support

### Project Loading

Projects are loaded dynamically from the configured project folder:

1. User configures a "Project Folder" in Settings > General
2. App reads all immediate subfolders of that folder
3. Each subfolder becomes a project (hidden folders starting with `.` are excluded)
4. Projects are sorted alphabetically by name
5. Folder watcher monitors for changes and sends `projects:changed` IPC event

### Project Data

Each project contains:
- `path` - Absolute path to project folder
- `name` - Folder name
- `addedAt` - Folder modification timestamp (used for sorting)

### Event Flow

1. User clicks project in `project-panel`
2. Emits `project-selected` event (bubbles, composed)
3. `app-container` catches event and forwards to:
   - `project-agent-dashboard` - Loads agents via IPC
   - `project-detail-panel` - Loads file tree via IPC

### Folder Watcher

The `project-folder-watcher.ts` module monitors the project folder for changes:

- Uses Node's `fs.watch` with `recursive: false` (only immediate children)
- Debounces rapid changes (500ms) to avoid excessive updates
- Sends `projects:changed` IPC event to renderer when subfolders change
- Handles errors gracefully (folder deleted, permissions issues)

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

**Helpers in `src/project/main/project-management.ts`:**
- `loadProjectsFromFolder(projectFolder)` - Loads immediate subfolders as projects
- `buildFileTree(dirPath, options, currentDepth)` - Recursive helper to build file tree
- `isHidden(name)` - Filters files starting with '.'
- `listFilesRecursive(dirPath, options, currentDepth)` - Lists files for @mention tagging

**Component methods in `src/project/components/project-detail-panel.ts`:**
- `renderTreeNode(node, depth)` - Recursive rendering with proper indentation
- `toggleDirectory(path)` - Manages expanded/collapsed state via `Set<string>`
- `escapeHtml(text)` - XSS prevention for all file/folder names

### Security

- All file names and folder names escaped via `escapeHtml()` to prevent XSS
- File system operations wrapped in try-catch for graceful error handling
- Permission errors logged as warnings, don't crash the app
- Hidden files filtered by default to reduce clutter

## Related Files

- `src/project/components/project-panel.ts` - Project sidebar UI
- `src/project/components/project-detail-panel.ts` - File tree UI
- `src/project/main/project-management.ts` - Project loading, file tree helpers, and IPC handlers
- `src/project/main/project-folder-watcher.ts` - Folder watching for real-time updates
- IPC channels: `projects:get`, `projects:refresh`, `projects:changed` (event), `project:getFileTree`
