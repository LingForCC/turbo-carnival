/**
 * Settings Registry Type Definitions
 * Types for the pluggable settings system that allows features to register their own settings
 */

/**
 * Schema for defining feature settings
 * Used when registering a feature's settings with the registry
 */
export interface FeatureSettingsSchema<T = any> {
  /** Unique identifier for the feature (e.g., 'notepad', 'snippets') */
  featureId: string;
  /** Human-readable name for display in the settings dialog tab */
  displayName: string;
  /** Optional ordering priority (lower numbers appear first, defaults to 100) */
  order?: number;
  /** Default values for the feature's settings */
  defaults: T;
}

/**
 * Full registration for feature settings including UI component
 * Extends FeatureSettingsSchema with the panel component tag name
 */
export interface FeatureSettingsRegistration<T = any> extends FeatureSettingsSchema<T> {
  /** Tag name of the Web Component that renders the settings panel */
  panelTagName: string;
}
