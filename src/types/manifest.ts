/**
 * Manifest types — installation profiles and component tracking.
 */

export type ManifestProfileName = 'core' | 'developer' | 'security' | 'full' | 'custom';

export type ComponentType = 'skill' | 'agent' | 'command' | 'rule' | 'hook';

export interface ComponentRef {
  id: string;
  type: ComponentType;
  version: string;
  depends_on?: string[];
}

export interface ManifestConfig {
  version: string;
  harness: string;
  profile: ManifestProfileName;
  installed_at: string;
  components: ComponentRef[];
}
