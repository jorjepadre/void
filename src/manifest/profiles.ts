/**
 * ProfileDefinitions — built-in manifest profiles that define component sets.
 * Each profile is a function taking ProjectInfo and returning ComponentRef arrays.
 */

import type { ComponentRef, ManifestProfileName } from '../types/manifest.js';
import type { ProjectInfo } from '../detect/index.js';

// ─── Core component refs ──────────────────────────────────────────────────

const CORE_SKILLS: ComponentRef[] = [
  { id: 'code-review', type: 'skill', version: '0.1.0' },
  { id: 'tdd', type: 'skill', version: '0.1.0' },
  { id: 'api-design', type: 'skill', version: '0.1.0' },
  { id: 'deployment', type: 'skill', version: '0.1.0' },
];

const CORE_AGENTS: ComponentRef[] = [
  { id: 'architect', type: 'agent', version: '0.1.0' },
  { id: 'planner', type: 'agent', version: '0.1.0' },
  { id: 'tdd-guide', type: 'agent', version: '0.1.0' },
  { id: 'reviewer-generic', type: 'agent', version: '0.1.0' },
];

const CORE_RULES: ComponentRef[] = [
  { id: 'common-rules', type: 'rule', version: '0.1.0' },
];

const CORE_HOOKS: ComponentRef[] = [
  { id: 'pre-commit-lint', type: 'hook', version: '0.1.0' },
];

// ─── Language-specific skills ─────────────────────────────────────────────

const LANGUAGE_SKILLS: Record<string, ComponentRef[]> = {
  typescript: [
    { id: 'typescript', type: 'skill', version: '0.1.0', depends_on: ['code-review'] },
    { id: 'typescript-strict', type: 'skill', version: '0.1.0', depends_on: ['typescript'] },
  ],
  javascript: [
    { id: 'javascript', type: 'skill', version: '0.1.0', depends_on: ['code-review'] },
  ],
  python: [
    { id: 'python', type: 'skill', version: '0.1.0', depends_on: ['code-review'] },
  ],
  rust: [
    { id: 'rust', type: 'skill', version: '0.1.0', depends_on: ['code-review'] },
  ],
  go: [
    { id: 'go', type: 'skill', version: '0.1.0', depends_on: ['code-review'] },
  ],
  java: [
    { id: 'java', type: 'skill', version: '0.1.0', depends_on: ['code-review'] },
  ],
};

const LANGUAGE_AGENTS: Record<string, ComponentRef[]> = {
  typescript: [
    { id: 'reviewer-typescript', type: 'agent', version: '0.1.0', depends_on: ['reviewer-generic'] },
    { id: 'resolver-typescript', type: 'agent', version: '0.1.0' },
  ],
  javascript: [
    { id: 'reviewer-javascript', type: 'agent', version: '0.1.0', depends_on: ['reviewer-generic'] },
  ],
  python: [
    { id: 'reviewer-python', type: 'agent', version: '0.1.0', depends_on: ['reviewer-generic'] },
    { id: 'resolver-python', type: 'agent', version: '0.1.0' },
  ],
  rust: [
    { id: 'reviewer-rust', type: 'agent', version: '0.1.0', depends_on: ['reviewer-generic'] },
  ],
  go: [
    { id: 'reviewer-go', type: 'agent', version: '0.1.0', depends_on: ['reviewer-generic'] },
  ],
  java: [
    { id: 'reviewer-java', type: 'agent', version: '0.1.0', depends_on: ['reviewer-generic'] },
  ],
};

// ─── Security components ──────────────────────────────────────────────────

const SECURITY_SKILL: ComponentRef = {
  id: 'security-review',
  type: 'skill',
  version: '0.1.0',
  depends_on: ['code-review'],
};

const SECURITY_AGENT: ComponentRef = {
  id: 'security-auditor',
  type: 'agent',
  version: '0.1.0',
};

const SECURITY_COMMAND: ComponentRef = {
  id: 'security-scan',
  type: 'command',
  version: '0.1.0',
  depends_on: ['security-review'],
};

const STRICT_HOOKS: ComponentRef[] = [
  { id: 'pre-commit-lint', type: 'hook', version: '0.1.0' },
  { id: 'pre-push-test', type: 'hook', version: '0.1.0' },
  { id: 'secret-scan', type: 'hook', version: '0.1.0' },
];

const STANDARD_HOOKS: ComponentRef[] = [
  { id: 'pre-commit-lint', type: 'hook', version: '0.1.0' },
  { id: 'pre-push-test', type: 'hook', version: '0.1.0' },
];

// ─── All components (for full profile) ────────────────────────────────────

function allLanguageSkills(): ComponentRef[] {
  return Object.values(LANGUAGE_SKILLS).flat();
}

function allLanguageAgents(): ComponentRef[] {
  return Object.values(LANGUAGE_AGENTS).flat();
}

// ─── Profile builders ─────────────────────────────────────────────────────

function coreProfile(_info: ProjectInfo): ComponentRef[] {
  return [
    ...CORE_SKILLS,
    ...CORE_AGENTS,
    ...CORE_RULES,
    ...CORE_HOOKS,
  ];
}

function developerProfile(info: ProjectInfo): ComponentRef[] {
  const components = [...coreProfile(info)];

  // Add language-specific skills and agents for detected languages
  for (const lang of info.languages) {
    const langLower = lang.toLowerCase();
    const skills = LANGUAGE_SKILLS[langLower];
    if (skills) {
      components.push(...skills);
    }
    const agents = LANGUAGE_AGENTS[langLower];
    if (agents) {
      components.push(...agents);
    }
  }

  // Standard hooks
  for (const hook of STANDARD_HOOKS) {
    if (!components.some((c) => c.id === hook.id)) {
      components.push(hook);
    }
  }

  return components;
}

function securityProfile(info: ProjectInfo): ComponentRef[] {
  const components = [...coreProfile(info)];

  components.push(SECURITY_SKILL);
  components.push(SECURITY_AGENT);
  components.push(SECURITY_COMMAND);

  // Strict hooks
  for (const hook of STRICT_HOOKS) {
    if (!components.some((c) => c.id === hook.id)) {
      components.push(hook);
    }
  }

  return components;
}

function fullProfile(info: ProjectInfo): ComponentRef[] {
  const components = [...developerProfile(info)];

  // Add all language skills and agents not already present
  for (const skill of allLanguageSkills()) {
    if (!components.some((c) => c.id === skill.id)) {
      components.push(skill);
    }
  }
  for (const agent of allLanguageAgents()) {
    if (!components.some((c) => c.id === agent.id)) {
      components.push(agent);
    }
  }

  // Add security components
  if (!components.some((c) => c.id === SECURITY_SKILL.id)) {
    components.push(SECURITY_SKILL);
  }
  if (!components.some((c) => c.id === SECURITY_AGENT.id)) {
    components.push(SECURITY_AGENT);
  }
  if (!components.some((c) => c.id === SECURITY_COMMAND.id)) {
    components.push(SECURITY_COMMAND);
  }

  // Strict hooks
  for (const hook of STRICT_HOOKS) {
    if (!components.some((c) => c.id === hook.id)) {
      components.push(hook);
    }
  }

  return components;
}

function customProfile(_info: ProjectInfo): ComponentRef[] {
  return [];
}

// ─── Profile registry ─────────────────────────────────────────────────────

export type ProfileBuilder = (info: ProjectInfo) => ComponentRef[];

const PROFILES: Record<ManifestProfileName, ProfileBuilder> = {
  core: coreProfile,
  developer: developerProfile,
  security: securityProfile,
  full: fullProfile,
  custom: customProfile,
};

/**
 * Returns the profile builder function for the given profile name.
 */
export function getProfileBuilder(name: ManifestProfileName): ProfileBuilder {
  return PROFILES[name];
}

/**
 * Builds the component list for a profile given project info.
 */
export function buildProfile(name: ManifestProfileName, info: ProjectInfo): ComponentRef[] {
  return PROFILES[name](info);
}
