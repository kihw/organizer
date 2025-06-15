class PerformanceMonitor {
    constructor() {
        this.metrics = {
            summary: {
                totalOperations: 0,
                totalTime: 0,
                averageTime: 0
            },
            operations: []
        };
    }

    measure(operationName, callback) {
        const startTime = Date.now();
        const result = callback();
        const endTime = Date.now();
        const timeElapsed = endTime - startTime;

        this.recordOperation(operationName, timeElapsed);

        return result;
    }

    async measureAsync(operationName, callback) {
        const startTime = Date.now();
        const result = await callback();
        const endTime = Date.now();
        const timeElapsed = endTime - startTime;

        this.recordOperation(operationName, timeElapsed);

        return result;
    }

    recordOperation(operationName, timeElapsed) {
        this.metrics.operations.push({
            name: operationName,
            time: timeElapsed
        });

        this.metrics.summary.totalOperations++;
        this.metrics.summary.totalTime += timeElapsed;
        this.metrics.summary.averageTime =
            this.metrics.summary.totalTime / this.metrics.summary.totalOperations;
    }

    getReport() {
        return {
            summary: {
                totalOperations: this.metrics.summary.totalOperations,
                totalTime: this.metrics.summary.totalTime,
                averageTime: this.metrics.summary.averageTime
            },
            operations: this.metrics.operations
        };
    }
}

module.exports = PerformanceMonitor;