/**
 * Configuration Index
 * Exports configuration functions and types
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { Config, defaultConfig } from './default.js';

/**
 * Load configuration from file
 * @returns The loaded configuration merged with defaults
 */
export function loadConfig(): Config {
  try {
    const configPath = path.join(process.cwd(), 'tanuki-config.json');
    
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      
      // Merge with defaults
      return {
        ...defaultConfig,
        ...userConfig,
        // Deep merge for nested objects
        projectManagement: {
          ...defaultConfig.projectManagement,
          ...(userConfig.projectManagement || {})
        }
      };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  
  // Return default config if loading fails
  return defaultConfig;
}

/**
 * Create a default configuration file
 * @returns True if file was created, false otherwise
 */
export async function createDefaultConfigFile(): Promise<boolean> {
  try {
    const configPath = path.join(process.cwd(), 'tanuki-config.json');
    
    // Only create if it doesn't already exist
    if (!existsSync(configPath) && defaultConfig.autoCreateConfig) {
      const configContent = JSON.stringify(defaultConfig, null, 2);
      writeFileSync(configPath, configContent, 'utf-8');
      console.log('Created default configuration file: tanuki-config.json');
      return true;
    }
  } catch (error) {
    console.error('Error creating default config file:', error);
  }
  
  return false;
}

/**
 * Update a specific configuration property
 * @param property The property name to update
 * @param value The new value
 * @returns True if update was successful, false otherwise
 */
export function updateConfig(property: string, value: any): boolean {
  try {
    const configPath = path.join(process.cwd(), 'tanuki-config.json');
    let config: any = defaultConfig;
    
    // Load existing config if available
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent);
    }
    
    // Update property
    config[property] = value;
    
    // Write updated config
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error updating config:', error);
    return false;
  }
}

// Export types and defaults
export { Config, defaultConfig }; 