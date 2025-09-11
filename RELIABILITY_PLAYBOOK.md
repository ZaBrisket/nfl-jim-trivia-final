# Reliability & Testing Playbook

This playbook documents the patterns, practices, and standards established during the reliability hardening initiative. Use this guide when adding new modules or maintaining existing ones.

## Guard Patterns

### Input Validation Pattern
```typescript
function validateInput(input: unknown): ValidType {
  if (typeof input !== 'expected_type') {
    throw new CustomError('Input must be expected_type', 'INVALID_INPUT');
  }
  
  if (input.length > MAX_LENGTH) {
    throw new CustomError(`Input too long: ${input.length} > ${MAX_LENGTH}`, 'INVALID_INPUT');
  }
  
  return input;
}
```

### Error Handling Pattern
```typescript
export class ModuleError extends Error {
  constructor(
    message: string,
    public readonly code: 'ERROR_CODE',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ModuleError';
  }
}

function riskyOperation(): Result {
  try {
    // Operation logic
    return result;
  } catch (error) {
    if (error instanceof ModuleError) {
      throw error;
    }
    throw new ModuleError(
      'Operation failed',
      'OPERATION_ERROR',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
```

### Timeout & Retry Pattern
```typescript
async function reliableNetworkCall(url: string): Promise<Response> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
  const retries = isTest ? 1 : 2;
  const backoffMs = isTest ? 100 : 300;
  const timeoutMs = isTest ? 1000 : 5000;
  
  return fetchWithRetry(url, {}, retries, backoffMs, timeoutMs);
}
```

### Memory Bounds Pattern
```typescript
class BoundedDataStructure<T> {
  private data: T[] = [];
  private readonly maxSize: number;
  
  constructor(maxSize: number) {
    this.maxSize = Math.max(1, Math.floor(maxSize));
  }
  
  add(item: T): void {
    if (this.data.length >= this.maxSize) {
      this.data.shift(); // Remove oldest
    }
    this.data.push(item);
  }
}
```

## Testing Patterns

### Deterministic Testing Pattern
```typescript
describe('Module with time dependencies', () => {
  let mockTime: MockTimeProvider;

  beforeEach(() => {
    mockTime = new MockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it('should handle time-based logic deterministically', () => {
    mockTime.setTime(1000000);
    // Test logic
    mockTime.advance(5000);
    // More test logic
  });
});
```

### Error Scenario Testing Pattern
```typescript
describe('error handling', () => {
  it('should handle network failures gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    
    const result = await serviceCall();
    
    expect(result.status.ready).toBe(true);
    expect(result.status.partial).toBe(true);
    expect(result.status.details).toContain('fallback');
  });

  it('should validate input parameters', () => {
    const invalidInputs = [null, undefined, '', 'x'.repeat(1000)];
    
    invalidInputs.forEach(input => {
      expect(() => functionCall(input as any)).toThrow(CustomError);
    });
  });
});
```

### Cache Testing Pattern
```typescript
describe('cache behavior', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should respect memory bounds', () => {
    // Fill cache beyond limit
    for (let i = 0; i < 1100; i++) {
      performCacheableOperation(`item${i}`);
    }
    
    const stats = getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
  });
});
```

## How to Add a New Hardened Module

### 1. Identify Failure Modes
- **External I/O:** Network timeouts, connection failures, malformed responses
- **Data Processing:** Invalid inputs, type errors, memory exhaustion
- **State Management:** Race conditions, invalid transitions, corruption
- **Time Dependencies:** Clock skew, non-deterministic behavior
- **Resource Management:** Memory leaks, unbounded growth, quota limits

### 2. Implement Guard Patterns
```typescript
// 1. Input validation
function validateInputs(params: unknown): ValidatedParams {
  // Type checking, bounds checking, sanitization
}

// 2. Error handling
export class ModuleError extends Error {
  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'ModuleError';
  }
}

// 3. Resource bounds
const MAX_ITEMS = 1000;
const MAX_STRING_LENGTH = 500;

// 4. Timeout handling
const TIMEOUT_MS = process.env.VITEST ? 1000 : 5000;
```

### 3. Write Comprehensive Tests
```typescript
describe('NewModule', () => {
  describe('happy path', () => {
    // Normal operation tests
  });

  describe('error scenarios', () => {
    // Network failures, invalid inputs, edge cases
  });

  describe('edge cases', () => {
    // Boundary conditions, extreme inputs, race conditions
  });

  describe('resource management', () => {
    // Memory bounds, cleanup, quota handling
  });
});
```

### 4. Checklist for New Modules
- [ ] All public functions have input validation
- [ ] All external calls have timeouts and retries
- [ ] All data structures have memory bounds
- [ ] All errors are structured with codes
- [ ] All time dependencies are injectable
- [ ] All tests are deterministic (no sleeps, seeded randomness)
- [ ] Coverage ≥ 85% lines/branches on critical paths
- [ ] No unhandled promise rejections
- [ ] Resource cleanup on all error paths

## CI Requirements

### Test Configuration
```javascript
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    testTimeout: 15000
  }
});
```

### Coverage Thresholds
- **Critical modules:** ≥ 85% line coverage, ≥ 90% branch coverage
- **Utility modules:** ≥ 75% line coverage, ≥ 85% branch coverage
- **Integration modules:** ≥ 60% line coverage, ≥ 70% branch coverage

### Flakiness Detection
```yaml
# CI Pipeline
- name: Run flakiness check
  run: |
    npm test -- --run
    npm test -- --run  # Run twice to detect flakiness
```

## Reliability Standards

### Error Handling Standards
1. **No silent failures** - All errors must be logged or thrown
2. **Structured errors** - Use custom error classes with codes
3. **Graceful degradation** - Fallback mechanisms for all external dependencies
4. **Resource cleanup** - Cleanup on all error paths

### Input Validation Standards
1. **Type checking** - Runtime validation of all inputs
2. **Bounds checking** - Length, size, and range validation
3. **Sanitization** - Clean and normalize all external data
4. **Fail fast** - Validate early, fail with clear messages

### Testing Standards
1. **Deterministic** - No sleeps, fixed time, seeded randomness
2. **Isolated** - Clean state between tests
3. **Comprehensive** - Happy path + error scenarios + edge cases
4. **Fast** - Unit tests complete in < 5 seconds

### Performance Standards
1. **Memory bounds** - All data structures have size limits
2. **Timeout limits** - All async operations have timeouts
3. **Cache management** - LRU eviction for bounded memory usage
4. **Resource cleanup** - Timers, listeners, connections properly cleaned

## Monitoring & Observability

### Health Checks
```typescript
export function getModuleHealth(): {
  healthy: boolean;
  errors: string[];
  stats: Record<string, number>;
} {
  // Return module health status
}
```

### Performance Monitoring
```typescript
export function getPerformanceStats(): {
  cacheHitRate: number;
  averageLatency: number;
  errorRate: number;
  memoryUsage: number;
} {
  // Return performance metrics
}
```

### Logging Standards
```typescript
// Use structured logging
console.error('Operation failed', {
  operation: 'fetchData',
  error: error.message,
  context: { url, retries, timeout }
});
```

This playbook ensures consistent reliability patterns across the entire codebase.