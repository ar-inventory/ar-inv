/**
 * seed.js — Data default saat pertama kali app dibuka
 * Users TIDAK di-seed di sini — dibuat manual di /setup
 */
import { run, get } from './database.js';
import { setSetting } from './settings.js';

export async function seedDefaultData() {
  // Cek apakah sudah di-seed
  const seeded = get("SELECT value FROM settings WHERE key = 'seeded'");
  if (seeded) return;

  console.log('[Seed] Memasukkan data default...');

  // ── Settings ──────────────────────────────────────────
  setSetting('company_name', 'Perusahaan Saya');
  setSetting('theme', 'light');

  // ── Locations ─────────────────────────────────────────
  run(`INSERT INTO locations (id, name, parent_id, level) VALUES
    (1, 'Gedung Utama', NULL, 0),
    (2, 'Lantai 1',     1,    1),
    (3, 'Lantai 2',     1,    1),
    (4, 'Ruang Server', 2,    2),
    (5, 'Ruang Kantor', 2,    2),
    (6, 'Ruang Meeting',3,    2),
    (7, 'Gudang',       1,    1)
  `);

  // ── Categories ────────────────────────────────────────
  run(`INSERT INTO categories (id, name, icon, color) VALUES
    (1,  'AC & Pendingin',    'fa-solid fa-snowflake',        '#3b82f6'),
    (2,  'Komputer & IT',     'fa-solid fa-laptop',           '#6366f1'),
    (3,  'Elektronik',        'fa-solid fa-plug',             '#8b5cf6'),
    (4,  'Furnitur Kantor',   'fa-solid fa-chair',            '#f59e0b'),
    (5,  'Kendaraan',         'fa-solid fa-car',              '#ef4444'),
    (6,  'Peralatan Dapur',   'fa-solid fa-utensils',         '#10b981'),
    (7,  'Alat Ukur',         'fa-solid fa-ruler',            '#06b6d4'),
    (8,  'Keamanan',          'fa-solid fa-shield-halved',    '#64748b'),
    (9,  'Lainnya',           'fa-solid fa-box',              '#6b7280')
  `);

  // ── Custom Fields: AC & Pendingin ─────────────────────
  run(`INSERT INTO category_fields
    (category_id, field_key, field_label, field_type, field_unit, field_options, is_required, show_on_card, sort_order) VALUES
    (1, 'capacity_btu',      'Kapasitas',             'number', 'BTU',  NULL, 0, 1, 0),
    (1, 'temp_default',      'Temperatur Default',    'number', '°C',   NULL, 0, 1, 1),
    (1, 'voltage',           'Tegangan',              'number', 'V',    NULL, 0, 0, 2),
    (1, 'ampere',            'Arus Listrik',          'number', 'A',    NULL, 0, 0, 3),
    (1, 'refrigerant',       'Tipe Refrigerant',      'select', NULL,   '["R22","R32","R410A","R134a"]', 0, 0, 4),
    (1, 'inverter',          'Inverter',              'boolean',NULL,   NULL, 0, 0, 5),
    (1, 'indoor_location',   'Posisi Unit Indoor',    'text',   NULL,   NULL, 0, 0, 6),
    (1, 'outdoor_location',  'Posisi Unit Outdoor',   'text',   NULL,   NULL, 0, 0, 7),
    (1, 'last_service_date', 'Tanggal Service Terakhir','date', NULL,   NULL, 0, 0, 8),
    (1, 'next_service_date', 'Jadwal Service Berikutnya','date',NULL,   NULL, 0, 1, 9)
  `);

  // ── Checklist: AC & Pendingin ─────────────────────────
  run(`INSERT INTO checklist_templates (category_id, item_text, sort_order) VALUES
    (1, 'Bersihkan/cuci filter indoor unit',    0),
    (1, 'Bersihkan kondensor outdoor unit',     1),
    (1, 'Cek dan bersihkan saluran pembuangan', 2),
    (1, 'Periksa level freon / refrigerant',    3),
    (1, 'Ukur tegangan dan arus listrik',        4),
    (1, 'Uji suhu output (cooling test)',        5),
    (1, 'Periksa kondisi fan & motor',           6),
    (1, 'Cek kebocoran freon',                   7),
    (1, 'Dokumentasi foto sebelum & sesudah',    8)
  `);

  // ── Custom Fields: Komputer & IT ──────────────────────
  run(`INSERT INTO category_fields
    (category_id, field_key, field_label, field_type, field_unit, field_options, is_required, show_on_card, sort_order) VALUES
    (2, 'cpu',         'Prosesor (CPU)',  'text',   NULL, NULL, 0, 0, 0),
    (2, 'ram_gb',      'RAM',            'number', 'GB', NULL, 0, 1, 1),
    (2, 'storage',     'Storage',        'text',   NULL, NULL, 0, 1, 2),
    (2, 'os',          'Sistem Operasi', 'select', NULL, '["Windows 11","Windows 10","macOS","Ubuntu","Debian","CentOS","Lainnya"]', 0, 0, 3),
    (2, 'ip_address',  'IP Address',     'text',   NULL, NULL, 0, 1, 4),
    (2, 'mac_address', 'MAC Address',    'text',   NULL, NULL, 0, 0, 5),
    (2, 'hostname',    'Hostname',       'text',   NULL, NULL, 0, 0, 6),
    (2, 'warranty_end','Garansi Vendor', 'date',   NULL, NULL, 0, 0, 7)
  `);

  // ── Custom Fields: Kendaraan ──────────────────────────
  run(`INSERT INTO category_fields
    (category_id, field_key, field_label, field_type, field_unit, field_options, is_required, show_on_card, sort_order) VALUES
    (5, 'plate_number',      'Nomor Polisi',             'text',   NULL, NULL, 1, 1, 0),
    (5, 'year',              'Tahun Kendaraan',          'number', NULL, NULL, 0, 1, 1),
    (5, 'color',             'Warna',                   'text',   NULL, NULL, 0, 0, 2),
    (5, 'cc_engine',         'Kapasitas Mesin',          'number', 'cc', NULL, 0, 0, 3),
    (5, 'fuel_type',         'Jenis Bahan Bakar',        'select', NULL, '["Bensin","Solar","Gas","Listrik","Hybrid"]', 0, 0, 4),
    (5, 'tax_due_date',      'Pajak Jatuh Tempo',        'date',   NULL, NULL, 0, 1, 7),
    (5, 'next_service_date', 'Jadwal Service Berikutnya','date',   NULL, NULL, 0, 1, 8)
  `);

  // ── Custom Fields: Alat Ukur ──────────────────────────
  run(`INSERT INTO category_fields
    (category_id, field_key, field_label, field_type, field_unit, field_options, is_required, show_on_card, sort_order) VALUES
    (7, 'measurement_unit',  'Satuan Ukur',                    'text',   NULL, NULL, 0, 1, 0),
    (7, 'accuracy',          'Akurasi',                        'text',   NULL, NULL, 0, 0, 3),
    (7, 'last_calibration',  'Kalibrasi Terakhir',             'date',   NULL, NULL, 0, 0, 4),
    (7, 'next_service_date', 'Jadwal Kalibrasi Berikutnya',    'date',   NULL, NULL, 0, 1, 5),
    (7, 'calibration_cert',  'No. Sertifikat Kalibrasi',       'text',   NULL, NULL, 0, 0, 6)
  `);

  // ── Custom Fields: Keamanan ───────────────────────────
  run(`INSERT INTO category_fields
    (category_id, field_key, field_label, field_type, field_unit, field_options, is_required, show_on_card, sort_order) VALUES
    (8, 'coverage_area',    'Area Cakupan',          'text',   NULL, NULL, 0, 1, 0),
    (8, 'ip_address',       'IP Address',            'text',   NULL, NULL, 0, 1, 1),
    (8, 'resolution',       'Resolusi',              'select', NULL, '["1080p","4K","720p","2K"]', 0, 0, 3),
    (8, 'next_service_date','Jadwal Cek Berikutnya', 'date',   NULL, NULL, 0, 1, 5)
  `);

  // ── Mark seeded ───────────────────────────────────────
  setSetting('seeded', 'true');
  console.log('[Seed] Data default berhasil dimasukkan.');
}
