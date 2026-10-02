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
  employeeDocStats?: {
    valid: number;
    expiring90: number;
    expiring30: number;
    expired: number;
    missing: number;
  };
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
  organization?: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    licenseNumbers?: string | null;
  };
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
  employeeDocStats: {
    valid: 0,
    expiring90: 0,
    expiring30: 0,
    expired: 0,
    missing: 0,
  },
};
