/**
 * Identity types — user, team, and agent identity configuration.
 */

export type TechnicalLevel = 'beginner' | 'intermediate' | 'senior' | 'expert';

export interface PreferredStyle {
  verbosity: string;
  codeComments: string;
  explanations: string;
}

export interface UserIdentity {
  version: string;
  technicalLevel: TechnicalLevel;
  preferredStyle: PreferredStyle;
  domains: string[];
  createdAt: string;
}

export interface TeamConfig {
  version: string;
  sharedSkills: string[];
  sharedCommands: string[];
  conventions: Record<string, string>;
}

export interface AgentIdentity {
  id: string;
  name: string;
  personality?: string;
  constraints?: string[];
}
