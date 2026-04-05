/**
 * SkillEvolution — tracks skill versioning, usage metrics, and provenance.
 * Data is stored in-memory and persisted via session recording.
 */

export interface SkillHealth {
  usageCount: number;
  lastUsed: string | null;
  version: string;
}

export interface SkillProvenance {
  createdBy: string;
  derivedFrom: string | null;
}

interface SkillEvolutionEntry {
  version: string;
  usageCount: number;
  lastUsed: string | null;
  createdBy: string;
  derivedFrom: string | null;
}

export class SkillEvolution {
  private entries = new Map<string, SkillEvolutionEntry>();

  /**
   * Registers a skill for evolution tracking.
   * Call this when a skill is first loaded.
   */
  register(
    skillId: string,
    version: string,
    createdBy = 'system',
    derivedFrom: string | null = null,
  ): void {
    if (!this.entries.has(skillId)) {
      this.entries.set(skillId, {
        version,
        usageCount: 0,
        lastUsed: null,
        createdBy,
        derivedFrom,
      });
    } else {
      // Update version if skill was re-registered (e.g., reloaded)
      const existing = this.entries.get(skillId)!;
      existing.version = version;
    }
  }

  /**
   * Returns the tracked version for a skill, or '0.0.0' if not tracked.
   */
  getVersion(skillId: string): string {
    return this.entries.get(skillId)?.version ?? '0.0.0';
  }

  /**
   * Increments the usage counter and updates lastUsed timestamp.
   */
  trackUsage(skillId: string): void {
    const entry = this.entries.get(skillId);
    if (entry) {
      entry.usageCount++;
      entry.lastUsed = new Date().toISOString();
    } else {
      // Auto-register with unknown version on first use
      this.entries.set(skillId, {
        version: '0.0.0',
        usageCount: 1,
        lastUsed: new Date().toISOString(),
        createdBy: 'unknown',
        derivedFrom: null,
      });
    }
  }

  /**
   * Returns usage health metrics for a skill.
   */
  getHealth(skillId: string): SkillHealth {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return {
        usageCount: 0,
        lastUsed: null,
        version: '0.0.0',
      };
    }
    return {
      usageCount: entry.usageCount,
      lastUsed: entry.lastUsed,
      version: entry.version,
    };
  }

  /**
   * Returns provenance info (who created it, what it was derived from).
   */
  getProvenance(skillId: string): SkillProvenance {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return {
        createdBy: 'unknown',
        derivedFrom: null,
      };
    }
    return {
      createdBy: entry.createdBy,
      derivedFrom: entry.derivedFrom,
    };
  }
}
