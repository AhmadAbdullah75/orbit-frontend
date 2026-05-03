export const PERMISSIONS = {
  owner: {
    canCreateOrg: true,
    canDeleteOrg: true,
    canInviteMembers: true,
    canManageMembers: true,
    canCreateProject: true,
    canDeleteProject: true,
    canCreateTask: true,
    canDeleteTask: true,
    canManageBoard: true,
    canViewActivity: true,
    canChangeRoles: true,
  },
  admin: {
    canCreateOrg: false,
    canDeleteOrg: false,
    canInviteMembers: true,
    canManageMembers: true,
    canCreateProject: true,
    canDeleteProject: true,
    canCreateTask: true,
    canDeleteTask: true,
    canManageBoard: true,
    canViewActivity: true,
    canChangeRoles: true,
  },
  member: {
    canCreateOrg: false,
    canDeleteOrg: false,
    canInviteMembers: false,
    canManageMembers: false,
    canCreateProject: false,
    canDeleteProject: false,
    canCreateTask: true,
    canDeleteTask: false,
    canManageBoard: false,
    canViewActivity: true,
    canChangeRoles: false,
  },
}

export const getPermissions = (role) => {
  return PERMISSIONS[role] || PERMISSIONS.member
}
