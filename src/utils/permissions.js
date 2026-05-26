export const PERMISSIONS = {
  owner: {
    // Org management
    canDeleteOrg: true,
    canRenameOrg: true,
    canTransferOwnership: true,
    // Member management
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeRoles: true,      // can change any role
    canManageMembers: true,
    // Project management
    canCreateProject: true,
    canDeleteProject: true,
    canManageProject: true,
    // Board management
    canManageBoard: true,
    canCreateColumn: true,
    canDeleteColumn: true,
    // Task management
    canCreateTask: true,
    canDeleteTask: true,
    canUpdateTask: true,
    canAssignTask: true,
    // Access
    canViewActivity: true,
    canViewAnalytics: true,
  },
  admin: {
    // Org management
    canDeleteOrg: false,        // ← CANNOT
    canRenameOrg: true,
    canTransferOwnership: false, // ← CANNOT
    // Member management
    canInviteMembers: true,     // ← CAN ✅
    canRemoveMembers: true,     // ← CAN ✅
    canChangeRoles: true,       // ← CAN ✅ (admin/member only)
    canManageMembers: true,
    // Project management
    canCreateProject: true,     // ← CAN ✅
    canDeleteProject: true,     // ← CAN ✅
    canManageProject: true,
    // Board management
    canManageBoard: true,
    canCreateColumn: true,
    canDeleteColumn: true,
    // Task management
    canCreateTask: true,
    canDeleteTask: true,
    canUpdateTask: true,
    canAssignTask: true,
    // Access
    canViewActivity: true,
    canViewAnalytics: true,
  },
  member: {
    // Org management
    canDeleteOrg: false,
    canRenameOrg: false,
    canTransferOwnership: false,
    // Member management
    canInviteMembers: false,    // ← CANNOT
    canRemoveMembers: false,    // ← CANNOT
    canChangeRoles: false,      // ← CANNOT
    canManageMembers: false,
    // Project management
    canCreateProject: false,    // ← CANNOT
    canDeleteProject: false,
    canManageProject: false,
    // Board management
    canManageBoard: false,
    canCreateColumn: false,
    canDeleteColumn: false,
    // Task management
    canCreateTask: true,        // ← CAN ✅
    canDeleteTask: false,
    canUpdateTask: true,        // ← CAN ✅
    canAssignTask: false,
    // Access
    canViewActivity: true,
    canViewAnalytics: true,
  },
}

export const getPermissions = (role) => {
  return PERMISSIONS[role] || PERMISSIONS.member
}

// Helper to check role change permission
// Admin cannot assign owner role
export const canChangeToRole = (changerRole, targetRole) => {
  if (changerRole === 'owner') return true
  if (changerRole === 'admin') {
    // Admin can only change to admin or member
    return ['admin', 'member'].includes(targetRole)
  }
  return false
}
