const { performance } = require('perf_hooks');

/**
 * Tests de performance pour Dofus Organizer v0.2.0
 * Valide que les objectifs de performance sont atteints
 */

// Import des modules à tester
const EventBus = require('../src/core/EventBus');
const CacheManager = require('../src/core/CacheManager');
const PerformanceMonitor = require('../src/core/PerformanceMonitor');

class PerformanceTests {
  constructor() {
    this.results = [];
    this.thresholds = {
      shortcut_activation: 50,      // 50ms max
      window_detection: 100,        // 100ms max
      cache_access: 5,              // 5ms max
      event_emission: 10,           // 10ms max
      memory_usage: 100 * 1024 * 1024 // 100MB max
    };
  }

  /**
   * Exécute tous les tests de performance
   */
  async runAllTests() {
    console.log('🚀 Starting Dofus Organizer v0.2.0 Performance Tests...\n');
    
    try {
      await this.testEventBusPerformance();
      await this.testCacheManagerPerformance();
      await this.testPerformanceMonitorOverhead();
      await this.testMemoryUsage();
      await this.testConcurrentOperations();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test des performances de l'EventBus
   */
  async testEventBusPerformance() {
    console.log('📡 Testing EventBus Performance...');
    
    const eventBus = new EventBus();
    const iterations = 10000;
    
    // Test d'émission d'événements
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      eventBus.emit('test-event', { data: i });
    }
    
    const duration = performance.now() - startTime;
    const avgTime = duration / iterations;
    
    this.recordResult('event_emission', avgTime, this.thresholds.event_emission);
    
    console.log(`   ✓ Event emission: ${avgTime.toFixed(3)}ms avg (${iterations} events)`);
    
    // Test avec listeners
    let callCount = 0;
    eventBus.on('performance-test', () => { callCount++; });
    
    const listenerStartTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      eventBus.emit('performance-test', { data: i });
    }
    
    const listenerDuration = performance.now() - listenerStartTime;
    const avgListenerTime = listenerDuration / iterations;
    
    this.recordResult('event_with_listener', avgListenerTime, this.thresholds.event_emission);
    
    console.log(`   ✓ Event with listener: ${avgListenerTime.toFixed(3)}ms avg`);
    console.log(`   ✓ Listener calls: ${callCount}/${iterations}\n`);
  }

  /**
   * Test des performances du CacheManager
   */
  async testCacheManagerPerformance() {
    console.log('💾 Testing CacheManager Performance...');
    
    const cache = new CacheManager({ maxSize: 1000, defaultTTL: 60000 });
    const iterations = 10000;
    
    // Test d'écriture
    const writeStartTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      cache.set(`key-${i}`, { data: `value-${i}`, timestamp: Date.now() });
    }
    
    const writeDuration = performance.now() - writeStartTime;
    const avgWriteTime = writeDuration / iterations;
    
    this.recordResult('cache_write', avgWriteTime, this.thresholds.cache_access);
    
    console.log(`   ✓ Cache write: ${avgWriteTime.toFixed(3)}ms avg`);
    
    // Test de lecture
    const readStartTime = performance.now();
    let hitCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const value = cache.get(`key-${i}`);
      if (value) hitCount++;
    }
    
    const readDuration = performance.now() - readStartTime;
    const avgReadTime = readDuration / iterations;
    
    this.recordResult('cache_read', avgReadTime, this.thresholds.cache_access);
    
    console.log(`   ✓ Cache read: ${avgReadTime.toFixed(3)}ms avg`);
    console.log(`   ✓ Hit rate: ${(hitCount / iterations * 100).toFixed(1)}%`);
    
    // Test de performance avec getOrSet
    const factoryCallCount = { count: 0 };
    
    const getOrSetStartTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      await cache.getOrSet(`factory-key-${i % 100}`, async () => {
        factoryCallCount.count++;
        return { computed: `value-${i}` };
      });
    }
    
    const getOrSetDuration = performance.now() - getOrSetStartTime;
    const avgGetOrSetTime = getOrSetDuration / 1000;
    
    this.recordResult('cache_get_or_set', avgGetOrSetTime, this.thresholds.cache_access * 2);
    
    console.log(`   ✓ Cache getOrSet: ${avgGetOrSetTime.toFixed(3)}ms avg`);
    console.log(`   ✓ Factory calls: ${factoryCallCount.count}/1000 (cache efficiency)\n`);
  }

  /**
   * Test de l'overhead du PerformanceMonitor
   */
  async testPerformanceMonitorOverhead() {
    console.log('📊 Testing PerformanceMonitor Overhead...');
    
    const monitor = new PerformanceMonitor();
    const iterations = 10000;
    
    // Test sans monitoring
    const noMonitorStartTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // Opération simple
      Math.sqrt(i);
    }
    
    const noMonitorDuration = performance.now() - noMonitorStartTime;
    
    // Test avec monitoring
    const withMonitorStartTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      monitor.measure('test_operation', () => {
        Math.sqrt(i);
      });
    }
    
    const withMonitorDuration = performance.now() - withMonitorStartTime;
    
    const overhead = withMonitorDuration - noMonitorDuration;
    const overheadPerOperation = overhead / iterations;
    
    this.recordResult('monitor_overhead', overheadPerOperation, 1); // 1ms max overhead
    
    console.log(`   ✓ Without monitoring: ${noMonitorDuration.toFixed(2)}ms total`);
    console.log(`   ✓ With monitoring: ${withMonitorDuration.toFixed(2)}ms total`);
    console.log(`   ✓ Overhead: ${overheadPerOperation.toFixed(4)}ms per operation`);
    console.log(`   ✓ Overhead percentage: ${(overhead / noMonitorDuration * 100).toFixed(2)}%\n`);
  }

  /**
   * Test d'utilisation mémoire
   */
  async testMemoryUsage() {
    console.log('🧠 Testing Memory Usage...');
    
    const initialMemory = process.memoryUsage();
    
    // Créer plusieurs instances pour simuler l'utilisation
    const eventBus = new EventBus();
    const cache = new CacheManager({ maxSize: 1000 });
    const monitor = new PerformanceMonitor();
    
    // Remplir le cache
    for (let i = 0; i < 1000; i++) {
      cache.set(`test-key-${i}`, {
        data: `test-data-${i}`,
        timestamp: Date.now(),
        metadata: { index: i, type: 'test' }
      });
    }
    
    // Enregistrer des métriques
    for (let i = 0; i < 1000; i++) {
      monitor.record('test_metric', Math.random() * 100);
    }
    
    // Enregistrer des listeners
    for (let i = 0; i < 100; i++) {
      eventBus.on(`test-event-${i}`, () => {});
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    this.recordResult('memory_usage', memoryIncrease, this.thresholds.memory_usage);
    
    console.log(`   ✓ Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✓ Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✓ Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✓ Memory efficiency: ${memoryIncrease < this.thresholds.memory_usage ? 'PASS' : 'FAIL'}\n`);
  }

  /**
   * Test d'opérations concurrentes
   */
  async testConcurrentOperations() {
    console.log('⚡ Testing Concurrent Operations...');
    
    const eventBus = new EventBus();
    const cache = new CacheManager({ maxSize: 500 });
    const monitor = new PerformanceMonitor();
    
    const concurrentOperations = 100;
    const operationsPerTask = 100;
    
    const startTime = performance.now();
    
    // Créer des opérations concurrentes
    const promises = [];
    
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(this.performConcurrentTask(i, operationsPerTask, eventBus, cache, monitor));
    }
    
    await Promise.all(promises);
    
    const duration = performance.now() - startTime;
    const totalOperations = concurrentOperations * operationsPerTask;
    const avgTimePerOperation = duration / totalOperations;
    
    this.recordResult('concurrent_operations', avgTimePerOperation, 1); // 1ms max per operation
    
    console.log(`   ✓ Concurrent tasks: ${concurrentOperations}`);
    console.log(`   ✓ Operations per task: ${operationsPerTask}`);
    console.log(`   ✓ Total operations: ${totalOperations}`);
    console.log(`   ✓ Total time: ${duration.toFixed(2)}ms`);
    console.log(`   ✓ Avg time per operation: ${avgTimePerOperation.toFixed(4)}ms\n`);
  }

  /**
   * Tâche concurrente pour les tests
   */
  async performConcurrentTask(taskId, operations, eventBus, cache, monitor) {
    for (let i = 0; i < operations; i++) {
      // Opération de cache
      await cache.getOrSet(`task-${taskId}-key-${i}`, async () => {
        return { taskId, operation: i, timestamp: Date.now() };
      });
      
      // Émission d'événement
      eventBus.emit('concurrent-test', { taskId, operation: i });
      
      // Enregistrement de métrique
      monitor.record('concurrent_operation', Math.random() * 10);
    }
  }

  /**
   * Enregistre un résultat de test
   */
  recordResult(testName, actualValue, threshold) {
    const passed = actualValue <= threshold;
    
    this.results.push({
      test: testName,
      actual: actualValue,
      threshold: threshold,
      passed: passed,
      performance: passed ? 'EXCELLENT' : actualValue <= threshold * 1.5 ? 'GOOD' : 'POOR'
    });
  }

  /**
   * Génère le rapport final
   */
  generateReport() {
    console.log('📋 Performance Test Report');
    console.log('=' .repeat(50));
    
    let passedTests = 0;
    let totalTests = this.results.length;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const unit = result.test.includes('memory') ? ' bytes' : 'ms';
      
      console.log(`${status} ${result.test}`);
      console.log(`     Actual: ${result.actual.toFixed(4)}${unit}`);
      console.log(`     Threshold: ${result.threshold}${unit}`);
      console.log(`     Performance: ${result.performance}`);
      console.log('');
      
      if (result.passed) passedTests++;
    });
    
    console.log('=' .repeat(50));
    console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
    console.log(`🎯 Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All performance targets met! v0.2.0 is ready for release.');
    } else {
      console.log('⚠️  Some performance targets not met. Optimization needed.');
      process.exit(1);
    }
  }
}

// Exécuter les tests si ce fichier est lancé directement
if (require.main === module) {
  const tests = new PerformanceTests();
  tests.runAllTests().catch(console.error);
}

module.exports = PerformanceTests;