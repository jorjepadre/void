/**
 * CommandExecutor — resolves and executes multi-step command workflows.
 *
 * For Phase 3, actual agent execution is stubbed. The executor validates
 * the execution plan, resolves templates, and returns the plan structure.
 */

import type { CommandDefinition, CommandStep } from '../types/command.js';
import type { AgentRegistry } from '../agents/registry.js';

export interface StepResult {
  stepIndex: number;
  agent: string;
  action: string;
  success: boolean;
  error?: string;
}

export interface CommandResult {
  success: boolean;
  steps: StepResult[];
  duration: number;
}

export class CommandExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

export class CommandExecutor {
  constructor(private readonly agentRegistry: AgentRegistry) {}

  /**
   * Executes a command by resolving templates and validating each step.
   *
   * Currently returns the validated execution plan without invoking agents.
   * Agent execution will be wired in a later phase.
   */
  async execute(
    command: CommandDefinition,
    params: Record<string, unknown>,
  ): Promise<CommandResult> {
    const start = Date.now();
    const stepResults: StepResult[] = [];
    let allSuccess = true;

    // Validate required parameters
    for (const param of command.parameters) {
      if (param.required && !(param.name in params)) {
        const defaultVal = param.default;
        if (defaultVal === undefined) {
          throw new CommandExecutionError(
            `Missing required parameter: ${param.name}`,
          );
        }
      }
    }

    // Build resolved params with defaults applied
    const resolvedParams: Record<string, unknown> = {};
    for (const param of command.parameters) {
      if (param.name in params) {
        resolvedParams[param.name] = params[param.name];
      } else if (param.default !== undefined) {
        resolvedParams[param.name] = param.default;
      }
    }

    // Process each step
    for (let i = 0; i < command.steps.length; i++) {
      const step = command.steps[i]!;
      const result = await this.executeStep(i, step, resolvedParams);
      stepResults.push(result);

      if (!result.success) {
        allSuccess = false;

        // If step has on_failure handler, note it but don't execute yet
        if (!step.on_failure) {
          // No failure handler — stop execution
          break;
        }
      }
    }

    return {
      success: allSuccess,
      steps: stepResults,
      duration: Date.now() - start,
    };
  }

  /**
   * Executes (validates) a single step in the command workflow.
   */
  private async executeStep(
    index: number,
    step: CommandStep,
    params: Record<string, unknown>,
  ): Promise<StepResult> {
    // Resolve {{variable}} templates in the action string
    const resolvedAction = resolveTemplates(step.action, params);

    // Validate the referenced agent exists
    const agentExists = this.agentRegistry.has(step.agent);
    if (!agentExists) {
      return {
        stepIndex: index,
        agent: step.agent,
        action: resolvedAction,
        success: false,
        error: `Agent not found: "${step.agent}"`,
      };
    }

    // Stub: in a future phase, this will actually invoke the agent.
    // For now, we return success if the agent is found and action is valid.
    return {
      stepIndex: index,
      agent: step.agent,
      action: resolvedAction,
      success: true,
    };
  }
}

/**
 * Replaces {{variable}} placeholders in a template string with param values.
 */
function resolveTemplates(
  template: string,
  params: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (key in params) {
      return String(params[key]);
    }
    return `{{${key}}}`;
  });
}
