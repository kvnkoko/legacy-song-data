// Shared constants that can be used on both client and server
// These mirror the Prisma EmployeeStatus enum but are available on the client

export const EMPLOYEE_STATUS = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  PROBATION: 'PROBATION',
  SUSPENDED: 'SUSPENDED',
  RESIGNED: 'RESIGNED',
  TERMINATED: 'TERMINATED',
} as const

export type EmployeeStatusType = typeof EMPLOYEE_STATUS[keyof typeof EMPLOYEE_STATUS]

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatusType, string> = {
  [EMPLOYEE_STATUS.ACTIVE]: 'Active',
  [EMPLOYEE_STATUS.ON_LEAVE]: 'On Leave',
  [EMPLOYEE_STATUS.PROBATION]: 'Probation',
  [EMPLOYEE_STATUS.SUSPENDED]: 'Suspended',
  [EMPLOYEE_STATUS.RESIGNED]: 'Resigned',
  [EMPLOYEE_STATUS.TERMINATED]: 'Terminated',
}



