import type { FeatureSettingsSchema, FeatureSettingsRegistration } from '../types';

/**
 * Feature Settings Registry
 * Singleton class that manages feature settings registrations
 * Allows features to register their own settings panels in the settings dialog
 */
class FeatureSettingsRegistry {
  private registrations: Map<string, FeatureSettingsRegistration> = new Map();

  /**
   * Register a feature's settings
   * @param registration - The feature settings registration containing id, display name, defaults, and panel component
   */
  register<T>(registration: FeatureSettingsRegistration<T>): void {
    if (this.registrations.has(registration.featureId)) {
      console.warn(`Feature settings "${registration.featureId}" is already registered. Overwriting.`);
    }
    this.registrations.set(registration.featureId, {
      ...registration,
      order: registration.order ?? 100, // Default order is 100
    });
  }

  /**
   * Get all registered feature settings, sorted by order
   * @returns Array of feature registrations sorted by their order property
   */
  getAllRegistrations(): FeatureSettingsRegistration[] {
    return Array.from(this.registrations.values())
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  /**
   * Get a specific feature's registration
   * @param featureId - The feature identifier
   * @returns The registration or undefined if not found
   */
  getRegistration(featureId: string): FeatureSettingsRegistration | undefined {
    return this.registrations.get(featureId);
  }

  /**
   * Get all default values for registered features
   * @returns Object mapping feature IDs to their default settings
   */
  getAllDefaults(): Record<string, any> {
    const defaults: Record<string, any> = {};
    this.registrations.forEach((registration, featureId) => {
      defaults[featureId] = registration.defaults;
    });
    return defaults;
  }

  /**
   * Check if a feature is registered
   * @param featureId - The feature identifier
   * @returns True if the feature is registered
   */
  has(featureId: string): boolean {
    return this.registrations.has(featureId);
  }
}

// Singleton instance
const registry = new FeatureSettingsRegistry();

/**
 * Register feature settings with the global registry
 * @param registration - The feature settings registration
 */
export function registerFeatureSettings<T>(registration: FeatureSettingsRegistration<T>): void {
  registry.register(registration);
}

/**
 * Get all registered feature settings, sorted by order
 * @returns Array of feature registrations
 */
export function getFeatureRegistrations(): FeatureSettingsRegistration[] {
  return registry.getAllRegistrations();
}

/**
 * Get a specific feature's registration
 * @param featureId - The feature identifier
 * @returns The registration or undefined if not found
 */
export function getFeatureRegistration(featureId: string): FeatureSettingsRegistration | undefined {
  return registry.getRegistration(featureId);
}

/**
 * Get all default values for registered features
 * @returns Object mapping feature IDs to their default settings
 */
export function getFeatureDefaults(): Record<string, any> {
  return registry.getAllDefaults();
}

/**
 * Check if a feature is registered
 * @param featureId - The feature identifier
 * @returns True if the feature is registered
 */
export function hasFeatureSettings(featureId: string): boolean {
  return registry.has(featureId);
}

// Export the registry instance for advanced use cases
export { FeatureSettingsRegistry };
