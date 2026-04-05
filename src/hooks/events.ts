/**
 * VoidEventBus — typed event emitter for hook lifecycle events.
 * Wraps Node.js EventEmitter with strongly-typed HookEventType bindings.
 */

import { EventEmitter } from 'node:events';
import type { HookEventType, HookInput } from '../types/hook.js';

type HookListener = (input: HookInput) => void;

export class VoidEventBus {
  private readonly _emitter = new EventEmitter();

  on(event: HookEventType, listener: HookListener): void {
    this._emitter.on(event, listener);
  }

  off(event: HookEventType, listener: HookListener): void {
    this._emitter.off(event, listener);
  }

  emit(event: HookEventType, input: HookInput): void {
    this._emitter.emit(event, input);
  }

  removeAllListeners(event?: HookEventType): void {
    if (event) {
      this._emitter.removeAllListeners(event);
    } else {
      this._emitter.removeAllListeners();
    }
  }

  listenerCount(event: HookEventType): number {
    return this._emitter.listenerCount(event);
  }
}
