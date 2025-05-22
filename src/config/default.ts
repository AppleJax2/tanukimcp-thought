/**
 * Default Configuration
 * Provides default configuration values for the application
 */

import path from 'path';

/**
 * Configuration interface
 */
export interface Config {
  // General settings
  autoCreateConfig?: boolean;
  projectRoot?: string;
  useIdeLlm: boolean;  // This will always be true
  
  // Project management settings
  projectManagement?: {
    createProjectDirectories: boolean;
    projectsBasePath: string;
    avoidToolDirectories: boolean;
  };
}

/**
 * Default configuration values
 * Always uses the IDE's LLM capabilities - no local options
 */
export const defaultConfig: Config = {
  // General settings
  autoCreateConfig: true,
  projectRoot: process.cwd(),
  useIdeLlm: true,  // Always set to true
  
  // Project management settings
  projectManagement: {
    createProjectDirectories: true,
    projectsBasePath: path.join(process.env.HOME || process.env.USERPROFILE || '~', 'projects'),
    avoidToolDirectories: true
  }
}; 