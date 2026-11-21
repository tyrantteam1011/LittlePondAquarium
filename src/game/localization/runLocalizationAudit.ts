import {
  formatLocalizationAuditReport,
  validateAllLocalizations,
} from './LocalizationValidator';

const report = validateAllLocalizations();
console.log(formatLocalizationAuditReport(report));

if (report.issues.length > 0) {
  console.log('\n--- Issues ---');
  for (const issue of report.issues) {
    console.log(
      `[${issue.severity.toUpperCase()}] ${issue.code} (${issue.entityType}:${issue.entityId}) ${issue.key}${issue.locale ? ` [${issue.locale}]` : ''}: ${issue.message}`
    );
  }
}

if (!report.passed) {
  process.exit(1);
}
