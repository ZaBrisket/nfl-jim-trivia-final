// High-performance timer system using requestAnimationFrame
// Replaces multiple setInterval calls with a single RAF-based timer

type TimerCallback = (now: number) => void;

class OptimizedTimerSystem {
  private callbacks = new Map<string, TimerCallback>();
  private rafId: number | null = null;
  private lastTime = 0;
  private isRunning = false;

  subscribe(id: string, callback: TimerCallback): void {
    this.callbacks.set(id, callback);
    this.ensureRunning();
  }

  unsubscribe(id: string): void {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  private ensureRunning(): void {
    if (!this.isRunning && this.callbacks.size > 0) {
      this.start();
    }
  }

  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    
    // Only update if significant time has passed (throttle to ~60fps max)
    if (now - this.lastTime >= 16) {
      const currentTime = Date.now();
      
      // Call all registered callbacks
      for (const callback of this.callbacks.values()) {
        try {
          callback(currentTime);
        } catch (error) {
          console.error('Timer callback error:', error);
        }
      }
      
      this.lastTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  // Get statistics for monitoring
  getStats(): { activeCallbacks: number; isRunning: boolean } {
    return {
      activeCallbacks: this.callbacks.size,
      isRunning: this.isRunning
    };
  }

  // Force immediate update (useful for testing)
  forceUpdate(): void {
    if (this.isRunning) {
      const currentTime = Date.now();
      for (const callback of this.callbacks.values()) {
        try {
          callback(currentTime);
        } catch (error) {
          console.error('Timer callback error:', error);
        }
      }
    }
  }
}

// Singleton timer system
const timerSystem = new OptimizedTimerSystem();

// React hook for using the optimized timer
export function useOptimizedTimer(
  callback: TimerCallback,
  enabled: boolean = true
): void {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    if (!enabled) return;

    const id = Math.random().toString(36);
    const wrappedCallback = (now: number) => callbackRef.current(now);
    
    timerSystem.subscribe(id, wrappedCallback);
    
    return () => {
      timerSystem.unsubscribe(id);
    };
  }, [enabled]);
}

// Utility for one-time timer operations
export function createTimer(
  callback: TimerCallback,
  options: { 
    autoStart?: boolean;
    id?: string;
  } = {}
): {
  start(): void;
  stop(): void;
  isActive(): boolean;
} {
  const id = options.id || Math.random().toString(36);
  let isActive = false;

  const start = () => {
    if (isActive) return;
    isActive = true;
    timerSystem.subscribe(id, callback);
  };

  const stop = () => {
    if (!isActive) return;
    isActive = false;
    timerSystem.unsubscribe(id);
  };

  if (options.autoStart) {
    start();
  }

  return { start, stop, isActive: () => isActive };
}

// Get timer system statistics
export function getTimerStats(): { activeCallbacks: number; isRunning: boolean } {
  return timerSystem.getStats();
}

// Force immediate timer update (useful for testing)
export function forceTimerUpdate(): void {
  timerSystem.forceUpdate();
}

// Import React for the hook
import React from 'react';