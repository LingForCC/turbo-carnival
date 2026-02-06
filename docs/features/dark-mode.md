# Dark Mode

## Overview

Turbo Carnival supports dark mode theming using Tailwind CSS v4 with class-based dark mode. Users can toggle between light and dark themes via the Settings dialog. The theme preference persists across app restarts.

## Architecture

### Settings Management

- **Storage**: `settings.json` in userData directory
- **Module**: `src/main/settings-management.ts`
- **IPC Channels**: `settings:get`, `settings:update`
- **Type**: `AppSettings` interface with `theme` property

```typescript
export interface AppSettings {
  theme: 'light' | 'dark';
}
```

### Tailwind Configuration

Dark mode uses the `class` strategy (not media queries). When dark mode is active:
- The `<html>` element receives the `dark` class
- All `dark:` prefixed Tailwind utilities are applied

The configuration is in `src/styles.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

### Theme Toggle

Located in the Settings dialog (`src/components/settings-dialog.ts`):
- Radio buttons for Light/Dark theme selection
- Theme changes are applied immediately to the DOM
- Changes persist to `settings.json`
- On app startup, `app-container` loads and applies the saved theme via `loadTheme()`

## Color Palette

When applying dark mode to components, follow this color mapping:

### Background Colors
| Light | Dark | Usage |
|-------|------|-------|
| `bg-white` | `dark:bg-gray-900` | Main panels |
| `bg-gray-50` | `dark:bg-gray-800` | Secondary backgrounds |
| `bg-gray-100` | `dark:bg-gray-950` | Main background |
| `bg-blue-50` | `dark:bg-blue-900/30` | Selected state |

### Text Colors
| Light | Dark | Usage |
|-------|------|-------|
| `text-gray-700` | `dark:text-gray-300` | Primary text |
| `text-gray-600` | `dark:text-gray-400` | Secondary text |
| `text-gray-400` | `dark:text-gray-500` | Disabled/hints |
| `text-gray-800` | `dark:text-gray-200` | Headers |
| `text-blue-700` | `dark:text-blue-300` | Selected text |

### Border Colors
| Light | Dark | Usage |
|-------|------|-------|
| `border-gray-200` | `dark:border-gray-700` | Panel borders |

### Button Colors
| Light | Dark | Usage |
|-------|------|-------|
| `bg-blue-500` | `dark:bg-blue-600` | Primary buttons |
| `hover:bg-blue-600` | `dark:hover:bg-blue-700` | Primary button hover |
| `hover:bg-gray-100` | `dark:hover:bg-gray-800` | Secondary button hover |
| `bg-red-100` | `dark:bg-red-900/30` | Delete button hover |
| `hover:text-red-500` | `dark:hover:text-red-400` | Delete button text |

## Component Migration Guide

When adding dark mode to a component:

1. **Identify all color classes** in the component
2. **Apply the color mapping** from the table above
3. **Test both themes** by toggling the theme button

### Example: project-panel.ts

```typescript
// Before (light mode only)
<div class="bg-white border-r border-gray-200">
  <h2 class="text-gray-700">Projects</h2>
</div>

// After (with dark mode)
<div class="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
  <h2 class="text-gray-700 dark:text-gray-300">Projects</h2>
</div>
```

## Currently Implemented Components

- ✅ `project-panel` - Left sidebar with project list (src/components/project-panel.ts)
- ✅ `app-container` - Root layout with theme loading on startup (src/components/app-container.ts)
- ✅ `settings-dialog` - Theme selection UI and theme application (src/components/settings-dialog.ts)
- ✅ `project-agent-dashboard` - Center area with agent list (src/components/project-agent-dashboard.ts)
- ✅ `chat-panel` - Right sidebar chat interface (src/components/chat-panel.ts)
- ✅ `conversation-panel` - Reusable chat interface (src/components/conversation-panel.ts)
- ✅ `app-panel` - Split-panel interface for App-type agents (src/components/app-panel.ts)
- ✅ `project-detail-panel` - File tree (src/components/project-detail-panel.ts)
- ✅ `agent-form-dialog` - Agent creation/editing dialog (src/components/agent-form-dialog.ts)
- ✅ `provider-dialog` - LLM provider management dialog (src/components/provider-dialog.ts)
- ✅ `model-config-dialog` - Model configuration management dialog (src/components/model-config-dialog.ts)
- ✅ `tools-dialog` - Custom tools management dialog (src/components/tools-dialog.ts)
- ✅ `tool-test-dialog` - Tool execution testing dialog (src/components/tool-test-dialog.ts)
- ✅ `notepad-window` - Quick notepad with theme sync (src/components/notepad-window.ts)

## Implementation Details

### Main Process (src/main/settings-management.ts)

```typescript
// Load settings with defaults
export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return data.settings || { theme: 'light' };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return { theme: 'light' };
    }
  }
  return { theme: 'light' };
}

// Update settings (partial updates supported)
export function updateSettingsFields(updates: Partial<AppSettings>): AppSettings {
  const currentSettings = loadSettings();
  const newSettings = { ...currentSettings, ...updates };
  saveSettings(newSettings);
  return newSettings;
}
```

### Renderer Process

#### App Container (src/components/app-container.ts)

Loads and applies the theme on app startup:

```typescript
// Load theme on mount
private async loadTheme(): Promise<void> {
  try {
    const settings = await this.settingsAPI.getSettings();
    this.currentTheme = settings.theme === 'dark' ? 'dark' : 'light';
    this.applyTheme();
  } catch (error) {
    console.error('Failed to load theme:', error);
  }
}

// Apply theme to DOM
private applyTheme(): void {
  const htmlElement = document.documentElement;
  if (this.currentTheme === 'dark') {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }
}
```

#### Settings Dialog (src/components/settings-dialog.ts)

Provides theme selection UI and applies theme changes:

```typescript
// Handle theme change from user interaction
private async handleThemeChange(newTheme: string): Promise<void> {
  const theme = newTheme === 'dark' ? 'dark' : 'light';

  if (theme === this.currentTheme) {
    return; // No change
  }

  try {
    // Update settings
    await this.api.updateSettings({ theme });
    this.currentTheme = theme;

    // Apply theme immediately to DOM
    this.applyTheme();
  } catch (error) {
    console.error('Failed to update theme:', error);
    // Revert the radio selection if update failed
    const radio = this.querySelector(`input[name="theme"][value="${this.currentTheme}"]`) as HTMLInputElement;
    if (radio) {
      radio.checked = true;
    }
  }
}

// Apply theme to DOM
private applyTheme(): void {
  const htmlElement = document.documentElement;
  if (this.currentTheme === 'dark') {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }
}
```

## Testing

### Unit Tests

Settings management tests (`src/__tests__/main/settings-management/settings.test.ts`):
- Default settings when file missing
- Loading existing settings
- Error handling (corrupted JSON, missing properties)
- Saving settings
- Partial updates

### Component Tests

Project panel dark mode tests (`src/__tests__/components/project-panel/project-panel.test.ts`):
- Render with dark mode classes when `html.dark` present
- Header dark mode styling
- Empty state dark mode styling
- Selected/Unselected project dark mode styling
- Remove button dark mode styling
- Add button dark mode styling

Settings dialog theme tests (`src/__tests__/components/settings-dialog/settings-dialog.test.ts`):
- Render with correct theme radio button selected
- Update theme when radio button is changed
- Apply theme directly to DOM when theme is updated

### Manual Testing

1. Run `npm run dev` to start the app
2. Click the **Settings** button in the header
3. Select Light or Dark theme radio button
4. Verify the entire app colors change immediately
5. Close the dialog and restart the app
6. Verify theme preference persists
7. Check `settings.json` file in userData directory

## Future Enhancements

- **System Theme**: Detect OS preference with `window.matchMedia('(prefers-color-scheme: dark)')`
- **Custom Themes**: Add more theme options (e.g., high contrast, sepia)
- **Theme Per Project**: Allow project-specific theme overrides
- **Transition Animations**: Smooth transitions between themes

## Related Files

- `src/main/settings-management.ts` - Settings storage and IPC handlers
- `src/components/app-container.ts` - Theme loading on app startup
- `src/components/settings-dialog.ts` - Theme selection UI and application
- `src/components/project-panel.ts` - Left sidebar with dark mode
- `src/components/project-agent-dashboard.ts` - Agent list with dark mode
- `src/components/notepad-window.ts` - Quick notepad with theme sync
- `src/styles.css` - Tailwind dark mode configuration
- `src/types/settings-management.d.ts` - AppSettings type definition
- `src/preload.ts` - Settings API exposure
- `src/api/settings-management.ts` - Renderer-safe settings API
- `src/__tests__/components/settings-dialog/settings-dialog.test.ts` - Settings dialog tests including theme selection
