#!/usr/bin/env bun
/**
 * System Health Monitor
 * 
 * Monitors /health endpoint and logs for 520 prevention
 * 
 * Usage: bun scripts/health-monitor.ts [environment] [duration]
 * 
 * Example:
 *   bun scripts/health-monitor.ts dev 300  # Monitor DEV for 5 minutes
 *   bun scripts/health-monitor.ts prod 600 # Monitor PROD for 10 minutes
 */

import { $ } from "bun";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

interface HealthStatus {
  timestamp: string;
  httpCode: number;
  responseTime: number;
  body?: any;
  error?: string;
}

class HealthMonitor {
  private environment: "dev" | "prod";
  private duration: number; // seconds
  private interval: number; // seconds
  private healthUrl: string;
  private logPath: string;
  private checks: HealthStatus[] = [];

  constructor(environment: "dev" | "prod", duration: number = 300, interval: number = 5) {
    this.environment = environment;
    this.duration = duration;
    this.interval = interval;
    this.healthUrl = environment === "dev"
      ? "http://localhost:50430/health"
      : "https://neighborgigs.dev/health";
    this.logPath = environment === "dev"
      ? "/dev/shm/zosite.log"
      : "/dev/shm/prod.log";
  }

  async run() {
    console.log(
      `\n${colors.bold}${colors.blue}🏥 System Health Monitor${colors.reset}`,
    );
    console.log(`Environment: ${colors.yellow}${this.environment.toUpperCase()}${colors.reset}`);
    console.log(`Duration: ${colors.yellow}${this.duration} seconds${colors.reset}`);
    console.log(`Interval: ${colors.yellow}${this.interval} seconds${colors.reset}`);
    console.log(`Health URL: ${colors.yellow}${this.healthUrl}${colors.reset}\n`);

    const endTime = Date.now() + (this.duration * 1000);

    console.log(`${colors.blue}Starting monitor...${colors.reset}\n`);

    while (Date.now() < endTime) {
      await this.checkHealth();
      await this.checkLogs();
      await this.sleep(this.interval * 1000);
    }

    console.log(`\n${colors.blue}Monitoring complete${colors.reset}`);
    this.generateReport();
  }

  async checkHealth() {
    const startTime = Date.now();
    
    try {
      const response = await fetch(this.healthUrl, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      const httpCode = response.status;

      let body: any = null;
      if (response.ok) {
        try {
          body = await response.json();
        } catch {
          body = { error: "Could not parse JSON" };
        }
      }

      const status: HealthStatus = {
        timestamp: new Date().toISOString(),
        httpCode,
        responseTime,
        body,
      };

      this.checks.push(status);

      // Real-time output
      if (httpCode === 200) {
        console.log(`${colors.green}✅${colors.reset} ${this.getTime()} | HTTP ${httpCode} | ${responseTime}ms | ${body?.status || "unknown"}`);
      } else if (httpCode >= 500) {
        console.log(`${colors.red}❌${colors.reset} ${this.getTime()} | HTTP ${httpCode} | ${responseTime}ms | ERROR`);
      } else {
        console.log(`${colors.yellow}⚠️ ${colors.reset} ${this.getTime()} | HTTP ${httpCode} | ${responseTime}ms | ${body?.error || "unknown"}`);
      }

      // Alert on slow response
      if (responseTime > 5000) {
        console.log(`${colors.yellow}⚠️  Slow response detected: ${responseTime}ms${colors.reset}`);
      }

      // Alert on 520 or 502
      if (httpCode === 520 || httpCode === 502) {
        console.log(`${colors.red}🚨 520/502 Error detected!${colors.reset}`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const status: HealthStatus = {
        timestamp: new Date().toISOString(),
        httpCode: 0,
        responseTime,
        error: String(error),
      };

      this.checks.push(status);

      console.log(`${colors.red}❌${colors.reset} ${this.getTime()} | Connection failed | ${responseTime}ms | ${String(error)}`);
    }
  }

  async checkLogs() {
    try {
      const exists = await Bun.file(this.logPath).exists();
      if (!exists) {
        return;
      }

      const logs = await $`tail -n 10 ${this.logPath}`.text();
      const errorLines = logs
        .split("\n")
        .filter((line) =>
          line.includes("error") ||
          line.includes("crash") ||
          line.includes("520") ||
          line.includes("segfault") ||
          line.includes("upstream prematurely")
        );

      if (errorLines.length > 0) {
        console.log(`${colors.red}🚨 Recent errors in logs:${colors.reset}`);
        errorLines.forEach((line) => {
          console.log(`  ${colors.dim}${line}${colors.reset}`);
        });
      }
    } catch {
      // Log file not accessible - that's fine
    }
  }

  private getTime(): string {
    return new Date().toLocaleTimeString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateReport() {
    console.log(`\n${colors.bold}${colors.blue}📊 Health Monitor Report${colors.reset}`);
    console.log(`Duration: ${this.duration} seconds`);
    console.log(`Total Checks: ${this.checks.length}`);
    console.log(`Start: ${this.checks[0]?.timestamp || "N/A"}`);
    console.log(`End: ${this.checks[this.checks.length - 1]?.timestamp || "N/A"}\n`);

    // Success rate
    const successful = this.checks.filter((c) => c.httpCode === 200).length;
    const failed = this.checks.filter((c) => c.httpCode >= 500).length;
    const errors = this.checks.filter((c) => c.httpCode === 520 || c.httpCode === 502).length;

    console.log(`${colors.bold}Results:${colors.reset}`);
    console.log(`  ${colors.green}✅ Success (200):${colors.reset} ${successful}`);
    console.log(`  ${colors.red}❌ Failures (5xx):${colors.reset} ${failed}`);
    console.log(`  ${colors.red}🚨 520/502 Errors:${colors.reset} ${errors}`);

    if (errors > 0) {
      console.log(`\n${colors.red}${colors.bold}CRITICAL: 520 errors detected!${colors.reset}`);
      console.log(`${colors.yellow}Immediate action required:${colors.reset}`);
      console.log(`  1. Check logs: tail -f ${this.logPath}`);
      console.log(`  2. Run diagnostic: bun scripts/520-diagnose.ts ${this.environment}`);
      console.log(`  3. If PROD, consider rollback`);
    }

    // Response time statistics
    if (this.checks.length > 0) {
      const responseTimes = this.checks
        .filter((c) => c.httpCode === 200)
        .map((c) => c.responseTime);

      if (responseTimes.length > 0) {
        const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const max = Math.max(...responseTimes);
        const min = Math.min(...responseTimes);

        console.log(`\n${colors.bold}Response Times (successful):${colors.reset}`);
        console.log(`  Average: ${Math.round(avg)}ms`);
        console.log(`  Min: ${min}ms`);
        console.log(`  Max: ${max}ms`);

        if (max > 5000) {
          console.log(`${colors.yellow}⚠️  Max response time > 5s - potential timeout issue${colors.reset}`);
        }
      }
    }

    // Log analysis
    console.log(`\n${colors.bold}Log Analysis:${colors.reset}`);
    console.log(`  Logs: ${this.logPath}`);
    console.log(`  Check with: tail -f ${this.logPath}`);

    // Recommendations
    console.log(`\n${colors.bold}Recommendations:${colors.reset}`);
    
    if (errors > 0) {
      console.log(`${colors.red}  ⚠️  520 errors detected - immediate action required${colors.reset}`);
    } else if (failed > 0) {
      console.log(`${colors.yellow}  ⚠️  Some failures detected - check logs${colors.reset}`);
    } else {
      console.log(`${colors.green}  ✅ No issues detected - system healthy${colors.reset}`);
    }

    console.log(`\n${colors.blue}For 520 diagnostic:${colors.reset}`);
    console.log(`  bun scripts/520-diagnose.ts [domain] ${this.environment}`);

    // Save report
    this.saveReport();
  }

  async saveReport() {
    const reportPath = `/home/workspace/neighborgigs/docs/health-report-${this.environment}-${new Date().toISOString().split("T")[0]}.md`;
    
    let report = `# System Health Monitor Report\n\n`;
    report += `**Environment:** ${this.environment.toUpperCase()}\n`;
    report += `**Duration:** ${this.duration} seconds\n`;
    report += `**Health URL:** ${this.healthUrl}\n`;
    report += `**Report Date:** ${new Date().toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Checks:** ${this.checks.length}\n`;
    
    const successful = this.checks.filter((c) => c.httpCode === 200).length;
    const failed = this.checks.filter((c) => c.httpCode >= 500).length;
    const errors = this.checks.filter((c) => c.httpCode === 520 || c.httpCode === 502).length;
    
    report += `- **Successful (200):** ${successful}\n`;
    report += `- **Failures (5xx):** ${failed}\n`;
    report += `- **520/502 Errors:** ${errors}\n\n`;

    if (this.checks.length > 0) {
      const responseTimes = this.checks
        .filter((c) => c.httpCode === 200)
        .map((c) => c.responseTime);

      if (responseTimes.length > 0) {
        const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const max = Math.max(...responseTimes);
        const min = Math.min(...responseTimes);

        report += `## Response Times (Successful)\n\n`;
        report += `- **Average:** ${Math.round(avg)}ms\n`;
        report += `- **Min:** ${min}ms\n`;
        report += `- **Max:** ${max}ms\n\n`;
      }
    }

    report += `## Individual Checks\n\n`;
    this.checks.forEach((check, index) => {
      report += `### Check ${index + 1}\n`;
      report += `- **Timestamp:** ${check.timestamp}\n`;
      report += `- **HTTP Code:** ${check.httpCode}\n`;
      report += `- **Response Time:** ${check.responseTime}ms\n`;
      
      if (check.body) {
        report += `- **Body:** ${JSON.stringify(check.body)}\n`;
      }
      
      if (check.error) {
        report += `- **Error:** ${check.error}\n`;
      }
      report += `\n`;
    });

    report += `## Recommendations\n\n`;
    
    if (errors > 0) {
      report += `⚠️ **CRITICAL:** 520 errors detected - immediate action required\n\n`;
      report += `### Immediate Actions\n`;
      report += `1. Check logs: \`tail -f ${this.logPath}\`\n`;
      report += `2. Run diagnostic: \`bun scripts/520-diagnose.ts [domain] ${this.environment}\`\n`;
      report += `3. If PROD: Consider rollback\n`;
    } else if (failed > 0) {
      report += `⚠️ **WARNING:** Some failures detected - investigate logs\n\n`;
    } else if (successful === this.checks.length) {
      report += `✅ **HEALTHY:** All checks passed\n\n`;
    }

    report += `## Log Analysis\n\n`;
    report += `\`\`\`bash\n`;
    report += `# View real-time logs\n`;
    report += `tail -f ${this.logPath}\n\n`;
    report += `# View recent errors\n`;
    report += `tail -n 50 ${this.logPath} | grep -i error\n\n`;
    report += `# View 520 specific errors\n`;
    report += `tail -n 50 ${this.logPath} | grep 520\n`;
    report += `\`\`\`\n\n`;

    try {
      await Bun.write(reportPath, report);
      console.log(`\n${colors.blue}📄 Report saved to: ${reportPath}${colors.reset}`);
    } catch (error) {
      console.log(`\n${colors.red}❌ Could not save report: ${error}${colors.reset}`);
    }
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const environment = (args[0] || "dev").toLowerCase() as "dev" | "prod";
  const duration = parseInt(args[1] || "300", 10); // Default 5 minutes

  if (environment !== "dev" && environment !== "prod") {
    console.log(`Usage: bun scripts/health-monitor.ts [dev|prod] [duration_seconds]`);
    console.log(`Example: bun scripts/health-monitor.ts dev 300`);
    console.log(`Example: bun scripts/health-monitor.ts prod 600`);
    process.exit(1);
  }

  const monitor = new HealthMonitor(environment, duration);
  await monitor.run();
}
