import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const counts = {
    organizations: await p.organization.count(),
    branches: await p.branch.count(),
    departments: await p.department.count(),
    users: await p.user.count(),
    roles: await p.role.count(),
    permissions: await p.permission.count(),
    rolePermissions: await p.rolePermission.count(),
    userRoles: await p.userRole.count(),
    userBranchScopes: await p.userBranchScope.count(),
    sessions: await p.session.count(),
    securityProfiles: await p.userSecurityProfile.count(),
    documentTypes: await p.documentType.count(),
    documents: await p.document.count(),
    documentVersions: await p.documentVersion.count(),
    documentReminders: await p.documentReminder.count(),
    employees: await p.employee.count(),
    contracts: await p.contract.count(),
    attendanceRecords: await p.attendanceRecord.count(),
    leaveTypes: await p.leaveType.count(),
    leaveRequests: await p.leaveRequest.count(),
    leaveBalances: await p.leaveBalance.count(),
    payrollPeriods: await p.payrollPeriod.count(),
    payrollEntries: await p.payrollEntry.count(),
    endOfServiceCalcs: await p.endOfServiceCalculation.count(),
    procedures: await p.procedure.count(),
    procedureSteps: await p.procedureStep.count(),
    procedureComments: await p.procedureComment.count(),
    suppliers: await p.supplier.count(),
    inventoryItems: await p.inventoryItem.count(),
    stockMovements: await p.stockMovement.count(),
    purchaseOrders: await p.purchaseOrder.count(),
    purchaseOrderItems: await p.purchaseOrderItem.count(),
    recipes: await p.recipe.count(),
    recipeIngredients: await p.recipeIngredient.count(),
    wasteRecords: await p.wasteRecord.count(),
    expenseCategories: await p.expenseCategory.count(),
    expenses: await p.expense.count(),
    payments: await p.payment.count(),
    taxRecords: await p.taxRecord.count(),
    foodHandlerTrainings: await p.foodHandlerTraining.count(),
    foodSafetyChecklists: await p.foodSafetyChecklist.count(),
    foodSafetyInspections: await p.foodSafetyInspection.count(),
    foodSafetyFindings: await p.foodSafetyFinding.count(),
    auditLogs: await p.auditLog.count(),
    auditChainHeads: await p.auditChainHead.count(),
    notifications: await p.notification.count(),
    securityEvents: await p.securityEvent.count(),
  };

  console.log("Current Table Record Counts:");
  console.log(JSON.stringify(counts, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
