/**
 * SwarmStateMachine — manages swarm lifecycle state transitions.
 * Valid transitions: idle→starting, starting→running, running→stopping,
 * stopping→idle, running→error, error→stopping.
 */

export type SwarmState = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

const VALID_TRANSITIONS: Record<SwarmState, SwarmState[]> = {
  idle: ['starting'],
  starting: ['running'],
  running: ['stopping', 'error'],
  stopping: ['idle'],
  error: ['stopping'],
};

type TransitionCallback = (from: SwarmState, to: SwarmState) => void;

export class SwarmStateMachine {
  private _state: SwarmState;
  private readonly _callbacks: TransitionCallback[] = [];

  constructor(initial?: SwarmState) {
    this._state = initial ?? 'idle';
  }

  /**
   * Returns the current state.
   */
  getState(): SwarmState {
    return this._state;
  }

  /**
   * Returns true if transitioning to the given state is legal from the current state.
   */
  canTransition(to: SwarmState): boolean {
    const allowed = VALID_TRANSITIONS[this._state];
    return allowed !== undefined && allowed.includes(to);
  }

  /**
   * Transitions to a new state. Throws if the transition is illegal.
   */
  transition(to: SwarmState): void {
    if (!this.canTransition(to)) {
      throw new Error(
        `Illegal swarm state transition: ${this._state} → ${to}`
      );
    }
    const from = this._state;
    this._state = to;
    for (const cb of this._callbacks) {
      cb(from, to);
    }
  }

  /**
   * Registers a callback to be invoked on every state transition.
   */
  onTransition(callback: TransitionCallback): void {
    this._callbacks.push(callback);
  }
}
