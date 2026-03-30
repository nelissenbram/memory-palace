// ---------------------------------------------------------------------------
// Share-permission model for the Memory Palace sharing system
// ---------------------------------------------------------------------------

export interface SharePermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ---- Named presets --------------------------------------------------------

export const VIEW_ONLY: SharePermissions = {
  canAdd: false,
  canEdit: false,
  canDelete: false,
};

export const CAN_ADD: SharePermissions = {
  canAdd: true,
  canEdit: false,
  canDelete: false,
};

export const CAN_ADD_EDIT: SharePermissions = {
  canAdd: true,
  canEdit: true,
  canDelete: false,
};

export const CAN_ADD_DELETE: SharePermissions = {
  canAdd: true,
  canEdit: false,
  canDelete: true,
};

export const FULL_COLLABORATION: SharePermissions = {
  canAdd: true,
  canEdit: true,
  canDelete: true,
};

// ---- Preset metadata (for UI selectors) -----------------------------------

export interface PermissionPreset {
  key: string;
  label_key: string;
  description_key: string;
  permissions: SharePermissions;
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    key: "view_only",
    label_key: "permissions.viewOnly",
    description_key: "permissions.viewOnlyDesc",
    permissions: VIEW_ONLY,
  },
  {
    key: "can_add",
    label_key: "permissions.canAdd",
    description_key: "permissions.canAddDesc",
    permissions: CAN_ADD,
  },
  {
    key: "can_add_edit",
    label_key: "permissions.canAddEdit",
    description_key: "permissions.canAddEditDesc",
    permissions: CAN_ADD_EDIT,
  },
  {
    key: "can_add_delete",
    label_key: "permissions.canAddDelete",
    description_key: "permissions.canAddDeleteDesc",
    permissions: CAN_ADD_DELETE,
  },
  {
    key: "full_collaboration",
    label_key: "permissions.fullCollaboration",
    description_key: "permissions.fullCollaborationDesc",
    permissions: FULL_COLLABORATION,
  },
];

// ---- Helpers --------------------------------------------------------------

interface DbPermissionFields {
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

/** Convert app-level permissions to DB column names (snake_case). */
export function permissionsToDbFields(p: SharePermissions): DbPermissionFields {
  return {
    can_add: p.canAdd,
    can_edit: p.canEdit,
    can_delete: p.canDelete,
  };
}

/** Convert a DB row back to the app-level SharePermissions shape. */
export function dbFieldsToPermissions(row: DbPermissionFields): SharePermissions {
  return {
    canAdd: row.can_add,
    canEdit: row.can_edit,
    canDelete: row.can_delete,
  };
}

/** Return the i18n label key of the matching preset, or "permissions.custom". */
export function getPresetLabel(p: SharePermissions): string {
  const match = PERMISSION_PRESETS.find(
    (preset) =>
      preset.permissions.canAdd === p.canAdd &&
      preset.permissions.canEdit === p.canEdit &&
      preset.permissions.canDelete === p.canDelete,
  );
  return match ? match.label_key : "permissions.custom";
}

/** Check whether the given permissions allow a specific action. */
export function canUserPerformAction(
  p: SharePermissions,
  action: "add" | "edit" | "delete",
): boolean {
  switch (action) {
    case "add":
      return p.canAdd;
    case "edit":
      return p.canEdit;
    case "delete":
      return p.canDelete;
  }
}
