const fs = require('fs');

// Utility function to remove ANSI escape sequences (for color)
const removeAnsiColors = (str) => {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
};

class CustomReporter {
    constructor(globalConfig) {
        this.globalConfig = globalConfig;
        this.output = ''; // Holds the output to be written to the file
        this.startTime = null;
        this.testCategories = {}; // To dynamically group tests by category
    }

    onRunStart() {
        this.startTime = Date.now(); // Record the start time
        this.output += "========================================\n";
        this.output += " MongoDB connected successfully\n";
        this.output += "----------------------------------------\n";
    }

    async onTestResult(testSuite, testResult) {
        for (const test of testResult.testResults) {
            const status = test.status === 'passed' ? '✅ passed' : '❌ failed';
            const { route, description, category } = this.extractRouteAndDescription(test.fullName);

            // Initialize the category if it doesn't exist
            if (!this.testCategories[category]) {
                this.testCategories[category] = { index: 1, tests: [] };
            }

            // Add the test to the category
            this.testCategories[category].tests.push({
                index: this.testCategories[category].index++, // Use category-specific indexing
                route,
                description,
                status,
                time: test.duration || 'N/A',
                message: this.formatMessage(test),
            });

            // Console log each test with a 1-second delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log(`[${category}] Route: ${route} | Description: ${description} | Status: ${status}`);
        }
    }

    onRunComplete(contexts, results) {
        const endTime = Date.now();
        const timeTaken = ((endTime - this.startTime) / 1000).toFixed(3);

        this.output += "\n========================================\n";
        this.output += "📊 Summary:\n";
        this.output += "----------------------------------------\n";
        this.output += `✔ Test Suites: ${results.numPassedTestSuites} Passed (${results.numTotalTestSuites} Total)\n`;
        this.output += `✔ Tests:       ${results.numPassedTests} Passed (${results.numTotalTests} Total)\n`;
        this.output += `✔ Time Taken:  ${timeTaken} seconds\n`;
        this.output += "========================================\n";

        // Group and output test results by category
        for (const category in this.testCategories) {
            this.output += `\n========================================\n`;
            this.output += `[INFO] ${category.toUpperCase()} Tests\n`;
            this.output += "----------------------------------------\n";
            this.testCategories[category].tests.forEach((test) => {
                this.output += `Test #${test.index}\n`;
                this.output += `Route: ${test.route}\nDescription: ${test.description}\nStatus: ${test.status}\n`;
                if (test.time !== 'N/A') this.output += `Time: ${test.time} ms\n`;
                if (test.message) this.output += `Failure Reason: ${test.message}\n`;
                this.output += "____\n";
            });
        }

        fs.writeFileSync('test-results.txt', this.output);
    }

    formatMessage(test) {
        if (test.status === 'failed') {
            const cleanedMessages = test.failureMessages.map((msg) => removeAnsiColors(msg));
            return cleanedMessages.join(', ');
        }
        return '';
    }

    extractRouteAndDescription(testName) {
        const parts = testName.split(' ');
        const shouldIndex = parts.indexOf('should');
        if (shouldIndex === -1) return { route: '', description: '', category: 'Uncategorized' };

        const route = parts.slice(3, shouldIndex).join(' '); // Extract route before 'should'
        const description = parts.slice(shouldIndex + 1).join(' '); // Capture description starting from 'should'

        // Extract category based on the first meaningful segment of the route
        const routeParts = route.split('/');
        const category = routeParts[3] || 'Uncategorized';

        return { route, description, category };
    }
}

module.exports = CustomReporter;


