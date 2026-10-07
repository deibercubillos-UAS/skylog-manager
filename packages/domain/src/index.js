// Capa de dominio pura de Skylog V2.0 — sin React, sin Next.js, sin Supabase.
// Cada función aquí es determinista: mismos datos de entrada, mismo resultado,
// probable con Vitest sin levantar ningún servidor. Ver docs/skylog-v2/33-arquitectura.md.

export function domainReady() {
  return true;
}

export * from './operationCalendar.js';
export * from './dutyCompliance.js';
export * from './riskAnalysis.js';
export * from './smsReporting.js';
export * from './internalRiskMatrix.js';
export * from './safetyIndicators.js';
export * from './smsTrainingSchedule.js';
export * from './trainingExamCompliance.js';
export * from './evaluationCompliance.js';
export * from './supplierAuditScore.js';
export * from './smsGovernance.js';
export * from './smsOfficialImplementationPlan.js';
export * from './smsGapCompliance.js';
export * from './smsReporterConfidentiality.js';
export * from './organizationSmsProfile.js';
export * from './smsImplementationProgress.js';
export * from './workspaces.js';
export * from './insuranceCoverage.js';
export * from './retentionPolicy.js';
export * from './dispatchRules.js';
export * from './flightLimits.js';
export * from './colombianCalendar.js';
export * from './smsTracking.js';
export * from './authorizationReadiness.js';
export * from './pilotQualifications.js';
export * from './changeManagement.js';
export * from './designations.js';
export * from './expiryAlerts.js';
export * from './aircraftSpecSheet.js';
export * from './dangerousGoods.js';
export * from './offlineQueue.js';
export * from './commandSearch.js';
export * from './registration.js';
export * from './joinOrganization.js';
export * from './invitations.js';
