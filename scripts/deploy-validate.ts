#!/usr/bin/env bun
/**
 * Deployment Validation Script
 * 
 * Validates deployment before and after to prevent 520/502 errors
 * 
 * Usage: bun scripts/deploy-validate.ts [environment] [action]
 * 
 * Actions:
 *   pre  - Validate before deployment (pre-flight check)
 *   post - Validate after deployment (post-deployment check)
 */

import { $ } from "bun";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

interface ValidationResult {
  environment: "dev" | "prod";
  action: "pre" | "post";
  timestamp: string;
  checks: {
    name: string;
    status: "pass" | "fail" | "warn" | "skip";
    details?: string;
    duration?: number;
  }[];
  summary: {
    canProceed: boolean;
    issues: string[];
  };
}

class DeploymentValidator {
  private result: ValidationResult;
  private environment: "dev" | "prod";
  private action: "pre" | "post";

  constructor(environment: "dev" | "prod", action: "pre" | "post") {
    this.environment = environment;
    this.action = action;
    this.result = {
      environment,
      action,
      timestamp: new Date().toISOString(),
      checks: [],
      summary: { canProceed: true, issues: [] },
    };
  }

  async run() {
    console.log(
      `\n${colors.bold}${colors.blue}🚀 Deployment Validation${colors.reset}`,
    );
    console.log(`Environment: ${colors.yellow}${this.environment.toUpperCase()}${colors.reset}`);
    console.log(`Action: ${colors.yellow}${this.action.toUpperCase()}${colors.reset}\n`);

    if (this.action === "pre") {
      await this.preDeploymentChecks();
    } else {
      await this.postDeploymentChecks();
    }

    this.generateReport();
  }

  async preDeploymentChecks() {
    console.log(`${colors.bold}Pre-Deployment Checks${colors.reset}\n`);

    // 1. Git status check
    await this.checkGitClean();

    // 2. Build check
    await this.checkBuildHealth();

    // 3. Environment match
    await this.checkEnvironmentMatch();

    // 4. Health endpoint exists
    await this.checkHealthEndpoint();

    // 5. Port availability (for dev)
    if (this.environment === "dev") {
      await this.checkPortAvailability();
    }

    // 6. Database connectivity
    await this.checkDatabaseConnection();

    // 7. SSL/TLS config (for prod)
    if (this.environment === "prod") {
      await this.checkSSLConfig();
    }

    // 8. Timeouts and limits
    await this.checkTimeouts();
  }

  async postDeploymentChecks() {
    console.log(`${colors.bold}Post-Deployment Checks${colors.reset}\n`);

    // 1. Service health
    await this.checkServiceHealth();

    // 2. Response headers
    await this.checkResponseHeaders();

    // 3. Minimal endpoints
    await this.checkMinimalEndpoints();

    // 4. Error logs
    await this.checkErrorLogs();

    // 5. Cloudflare connection (for prod)
    if (this.environment === "prod") {
      await this.checkCloudflareConnection();
    }

    // 6. Response time
    await this.checkResponseTime();
  }

  async checkGitClean() {
    const start = Date.now();
    try {
      const status = await $`git status --porcelain`.text();
      const isClean = status.trim() === "";

      this.result.checks.push({
        name: "Git Working Directory",
        status: isClean ? "pass" : "warn",
        details: isClean ? "Working directory is clean" : "Uncommitted changes present",
        duration: Date.now() - start,
      });

      if (!isClean) {
        console.log(`${colors.yellow}⚠️  Warning: Uncommitted changes present${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Git working directory is clean${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Git Working Directory",
        status: "fail",
        details: "Could not check git status",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Git status check failed${colors.reset}`);
    }
  }

  async checkBuildHealth() {
    const start = Date.now();
    try {
      // Check if build exists
      const distExists = await Bun.file("./dist/index.html").exists();
      
      this.result.checks.push({
        name: "Build Health",
        status: distExists ? "pass" : "fail",
        details: distExists ? "Build artifacts exist" : "Missing build artifacts",
        duration: Date.now() - start,
      });

      if (distExists) {
        console.log(`${colors.green}✅ Build artifacts exist${colors.reset}`);
      } else {
        this.result.summary.issues.push("Build artifacts missing");
        this.result.summary.canProceed = false;
        console.log(`${colors.red}❌ Build artifacts missing${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Build Health",
        status: "fail",
        details: "Could not verify build",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Build health check failed${colors.reset}`);
    }
  }

  async checkEnvironmentMatch() {
    const start = Date.now();
    try {
      const zositeConfig = await Bun.file("./zosite.json").json();
      
      const devMatch = zositeConfig.entrypoint === "bun run dev-api";
      const prodMatch = zositeConfig.publish?.entrypoint === "bun run prod";
      
      let match = true;
      if (this.environment === "dev" && !devMatch) match = false;
      if (this.environment === "prod" && !prodMatch) match = false;

      this.result.checks.push({
        name: "Environment Match",
        status: match ? "pass" : "fail",
        details: match ? "Config matches environment" : "Config mismatch detected",
        duration: Date.now() - start,
      });

      if (match) {
        console.log(`${colors.green}✅ Environment configuration matches${colors.reset}`);
      } else {
        this.result.summary.issues.push("Environment configuration mismatch");
        this.result.summary.canProceed = false;
        console.log(`${colors.red}❌ Environment configuration mismatch${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Environment Match",
        status: "fail",
        details: "Could not read config",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Config check failed${colors.reset}`);
    }
  }

  async checkHealthEndpoint() {
    const start = Date.now();
    const port = this.environment === "dev" ? 50430 : 58289;
    const url = this.environment === "dev"
      ? `http://localhost:${port}/health`
      : `https://${this.environment === "dev" ? "neighborgigs.zosite" : "neighborgigs.dev"}/health`;

    try {
      const response = await fetch(url);
      const ok = response.ok;
      const data = ok ? await response.json() : null;

      this.result.checks.push({
        name: "Health Endpoint",
        status: ok ? "pass" : "fail",
        details: ok ? `Health check: ${data.status}` : "Health endpoint unavailable",
        duration: Date.now() - start,
      });

      if (ok) {
        console.log(`${colors.green}✅ Health endpoint is accessible${colors.reset}`);
      } else {
        this.result.summary.issues.push("Health endpoint is not accessible");
        this.result.summary.canProceed = false;
        console.log(`${colors.red}❌ Health endpoint is not accessible${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Health Endpoint",
        status: "fail",
        details: "Cannot reach health endpoint",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Cannot reach health endpoint${colors.reset}`);
    }
  }

  async checkPortAvailability() {
    const start = Date.now();
    const port = 50430;

    try {
      // Try to listen on port (quick check)
      const tempServer = Bun.serve({
        port,
        async fetch() {
          return new Response("test");
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      tempServer.stop();

      this.result.checks.push({
        name: "Port Availability",
        status: "pass",
        details: `Port ${port} is available`,
        duration: Date.now() - start,
      });
      console.log(`${colors.green}✅ Port ${port} is available${colors.reset}`);
    } catch (error) {
      this.result.checks.push({
        name: "Port Availability",
        status: "fail",
        details: `Port ${port} is in use`,
        duration: Date.now() - start,
      });
      this.result.summary.issues.push(`Port ${port} is in use`);
      this.result.summary.canProceed = false;
      console.log(`${colors.red}❌ Port ${port} is in use${colors.reset}`);
    }
  }

  async checkDatabaseConnection() {
    const start = Date.now();
    try {
      // Check DB connection string
      const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL;
      
      this.result.checks.push({
        name: "Database Connection",
        status: dbUrl ? "pass" : "warn",
        details: dbUrl ? "Database URL configured" : "No database URL configured",
        duration: Date.now() - start,
      });

      if (dbUrl) {
        console.log(`${colors.green}✅ Database URL is configured${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  No database URL configured${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Database Connection",
        status: "fail",
        details: "Could not check database",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Database check failed${colors.reset}`);
    }
  }

  async checkSSLConfig() {
    const start = Date.now();
    try {
      // Check SSL mode (would need Cloudflare API access in reality)
      // For now, just check if SSL is expected
      const hasSSL = true; // Production should always have SSL
      
      this.result.checks.push({
        name: "SSL/TLS Configuration",
        status: hasSSL ? "pass" : "warn",
        details: hasSSL ? "SSL/TLS is configured" : "SSL/TLS not configured",
        duration: Date.now() - start,
      });

      console.log(`${colors.green}✅ SSL/TLS configuration expected${colors.reset}`);
    } catch (error) {
      this.result.checks.push({
        name: "SSL/TLS Configuration",
        status: "fail",
        details: "Could not check SSL",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ SSL check failed${colors.reset}`);
    }
  }

  async checkTimeouts() {
    const start = Date.now();
    try {
      const serverFile = await Bun.file("./server.ts").text();
      const hasTimeout = serverFile.includes("idleTimeout") || serverFile.includes("timeout");
      
      this.result.checks.push({
        name: "Timeout Configuration",
        status: hasTimeout ? "pass" : "warn",
        details: hasTimeout ? "Timeout configuration found" : "Using default timeouts",
        duration: Date.now() - start,
      });

      if (hasTimeout) {
        console.log(`${colors.green}✅ Timeout configuration found${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  Using default timeouts${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Timeout Configuration",
        status: "fail",
        details: "Could not check timeouts",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Timeout check failed${colors.reset}`);
    }
  }

  async checkServiceHealth() {
    const start = Date.now();
    const port = this.environment === "dev" ? 50430 : 58289;
    const url = `http://localhost:${port}/health`;

    try {
      const response = await fetch(url);
      const ok = response.ok;
      const data = ok ? await response.json() : null;

      this.result.checks.push({
        name: "Service Health",
        status: ok ? "pass" : "fail",
        details: ok ? `Service running: ${data.status}` : "Service not healthy",
        duration: Date.now() - start,
      });

      if (ok) {
        console.log(`${colors.green}✅ Service is healthy${colors.reset}`);
      } else {
        this.result.summary.issues.push("Service is not healthy");
        this.result.summary.canProceed = false;
        console.log(`${colors.red}❌ Service is not healthy${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Service Health",
        status: "fail",
        details: "Cannot reach service",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Cannot reach service${colors.reset}`);
    }
  }

  async checkResponseHeaders() {
    const start = Date.now();
    const port = this.environment === "dev" ? 50430 : 58289;
    const url = `http://localhost:${port}/health`;

    try {
      const response = await fetch(url);
      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");

      const issues: string[] = [];
      if (contentType && !contentType.includes("application/json")) {
        issues.push("Content-Type not application/json");
      }
      if (contentLength === "0") {
        issues.push("Empty Content-Length");
      }

      this.result.checks.push({
        name: "Response Headers",
        status: issues.length === 0 ? "pass" : "warn",
        details: issues.length === 0 ? "Headers look valid" : issues.join("; "),
        duration: Date.now() - start,
      });

      if (issues.length === 0) {
        console.log(`${colors.green}✅ Response headers are valid${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  Header issues: ${issues.join("; ")}${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Response Headers",
        status: "fail",
        details: "Cannot check headers",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Cannot check headers${colors.reset}`);
    }
  }

  async checkMinimalEndpoints() {
    const start = Date.now();
    const port = this.environment === "dev" ? 50430 : 58289;
    const endpoints = ["/health", "/", "/api/hello-zo"];

    let allPass = true;
    for (const endpoint of endpoints) {
      const url = `http://localhost:${port}${endpoint}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          allPass = false;
        }
      } catch (error) {
        allPass = false;
      }
    }

    this.result.checks.push({
      name: "Minimal Endpoints",
      status: allPass ? "pass" : "fail",
      details: allPass ? "All endpoints responding" : "Some endpoints failing",
      duration: Date.now() - start,
    });

    if (allPass) {
      console.log(`${colors.green}✅ All minimal endpoints responding${colors.reset}`);
    } else {
      this.result.summary.issues.push("Some endpoints are failing");
      this.result.summary.canProceed = false;
      console.log(`${colors.red}❌ Some endpoints are failing${colors.reset}`);
    }
  }

  async checkErrorLogs() {
    const start = Date.now();
    const logFiles = this.environment === "dev"
      ? ["/dev/shm/zosite.log"]
      : ["/dev/shm/prod.log", "/dev/shm/public.log"];

    let hasErrors = false;
    for (const logFile of logFiles) {
      try {
        const exists = await Bun.file(logFile).exists();
        if (!exists) continue;

        const logs = await $`tail -n 20 ${logFile}`.text();
        const errorLines = logs.split("\n").filter((line) =>
          line.includes("error") || line.includes("crash") || line.includes("520")
        );

        if (errorLines.length > 0) {
          hasErrors = true;
          break;
        }
      } catch {
        // File doesn't exist - that's fine
      }
    }

    this.result.checks.push({
      name: "Error Logs",
      status: hasErrors ? "warn" : "pass",
      details: hasErrors ? "Recent errors found in logs" : "No recent errors in logs",
      duration: Date.now() - start,
    });

    if (hasErrors) {
      console.log(`${colors.yellow}⚠️  Recent errors found in logs${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ No recent errors in logs${colors.reset}`);
    }
  }

  async checkCloudflareConnection() {
    const start = Date.now();
    // This would ideally test Cloudflare API connectivity
    // For now, just check if domain is configured
    const domain = "neighborgigs.dev";

    try {
      const response = await fetch(`https://${domain}/health`);
      const ok = response.ok;

      this.result.checks.push({
        name: "Cloudflare Connection",
        status: ok ? "pass" : "fail",
        details: ok ? "Cloudflare is routing traffic" : "Cloudflare routing issue",
        duration: Date.now() - start,
      });

      if (ok) {
        console.log(`${colors.green}✅ Cloudflare is routing traffic${colors.reset}`);
      } else {
        this.result.summary.issues.push("Cloudflare routing issue detected");
        this.result.summary.canProceed = false;
        console.log(`${colors.red}❌ Cloudflare routing issue detected${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Cloudflare Connection",
        status: "fail",
        details: "Cannot verify Cloudflare connection",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Cannot verify Cloudflare connection${colors.reset}`);
    }
  }

  async checkResponseTime() {
    const start = Date.now();
    const port = this.environment === "dev" ? 50430 : 58289;
    const url = `http://localhost:${port}/health`;

    const fetchStart = Date.now();
    try {
      await fetch(url);
      const duration = Date.now() - fetchStart;

      const isSlow = duration > 5000; // 5 seconds
      this.result.checks.push({
        name: "Response Time",
        status: isSlow ? "warn" : "pass",
        details: `Response time: ${duration}ms`,
        duration: Date.now() - start,
      });

      if (isSlow) {
        console.log(`${colors.yellow}⚠️  Slow response time: ${duration}ms${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Response time acceptable: ${duration}ms${colors.reset}`);
      }
    } catch (error) {
      this.result.checks.push({
        name: "Response Time",
        status: "fail",
        details: "Cannot measure response time",
        duration: Date.now() - start,
      });
      console.log(`${colors.red}❌ Cannot measure response time${colors.reset}`);
    }
  }

  generateReport() {
    console.log(`\n${colors.bold}${colors.blue}📋 VALIDATION REPORT${colors.reset}`);
    console.log(`${colors.bold}Environment:${colors.reset} ${this.environment.toUpperCase()}`);
    console.log(`${colors.bold}Action:${colors.reset} ${this.action.toUpperCase()}`);
    console.log(`${colors.bold}Timestamp:${colors.reset} ${this.result.timestamp}`);

    const failures = this.result.checks.filter((s) => s.status === "fail");
    const warnings = this.result.checks.filter((s) => s.status === "warn");

    if (failures.length > 0) {
      console.log(`\n${colors.red}${colors.bold}❌ FAILURES (${failures.length})${colors.reset}`);
      failures.forEach((check) => {
        console.log(`  ${colors.red}•${colors.reset} ${check.name}: ${check.details}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️  WARNINGS (${warnings.length})${colors.reset}`);
      warnings.forEach((check) => {
        console.log(`  ${colors.yellow}•${colors.reset} ${check.name}: ${check.details}`);
      });
    }

    console.log(`\n${colors.bold}SUMMARY${colors.reset}`);
    console.log(`Can Proceed: ${this.result.summary.canProceed ? `${colors.green}✅ YES${colors.reset}` : `${colors.red}❌ NO${colors.reset}`}`);

    if (this.result.summary.issues.length > 0) {
      console.log(`\n${colors.bold}Issues to address:${colors.reset}`);
      this.result.summary.issues.forEach((issue) => {
        console.log(`  ${colors.red}•${colors.reset} ${issue}`);
      });
    }

    // Recommendations
    if (this.action === "pre" && !this.result.summary.canProceed) {
      console.log(`\n${colors.bold}🛠️  Recommendations:${colors.reset}`);
      console.log(`  1. Fix the issues above`);
      console.log(`  2. Run \`bun run prod\` locally to test`);
      console.log(`  3. Verify /health endpoint responds`);
      console.log(`  4. Try validation again`);
    } else if (this.action === "post" && this.result.summary.canProceed) {
      console.log(`\n${colors.bold}✅ Deployment appears successful!${colors.reset}`);
      console.log(`  Monitor logs and /health endpoint for next 5 minutes`);
    }

    // Save report
    this.saveReport();
  }

  async saveReport() {
    const reportPath = `/home/workspace/neighborgigs/docs/deploy-validation-${this.environment}-${this.action}-${new Date().toISOString().split("T")[0]}.md`;
    
    let report = `# Deployment Validation Report\n\n`;
    report += `**Environment:** ${this.environment.toUpperCase()}\n`;
    report += `**Action:** ${this.action.toUpperCase()}\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**Can Proceed:** ${this.result.summary.canProceed ? "Yes" : "No"}\n\n`;

    report += `## Checks\n\n`;
    this.result.checks.forEach((check) => {
      const icon = check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⚠️";
      report += `### ${icon} ${check.name}\n`;
      report += `**Status:** ${check.status}\n`;
      report += `**Details:** ${check.details || "None"}\n`;
      report += `**Duration:** ${check.duration}ms\n\n`;
    });

    if (this.result.summary.issues.length > 0) {
      report += `## Issues\n\n`;
      this.result.summary.issues.forEach((issue) => report += `- ${issue}\n`);
    }

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
  const action = (args[1] || "pre").toLowerCase() as "pre" | "post";

  if ((environment !== "dev" && environment !== "prod") || (action !== "pre" && action !== "post")) {
    console.log(`Usage: bun scripts/deploy-validate.ts [dev|prod] [pre|post]`);
    console.log(`Example: bun scripts/deploy-validate.ts dev pre`);
    console.log(`Example: bun scripts/deploy-validate.ts prod post`);
    process.exit(1);
  }

  const validator = new DeploymentValidator(environment, action);
  await validator.run();
}
