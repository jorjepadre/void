/**
 * DependencyResolver — topological sort of components using Kahn's algorithm.
 * Detects cycles and returns a safe install order.
 */

import type { ComponentRef } from '../types/manifest.js';

export class CyclicDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Cyclic dependency detected among components: ${cycle.join(' -> ')}`);
    this.name = 'CyclicDependencyError';
  }
}

export class DependencyResolver {
  /**
   * Resolves component install order via topological sort (Kahn's algorithm).
   * Components with no dependencies come first.
   * Throws CyclicDependencyError if a cycle is detected.
   */
  resolve(components: ComponentRef[]): ComponentRef[] {
    const componentMap = new Map<string, ComponentRef>();
    for (const comp of components) {
      componentMap.set(comp.id, comp);
    }

    // Build adjacency list and in-degree map
    // Edge: dependency -> dependent (dependency must be installed first)
    const adjacency = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    for (const comp of components) {
      if (!adjacency.has(comp.id)) {
        adjacency.set(comp.id, new Set());
      }
      if (!inDegree.has(comp.id)) {
        inDegree.set(comp.id, 0);
      }

      const deps = comp.depends_on ?? [];
      for (const dep of deps) {
        // Only count edges for dependencies that are in our component set
        if (!componentMap.has(dep)) continue;

        if (!adjacency.has(dep)) {
          adjacency.set(dep, new Set());
        }
        adjacency.get(dep)!.add(comp.id);

        const current = inDegree.get(comp.id) ?? 0;
        inDegree.set(comp.id, current + 1);
      }
    }

    // Kahn's algorithm: start with nodes that have zero in-degree
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const sorted: ComponentRef[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const comp = componentMap.get(current);
      if (comp) {
        sorted.push(comp);
      }

      const neighbors = adjacency.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          const deg = (inDegree.get(neighbor) ?? 1) - 1;
          inDegree.set(neighbor, deg);
          if (deg === 0) {
            queue.push(neighbor);
          }
        }
      }
    }

    // If we didn't process all components, there's a cycle
    if (sorted.length < components.length) {
      const remaining = components
        .filter((c) => !sorted.some((s) => s.id === c.id))
        .map((c) => c.id);
      throw new CyclicDependencyError(remaining);
    }

    return sorted;
  }
}
