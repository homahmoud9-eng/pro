export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  totalDocuments: number;
  activeDocuments: number;
  expiredDocs: number;
  expiringDocs: number;
  totalProcedures: number;
  openProcedures: number;
  inProgressProcedures: number;
  todaySales: number;
  monthSales: number;
  monthExpenses: number;
  netWallet: number;
  inventoryValue: number;
  foodCostPercent: number;
  openFindings: number;
  currency: string;
}

export interface RecentAuditEntry {
  id: string;
  sequenceNumber: number;
  action: string;
  actorNameSnapshot: string;
  occurredAt: string | Date;
  entityType?: string;
  entityDisplayName?: string;
  reason?: string;
}

export interface DashboardDataResponse {
  metrics: DashboardMetrics;
  recentAudits: RecentAuditEntry[];
}

export const DEFAULT_DASHBOARD_METRICS: DashboardMetrics = {
  totalEmployees: 0,
  activeEmployees: 0,
  totalDocuments: 0,
  activeDocuments: 0,
  expiredDocs: 0,
  expiringDocs: 0,
  totalProcedures: 0,
  openProcedures: 0,
  inProgressProcedures: 0,
  todaySales: 0,
  monthSales: 0,
  monthExpenses: 0,
  netWallet: 0,
  inventoryValue: 0,
  foodCostPercent: 0,
  openFindings: 0,
  currency: "AED",
};
