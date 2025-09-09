import { useEffect, useState, useRef, useCallback } from 'react';
import { getFuzzyCacheStats } from '../utils/optimizedFuzzy';
import { getTimerStats } from '../utils/optimizedTimer';

export interface PerformanceMetrics {
  // Timing metrics
  componentRenderTime: number;
  dataLoadTime: number;
  fuzzyMatchTime: number;
  
  // Memory metrics
  fuzzyCacheSize: number;
  timerCallbacks: number;
  
  // User interaction metrics
  inputLatency: number;
  guessProcessingTime: number;
  
  // General metrics
  timestamp: number;
}

export interface PerformanceStats {
  current: PerformanceMetrics | null;
  history: PerformanceMetrics[];
  averages: {
    renderTime: number;
    inputLatency: number;
    guessProcessingTime: number;
  };
}

// Global performance tracking
class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  
  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }
  }
  
  getStats(): PerformanceStats {
    const current = this.metrics[this.metrics.length - 1] || null;
    const history = [...this.metrics];
    
    // Calculate averages
    const averages = {
      renderTime: this.average(this.metrics.map(m => m.componentRenderTime)),
      inputLatency: this.average(this.metrics.map(m => m.inputLatency)),
      guessProcessingTime: this.average(this.metrics.map(m => m.guessProcessingTime))
    };
    
    return { current, history, averages };
  }
  
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  clear(): void {
    this.metrics = [];
  }
}

const performanceTracker = new PerformanceTracker();

// Hook for monitoring component render performance
export function useRenderPerformance(componentName: string): void {
  const renderStartRef = useRef<number>();
  
  useEffect(() => {
    renderStartRef.current = performance.now();
    
    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        console.debug(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
}

// Hook for monitoring data loading performance
export function useDataLoadPerformance(): {
  startTiming: () => void;
  endTiming: () => void;
} {
  const startTimeRef = useRef<number>();
  
  const startTiming = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  const endTiming = useCallback(() => {
    if (startTimeRef.current) {
      const loadTime = performance.now() - startTimeRef.current;
      console.debug(`Data load time: ${loadTime.toFixed(2)}ms`);
    }
  }, []);
  
  return { startTiming, endTiming };
}

// Hook for monitoring input latency
export function useInputPerformance(): {
  measureInputLatency: (callback: () => void) => void;
} {
  const measureInputLatency = useCallback((callback: () => void) => {
    const start = performance.now();
    
    // Use RAF to measure after the next render
    requestAnimationFrame(() => {
      const latency = performance.now() - start;
      console.debug(`Input latency: ${latency.toFixed(2)}ms`);
      callback();
    });
  }, []);
  
  return { measureInputLatency };
}

// Hook for comprehensive performance monitoring
export function usePerformanceMonitor(): PerformanceStats {
  const [stats, setStats] = useState<PerformanceStats>({
    current: null,
    history: [],
    averages: { renderTime: 0, inputLatency: 0, guessProcessingTime: 0 }
  });
  
  useEffect(() => {
    const updateStats = () => {
      const fuzzyStats = getFuzzyCacheStats();
      const timerStats = getTimerStats();
      
      const metric: PerformanceMetrics = {
        componentRenderTime: 0, // Will be updated by individual components
        dataLoadTime: 0, // Will be updated by data loading
        fuzzyMatchTime: 0, // Will be updated by fuzzy matching
        fuzzyCacheSize: fuzzyStats?.size || 0,
        timerCallbacks: timerStats.activeCallbacks,
        inputLatency: 0, // Will be updated by input handling
        guessProcessingTime: 0, // Will be updated by guess processing
        timestamp: Date.now()
      };
      
      performanceTracker.addMetric(metric);
      setStats(performanceTracker.getStats());
    };
    
    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial update
    
    return () => clearInterval(interval);
  }, []);
  
  return stats;
}

// Utility for measuring function execution time
export function measurePerformance<T>(
  fn: () => T,
  label: string
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.debug(`${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Utility for measuring async function execution time
export async function measureAsyncPerformance<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.debug(`${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Performance monitoring for development
export function enablePerformanceLogging(): void {
  if (process.env.NODE_ENV === 'development') {
    // Log performance metrics to console every 10 seconds
    setInterval(() => {
      const stats = performanceTracker.getStats();
      if (stats.current) {
        console.group('🚀 Performance Metrics');
        console.log('Cache sizes:', {
          fuzzy: stats.current.fuzzyCacheSize,
          timers: stats.current.timerCallbacks
        });
        console.log('Averages:', stats.averages);
        console.groupEnd();
      }
    }, 10000);
  }
}

// Export performance tracker for advanced usage
export { performanceTracker };