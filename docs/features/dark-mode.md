# Dark Mode

## Overview

Turbo Carnival supports dark mode theming using Tailwind CSS v4 with class-based dark mode. Users can toggle between light and dark themes via a button in the app header. The theme preference persists across app restarts.

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

Located in `src/components/app-container.ts` header:
- Button icon changes based on current theme (moon for light, sun for dark)
- Toggles persist to `settings.json`
- Applies `dark` class to document element via `applyTheme()`

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
- ✅ `app-container` - Header with theme toggle (src/components/app-container.ts)
- ⏳ `conversation-panel` - Chat interface (TODO)
- ⏳ `project-detail-panel` - File tree (TODO)
- ⏳ `project-agent-dashboard` - Agent grid (TODO)
- ⏳ Dialog components (TODO)

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

### Renderer Process (src/components/app-container.ts)

```typescript
// Load theme on mount
private async loadTheme(): Promise<void> {
  if (window.electronAPI) {
    try {
      const settings = await window.electronAPI.getSettings();
      this.currentTheme = settings.theme === 'dark' ? 'dark' : 'light';
      this.applyTheme();
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  }
}

// Toggle theme and save
private async toggleTheme(): Promise<void> {
  const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
  if (window.electronAPI) {
    try {
      await window.electronAPI.updateSettings({ theme: newTheme });
      this.currentTheme = newTheme;
      this.applyTheme();
    } catch (error) {
      console.error('Failed to update theme:', error);
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

### Manual Testing

1. Run `npm run dev` to start the app
2. Click the theme toggle button (moon/sun icon) in the header
3. Verify project panel colors change immediately
4. Close and restart the app
5. Verify theme preference persists
6. Check `settings.json` file in userData directory

## Future Enhancements

- **System Theme**: Detect OS preference with `window.matchMedia('(prefers-color-scheme: dark)')`
- **Custom Themes**: Add more theme options (e.g., high contrast, sepia)
- **Theme Per Project**: Allow project-specific theme overrides
- **Transition Animations**: Smooth transitions between themes

## Related Files

- `src/main/settings-management.ts` - Settings storage and IPC handlers
- `src/components/app-container.ts` - Theme toggle button and state management
- `src/components/project-panel.ts` - Example component with dark mode classes
- `src/styles.css` - Tailwind dark mode configuration
- `src/global.d.ts` - AppSettings type definition
- `src/preload.ts` - Settings API exposure
