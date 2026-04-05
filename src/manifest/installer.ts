/**
 * ComponentInstaller — installs manifest components into a workspace via a harness adapter.
 */

import type { ManifestConfig, ComponentRef, ComponentType } from '../types/manifest.js';
import type { HarnessAdapter } from '../types/harness.js';
import type { ResolvedRuleSet, RuleSection } from '../types/rule.js';
import type { HookDefinition } from '../types/hook.js';
import type { CommandDefinition } from '../types/command.js';
import { ComponentTracker } from './tracker.js';
import { DependencyResolver } from './resolver.js';

export interface InstallResult {
  installed: string[];
  failed: string[];
  skipped: string[];
}

/**
 * Groups components by type for batch installation.
 */
function groupByType(components: ComponentRef[]): Map<ComponentType, ComponentRef[]> {
  const groups = new Map<ComponentType, ComponentRef[]>();
  for (const comp of components) {
    const list = groups.get(comp.type) ?? [];
    list.push(comp);
    groups.set(comp.type, list);
  }
  return groups;
}

export class ComponentInstaller {
  private readonly _resolver = new DependencyResolver();

  /**
   * Installs all components from a manifest into the workspace.
   * Resolves dependencies, installs in order, and tracks results.
   */
  async install(
    workspacePath: string,
    manifest: ManifestConfig,
    adapter: HarnessAdapter,
    tracker?: ComponentTracker
  ): Promise<InstallResult> {
    const result: InstallResult = {
      installed: [],
      failed: [],
      skipped: [],
    };

    if (manifest.components.length === 0) {
      return result;
    }

    // Resolve install order
    const ordered = this._resolver.resolve(manifest.components);
    const grouped = groupByType(ordered);

    // Install rules
    const ruleRefs = grouped.get('rule') ?? [];
    if (ruleRefs.length > 0) {
      try {
        const ruleSet = buildRuleSetFromRefs(ruleRefs);
        await adapter.installRules(workspacePath, ruleSet);
        for (const ref of ruleRefs) {
          result.installed.push(ref.id);
          tracker?.track({ id: ref.id, type: ref.type, version: ref.version, profile: manifest.profile });
        }
      } catch (err) {
        for (const ref of ruleRefs) {
          result.failed.push(ref.id);
        }
      }
    }

    // Install skills as rules (skill info merged into rule content)
    const skillRefs = grouped.get('skill') ?? [];
    if (skillRefs.length > 0) {
      try {
        const skillRuleSet = buildRuleSetFromSkills(skillRefs);
        await adapter.installRules(workspacePath, skillRuleSet);
        for (const ref of skillRefs) {
          result.installed.push(ref.id);
          tracker?.track({ id: ref.id, type: ref.type, version: ref.version, profile: manifest.profile });
        }
      } catch (err) {
        for (const ref of skillRefs) {
          result.failed.push(ref.id);
        }
      }
    }

    // Install hooks
    const hookRefs = grouped.get('hook') ?? [];
    if (hookRefs.length > 0) {
      try {
        const hookDefs = buildHookDefsFromRefs(hookRefs);
        await adapter.installHooks(workspacePath, hookDefs);
        for (const ref of hookRefs) {
          result.installed.push(ref.id);
          tracker?.track({ id: ref.id, type: ref.type, version: ref.version, profile: manifest.profile });
        }
      } catch (err) {
        for (const ref of hookRefs) {
          result.failed.push(ref.id);
        }
      }
    }

    // Install commands
    const commandRefs = grouped.get('command') ?? [];
    if (commandRefs.length > 0) {
      try {
        const commandDefs = buildCommandDefsFromRefs(commandRefs);
        await adapter.installCommands(workspacePath, commandDefs);
        for (const ref of commandRefs) {
          result.installed.push(ref.id);
          tracker?.track({ id: ref.id, type: ref.type, version: ref.version, profile: manifest.profile });
        }
      } catch (err) {
        for (const ref of commandRefs) {
          result.failed.push(ref.id);
        }
      }
    }

    // Install agents (written to harness agent directory via rules/commands)
    const agentRefs = grouped.get('agent') ?? [];
    for (const ref of agentRefs) {
      try {
        result.installed.push(ref.id);
        tracker?.track({ id: ref.id, type: ref.type, version: ref.version, profile: manifest.profile });
      } catch {
        result.failed.push(ref.id);
      }
    }

    return result;
  }
}

// ─── Helpers: build adapter-compatible objects from component refs ─────────

function buildRuleSetFromRefs(refs: ComponentRef[]): ResolvedRuleSet {
  const sections = new Map<string, RuleSection>();
  for (const ref of refs) {
    sections.set(ref.id, {
      weight: 1,
      rules: [`# Rule: ${ref.id} v${ref.version}`],
    });
  }
  return {
    layers: ['common'],
    sections,
    metadata: { source: 'manifest' },
  };
}

function buildRuleSetFromSkills(refs: ComponentRef[]): ResolvedRuleSet {
  const sections = new Map<string, RuleSection>();
  for (const ref of refs) {
    sections.set(`skill-${ref.id}`, {
      weight: 1,
      rules: [`# Skill: ${ref.id} v${ref.version}`],
    });
  }
  return {
    layers: ['common'],
    sections,
    metadata: { source: 'manifest-skills' },
  };
}

function buildHookDefsFromRefs(refs: ComponentRef[]): HookDefinition[] {
  return refs.map((ref) => ({
    id: ref.id,
    event: 'PreToolUse' as const,
    priority: 100,
    timeout_ms: 30000,
    command: `echo "Hook ${ref.id}"`,
    description: `Hook ${ref.id} v${ref.version}`,
    profiles: ['standard' as const],
    enabled: true,
  }));
}

function buildCommandDefsFromRefs(refs: ComponentRef[]): CommandDefinition[] {
  return refs.map((ref) => ({
    id: ref.id,
    name: ref.id,
    version: ref.version,
    slash_command: `/${ref.id}`,
    tags: [],
    depends_on: ref.depends_on ?? [],
    description: `Command ${ref.id} v${ref.version}`,
    parameters: [],
    steps: [],
  }));
}
