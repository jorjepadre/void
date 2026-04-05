/**
 * AgentProtocol — inter-agent messaging via MemoryStore.
 * Messages are stored in namespaced channels. Supports directed and broadcast messages.
 */

import { randomUUID } from 'node:crypto';
import type { MemoryStore } from '../memory/store.js';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | '*';
  type: 'request' | 'response' | 'notify';
  channel: string;
  payload: unknown;
  timestamp: number;
}

export class AgentProtocol {
  private readonly _store: MemoryStore;

  constructor(store: MemoryStore) {
    this._store = store;
  }

  /**
   * Sends a message by writing it to the memory store under the channel namespace.
   */
  send(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    const full: AgentMessage = {
      ...message,
      id: randomUUID(),
      timestamp: Date.now(),
    };

    const namespace = `messages.${message.channel}`;
    const key = full.id;

    this._store.set(key, JSON.stringify(full), { namespace });
  }

  /**
   * Reads messages for a specific agent from the memory store.
   * If channel is specified, reads only from that channel.
   * Returns messages addressed to the agent or broadcast ('*').
   */
  receive(agentId: string, channel?: string): AgentMessage[] {
    const messages: AgentMessage[] = [];

    if (channel !== undefined) {
      const namespace = `messages.${channel}`;
      const entries = this._store.list(namespace, 1000);
      for (const entry of entries) {
        const msg = this._parseMessage(entry.value);
        if (msg && (msg.to === agentId || msg.to === '*')) {
          messages.push(msg);
        }
      }
    } else {
      // Scan all message namespaces — list all entries and filter
      const entries = this._store.list(undefined, 10000);
      for (const entry of entries) {
        if (!entry.namespace.startsWith('messages.')) {
          continue;
        }
        const msg = this._parseMessage(entry.value);
        if (msg && (msg.to === agentId || msg.to === '*')) {
          messages.push(msg);
        }
      }
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Broadcasts a message to all agents on a channel.
   */
  broadcast(from: string, channel: string, payload: unknown): void {
    this.send({ from, to: '*', type: 'notify', channel, payload });
  }

  /**
   * Clears all messages on a channel.
   */
  clearChannel(channel: string): void {
    const namespace = `messages.${channel}`;
    this._store.clear(namespace);
  }

  private _parseMessage(value: unknown): AgentMessage | null {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as AgentMessage;
      } catch {
        return null;
      }
    }
    // If value was already parsed from JSON by MemoryStore
    if (typeof value === 'object' && value !== null && 'id' in value) {
      return value as AgentMessage;
    }
    return null;
  }
}
