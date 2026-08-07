/**
 * permissions.js — Role-based permission system
 *
 * Permission matrix:
 *                      Admin  Technician  Staff  Viewer
 * canEdit               ✓       ✓          ✓      ✗
 * canDelete             ✓       ✗          ✗      ✗
 * canMaintenance        ✓       ✓          ✗      ✗
 * canUpdateStatus       ✓       ✓          ✓      ✗
 * canManageCategories   ✓       ✗          ✗      ✗
 * canManageLocations    ✓       ✗          ✗      ✗
 * canSettings           ✓       ✗          ✗      ✗
 * canExport             ✓       ✗          ✗      ✗
 * canReset              ✓       ✗          ✗      ✗
 * canViewReports        ✓       ✓          ✓      ✓
 * canBulkDelete         ✓       ✗          ✗      ✗
 */

import { getSession } from './session.js';

/** @type {Record<string, Record<string, boolean>>} */
const PERMISSIONS = {
  admin: {
    canEdit:              true,
    canDelete:            true,
    canMaintenance:       true,
    canUpdateStatus:      true,
    canManageCategories:  true,
    canManageLocations:   true,
    canSettings:          true,
    canExport:            true,
    canReset:             true,
    canViewReports:       true,
    canBulkDelete:        true
  },
  technician: {
    canEdit:              true,
    canDelete:            false,
    canMaintenance:       true,
    canUpdateStatus:      true,
    canManageCategories:  false,
    canManageLocations:   false,
    canSettings:          false,
    canExport:            false,
    canReset:             false,
    canViewReports:       true,
    canBulkDelete:        false
  },
  staff: {
    canEdit:              true,
    canDelete:            false,
    canMaintenance:       false,
    canUpdateStatus:      true,
    canManageCategories:  false,
    canManageLocations:   false,
    canSettings:          false,
    canExport:            false,
    canReset:             false,
    canViewReports:       true,
    canBulkDelete:        false
  },
  viewer: {
    canEdit:              false,
    canDelete:            false,
    canMaintenance:       false,
    canUpdateStatus:      false,
    canManageCategories:  false,
    canManageLocations:   false,
    canSettings:          false,
    canExport:            false,
    canReset:             false,
    canViewReports:       true,
    canBulkDelete:        false
  }
};

/**
 * Cek apakah user aktif punya permission tertentu
 * @param {string} permission
 * @returns {boolean}
 */
export function can(permission) {
  const session = getSession();
  if (!session) return false;
  return PERMISSIONS[session.role]?.[permission] ?? false;
}

export const ROLE_DESCRIPTIONS = {
  admin:      'Akses penuh ke semua fitur termasuk pengaturan dan hapus data',
  technician: 'Bisa tambah/edit item dan catat maintenance, tidak bisa hapus atau ubah pengaturan',
  staff:      'Bisa tambah/edit item dan update status, tidak bisa catat maintenance',
  viewer:     'Hanya bisa melihat data dan laporan, tidak bisa mengubah apapun'
};
