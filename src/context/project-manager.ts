/**
 * Project Context Manager
 * Manages project context information for intelligent file operations
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';

/**
 * Project Context Manager for intelligent file operations
 * Implements the Singleton pattern to ensure a single instance
 */
export class ProjectContextManager {
  private static instance: ProjectContextManager;
  
  // Map of project names to their paths and metadata
  private projectRegistry: Map<string, { path: string, metadata: any }> = new Map();
  
  // Current active project
  private currentProject: string | null = null;
  
  // Set of tool directories to avoid operating on
  private toolDirectories: Set<string> = new Set();
  
  /**
   * Private constructor (Singleton pattern)
   */
  private constructor() {
    // Initialize known tool directories
    this.toolDirectories.add(path.resolve(process.cwd()));
    this.toolDirectories.add(path.resolve(process.cwd(), 'tanukimcp-thought'));
  }
  
  /**
   * Get the singleton instance
   * @returns The ProjectContextManager instance
   */
  public static getInstance(): ProjectContextManager {
    if (!ProjectContextManager.instance) {
      ProjectContextManager.instance = new ProjectContextManager();
    }
    return ProjectContextManager.instance;
  }
  
  /**
   * Detect if a path is within a tool directory rather than a user project
   * @param dirPath The directory path to check
   * @returns True if the path is within a tool directory
   */
  public isToolDirectory(dirPath: string): boolean {
    const normalized = path.resolve(dirPath);
    return Array.from(this.toolDirectories).some(toolDir => 
      normalized === toolDir || normalized.startsWith(toolDir + path.sep)
    );
  }
  
  /**
   * Create a proper project directory based on project name
   * @param projectName The name of the project
   * @returns The full path to the created project directory
   */
  public async createProjectDirectory(projectName: string): Promise<string> {
    // Sanitize project name for directory creation
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Create projects directory in user's home directory
    const projectsDir = path.join(os.homedir(), 'projects');
    if (!existsSync(projectsDir)) {
      await fs.mkdir(projectsDir, { recursive: true }).catch(err => 
        console.error('Error creating projects directory:', err)
      );
    }
    
    // Create the specific project directory
    const projectDir = path.join(projectsDir, sanitizedName);
    if (!existsSync(projectDir)) {
      await fs.mkdir(projectDir, { recursive: true }).catch(err => 
        console.error('Error creating project directory:', err)
      );
    }
    
    // Register the project
    this.projectRegistry.set(projectName, { 
      path: projectDir,
      metadata: { created: new Date().toISOString() }
    });
    
    // Set as current project
    this.currentProject = projectName;
    
    return projectDir;
  }
  
  /**
   * Set the current active project
   * @param projectName The name of the project
   * @param projectPath The path to the project
   */
  public setCurrentProject(projectName: string, projectPath: string): void {
    this.projectRegistry.set(projectName, { 
      path: projectPath, 
      metadata: { lastActive: new Date().toISOString() } 
    });
    this.currentProject = projectName;
  }
  
  /**
   * Get the current active project
   * @returns The current project name and path, or null if none is set
   */
  public getCurrentProject(): { name: string, path: string } | null {
    if (!this.currentProject) return null;
    const project = this.projectRegistry.get(this.currentProject);
    if (!project) return null;
    return { name: this.currentProject, path: project.path };
  }
  
  /**
   * Get a list of all registered projects
   * @returns Array of project information
   */
  public getProjects(): Array<{ name: string, path: string, metadata: any }> {
    return Array.from(this.projectRegistry.entries()).map(([name, info]) => ({
      name,
      path: info.path,
      metadata: info.metadata
    }));
  }
  
  /**
   * Add a tool directory to avoid operating on
   * @param dirPath The directory path to add
   */
  public addToolDirectory(dirPath: string): void {
    this.toolDirectories.add(path.resolve(dirPath));
  }
} 