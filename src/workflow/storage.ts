/**
 * Workflow storage module - CRUD operations for workflows
 * Stores workflows in ~/.pi-browser/workflows/
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Workflow } from "./types.js";

const WORKFLOWS_DIR = path.join(os.homedir(), ".pi-browser", "workflows");

/**
 * Ensure workflows directory exists
 */
function ensureWorkflowsDir(): void {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  }
}

/**
 * Get workflow file path by ID
 */
function getWorkflowPath(id: string): string {
  return path.join(WORKFLOWS_DIR, `${id}.json`);
}

/**
 * Generate a unique workflow ID
 */
export function generateWorkflowId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load all workflows from storage
 */
export function loadWorkflows(): Workflow[] {
  ensureWorkflowsDir();

  const files = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith(".json"));
  const workflows: Workflow[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), "utf-8");
      const workflow = JSON.parse(content) as Workflow;
      workflows.push(workflow);
    } catch (error) {
      console.error(`Failed to load workflow from ${file}:`, error);
    }
  }

  // Sort by updatedAt descending (newest first)
  return workflows.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Load a single workflow by ID
 */
export function loadWorkflow(id: string): Workflow | null {
  const filePath = getWorkflowPath(id);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Workflow;
  } catch (error) {
    console.error(`Failed to load workflow ${id}:`, error);
    return null;
  }
}

/**
 * Save a workflow to storage
 */
export function saveWorkflow(workflow: Workflow): void {
  ensureWorkflowsDir();

  const filePath = getWorkflowPath(workflow.id);
  workflow.updatedAt = Date.now();

  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), "utf-8");
}

/**
 * Delete a workflow from storage
 */
export function deleteWorkflow(id: string): boolean {
  const filePath = getWorkflowPath(id);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Failed to delete workflow ${id}:`, error);
    return false;
  }
}

/**
 * Create a new workflow with default values
 */
export function createWorkflow(name: string, description?: string): Workflow {
  const now = Date.now();
  return {
    id: generateWorkflowId(),
    name,
    description,
    enabled: true,
    steps: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Duplicate an existing workflow
 */
export function duplicateWorkflow(workflow: Workflow): Workflow {
  const now = Date.now();
  return {
    ...JSON.parse(JSON.stringify(workflow)), // Deep clone
    id: generateWorkflowId(),
    name: `${workflow.name} (복사본)`,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Export workflow to JSON string
 */
export function exportWorkflow(workflow: Workflow): string {
  return JSON.stringify(workflow, null, 2);
}

/**
 * Import workflow from JSON string
 */
export function importWorkflow(jsonStr: string): Workflow | null {
  try {
    const workflow = JSON.parse(jsonStr) as Workflow;

    // Validate required fields
    if (!workflow.name || !Array.isArray(workflow.steps)) {
      return null;
    }

    // Generate new ID and timestamps
    const now = Date.now();
    workflow.id = generateWorkflowId();
    workflow.createdAt = now;
    workflow.updatedAt = now;

    return workflow;
  } catch (error) {
    console.error("Failed to import workflow:", error);
    return null;
  }
}
