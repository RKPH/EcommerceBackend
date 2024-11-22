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
        this.testSuiteName = ''; // To store the name of the current test suite
        this.testGroups = {}; // To dynamically group tests by the route's first segment (tag)
        this.testIndex = 1; // Index counter for test cases
    }

    onRunStart() {
        this.startTime = Date.now(); // Record the start time
        this.output += "========================================\n";
        this.output += " MongoDB connected successfully\n";
        this.output += "----------------------------------------\n";
    }

    onTestSuiteStart(testSuite) {
        console.log(`Test Suite Started: ${testSuite.name}`);  // Debugging line
        this.testSuiteName = testSuite.name; // Store the test suite name
        this.output += `\n========================================\n`;
        this.output += `[INFO] Test Suite: ${this.testSuiteName}\n`; // Use the stored test suite name
        this.output += "----------------------------------------\n";
    }

    onTestResult(testSuite, testResult) {
        testResult.testResults.forEach(test => {
            const status = test.status === 'passed' ? '✅ passed' : '❌ failed';
            const testName = test.fullName;
            const time = test.duration;
            const message = this.formatMessage(test);
            const { route, description, category } = this.extractRouteAndDescription(testName);

            // Initialize category in testGroups if it doesn't exist
            if (!this.testGroups[category]) {
                this.testGroups[category] = [];
            }

            // Group test results by category and include index
            this.testGroups[category].push({
                index: this.testIndex++, // Add index to each test case
                testName,
                route,
                description,
                status,
                time,
                message
            });
        });
    }

    onRunComplete(contexts, results) {
        const endTime = Date.now();
        const timeTaken = ((endTime - this.startTime) / 1000).toFixed(3); // Calculate total time in seconds

        this.output += "----------------------------------------\n";
        this.output += ` ✅ ${results.numPassedTests} Tests Passed\n`;
        this.output += "----------------------------------------\n";
        this.output += "\n========================================\n";
        this.output += "📊 Summary:\n";
        this.output += "----------------------------------------\n";
        this.output += `✔ Test Suites: ${results.numPassedTestSuites} Passed (${results.numTotalTestSuites} Total)\n`;
        this.output += `✔ Tests:       ${results.numPassedTests} Passed (${results.numTotalTests} Total)\n`;
        this.output += `✔ Time Taken:  ${timeTaken} seconds\n`;
        this.output += "========================================\n";

        // Dynamically group and output test results by category
        for (let category in this.testGroups) {
            this.output += `\n========================================\n`;
            this.output += `[INFO] ${category.toUpperCase()} Tests\n`;
            this.output += "----------------------------------------\n";
            this.testGroups[category].forEach(test => {
                this.output += `Test #${test.index}\n`; // Output the index for each test case
                this.output += `Route: ${test.route}\nTest case description: ${test.description}\nStatus: ${test.status} (${test.time} ms)\n`;
                if (test.message) {
                    this.output += `Failure Reason: ${test.message}\n`; // Include failure message if available
                }
                this.output += "____\n"; // Separator between test cases
            });
        }

        // Save to the file
        fs.writeFileSync('test-results.txt', this.output);
    }

    formatMessage(test) {
        if (test.status === 'failed') {
            // Clean up the failure messages by removing ANSI escape sequences
            const cleanedMessages = test.failureMessages.map(message => removeAnsiColors(message));
            return cleanedMessages.join(', '); // Join messages if there are multiple
        }
        return '';
    }

    extractRouteAndDescription(testName) {
        // Split the test name into parts
        const parts = testName.split(' ');

        // Identify the position of 'should' to separate route and description
        const shouldIndex = parts.indexOf('should');
        if (shouldIndex === -1) {
            return { route: '', description: '', category: '' }; // Default if format is unexpected
        }

        const route = parts.slice(3, shouldIndex).join(' '); // Extract route before 'should'
        const description = parts.slice(shouldIndex).join(' '); // Capture description starting from 'should'

        // Dynamically extract category based on the segment after /api/v1/
        const routeParts = route.split('/');
        const category = routeParts[3]; // Grabs the segment right after /api/v1/

        return { route, description, category };
    }
}

module.exports = CustomReporter;
