/**
 * seedDummy.js — Data dummy untuk demo/testing
 * Dipanggil dari Settings → Data → "Muat Data Demo"
 */
import { run, get } from './database.js';
import { createUserWithPassword } from './users.js';
import { generateQRCode } from './items.js';
import { logActivity } from './activity.js';

export async function seedDummyUsers() {
  const existing = get("SELECT COUNT(*) as cnt FROM users WHERE role != 'admin'");
  if ((existing?.cnt ?? 0) > 0) return 0;

  // Teknisi
  await createUserWithPassword({ name: 'Budi Santoso',  role: 'technician', avatar_color: '#10b981', password: 'teknisi123' });
  await createUserWithPassword({ name: 'Siti Rahayu',   role: 'technician', avatar_color: '#06b6d4', password: 'teknisi123' });
  // Staff
  await createUserWithPassword({ name: 'Agus Widodo',   role: 'staff',      avatar_color: '#f59e0b', password: 'staff123' });
  await createUserWithPassword({ name: 'Dewi Lestari',  role: 'staff',      avatar_color: '#ec4899', password: 'staff123' });
  // Viewer
  await createUserWithPassword({ name: 'Rini Susanti',  role: 'viewer',     avatar_color: '#8b5cf6', password: 'viewer123' });

  return 5;
}

export function seedDummyItems() {
  const existing = get("SELECT COUNT(*) as cnt FROM items");
  if ((existing?.cnt ?? 0) > 0) return 0;

  const items = [
    // AC & Pendingin (cat 1)
    { name:'AC Split Daikin 1 PK', cat:1, brand:'Daikin',   model:'FTC25NV14',   loc:5, sn:'DK-2024-001', price:4500000, cond:'good',   status:'available' },
    { name:'AC Split Samsung 1.5 PK', cat:1, brand:'Samsung', model:'AR18TYHYC',  loc:6, sn:'SS-2023-015', price:5200000, cond:'good',   status:'in_use' },
    { name:'AC Cassette Panasonic 2 PK', cat:1, brand:'Panasonic', model:'S-18PY3H', loc:5, sn:'PAN-2022-07', price:9800000, cond:'fair', status:'available' },
    { name:'Kipas Angin Berdiri Miyako', cat:1, brand:'Miyako', model:'KAS-1618RC', loc:5, sn:'MIY-001',    price:450000,  cond:'good',   status:'available' },
    { name:'AC Split Sharp 1 PK', cat:1, brand:'Sharp',    model:'AH-A10VEY',   loc:4, sn:'SHP-2023-03', price:4100000, cond:'fair',   status:'maintenance' },

    // Komputer & IT (cat 2)
    { name:'Laptop Dell Latitude 5520', cat:2, brand:'Dell',  model:'Latitude 5520', loc:4, sn:'DELL-5520-01', price:14000000, cond:'good', status:'in_use' },
    { name:'PC Desktop HP EliteDesk',   cat:2, brand:'HP',    model:'EliteDesk 800', loc:5, sn:'HP-ED800-02',  price:9500000,  cond:'good', status:'in_use' },
    { name:'Laptop Lenovo ThinkPad',    cat:2, brand:'Lenovo',model:'ThinkPad E14',  loc:5, sn:'LEN-E14-03',   price:12000000, cond:'good', status:'available' },
    { name:'Printer HP LaserJet',       cat:2, brand:'HP',    model:'LaserJet M404n',loc:5, sn:'HP-LJ-001',    price:3800000,  cond:'fair', status:'available' },
    { name:'Monitor LG 24 inch',        cat:2, brand:'LG',    model:'24MK430H',      loc:4, sn:'LG-24-005',    price:2400000,  cond:'good', status:'in_use' },

    // Elektronik (cat 3)
    { name:'Proyektor Epson EB-X41',  cat:3, brand:'Epson',  model:'EB-X41',     loc:6, sn:'EPS-X41-01', price:7200000,  cond:'good', status:'available' },
    { name:'TV LED Samsung 43 inch',  cat:3, brand:'Samsung',model:'UA43AU7000', loc:6, sn:'SS-TV-43-02', price:5800000,  cond:'good', status:'in_use' },
    { name:'UPS APC 1000VA',          cat:3, brand:'APC',    model:'BX1000',     loc:4, sn:'APC-1000-01', price:2200000,  cond:'good', status:'available' },
    { name:'Scanner Canon DR-C225W',  cat:3, brand:'Canon',  model:'DR-C225W',   loc:5, sn:'CAN-225-01',  price:4100000,  cond:'fair', status:'available' },
    { name:'Telepon IP Yealink T42S', cat:3, brand:'Yealink',model:'T42S',       loc:5, sn:'YEA-T42-07',  price:1800000,  cond:'good', status:'in_use' },

    // Furnitur Kantor (cat 4)
    { name:'Kursi Kerja Ergotec Pro',  cat:4, brand:'Ergotec', model:'Pro Series', loc:5, sn:null, price:2800000, cond:'good', status:'in_use' },
    { name:'Meja Kerja Olympic 120cm', cat:4, brand:'Olympic', model:'WD-120',     loc:5, sn:null, price:1500000, cond:'good', status:'in_use' },
    { name:'Lemari Arsip Brother',     cat:4, brand:'Brother', model:'LA-4D',      loc:7, sn:null, price:1200000, cond:'fair', status:'available' },

    // Kendaraan (cat 5)
    { name:'Toyota Avanza 2022',   cat:5, brand:'Toyota', model:'Avanza 1.3G', loc:1, sn:'B 1234 XYZ', price:185000000, cond:'good', status:'available' },
    { name:'Honda Beat 2021',      cat:5, brand:'Honda',  model:'Beat ESP CBS', loc:1, sn:'B 5678 ABC', price:18500000,  cond:'good', status:'in_use' },

    // Alat Ukur (cat 7)
    { name:'Multimeter Digital Fluke',  cat:7, brand:'Fluke',   model:'117',      loc:4, sn:'FLK-117-001', price:3200000, cond:'good', status:'available' },
    { name:'Tang Ampere Kyoritsu',      cat:7, brand:'Kyoritsu',model:'KEW2033',  loc:4, sn:'KYO-2033-02', price:1800000, cond:'good', status:'available' },
    { name:'Termometer Infrared',       cat:7, brand:'Fluke',   model:'62 MAX+',  loc:4, sn:'FLK-62-003',  price:2100000, cond:'good', status:'available' },

    // Keamanan (cat 8)
    { name:'CCTV Hikvision DS-2CD2143', cat:8, brand:'Hikvision',model:'DS-2CD2143G2', loc:5, sn:'HIK-CAM-001', price:1250000, cond:'good', status:'in_use' },
    { name:'CCTV Dahua HAC-HDW1209T',   cat:8, brand:'Dahua',    model:'HAC-HDW1209T', loc:6, sn:'DAH-CAM-002', price:980000,  cond:'good', status:'in_use' },
    { name:'DVR Hikvision 8 Channel',   cat:8, brand:'Hikvision',model:'DS-7208HQI',   loc:4, sn:'HIK-DVR-001', price:2800000, cond:'good', status:'in_use' },
  ];

  let count = 0;
  items.forEach(item => {
    const qr = generateQRCode();
    run(`INSERT INTO items
      (qr_code, name, category_id, brand, model, serial_no, location_id,
       condition, status, purchase_date, purchase_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [qr, item.name, item.cat, item.brand, item.model,
       item.sn ?? null, item.loc, item.cond, item.status,
       '2024-01-01', item.price]
    );
    const id = get('SELECT last_insert_rowid() as id')?.id;
    if (id) {
      logActivity({ item_id: id, action: 'create', user_name: 'System', notes: 'Data demo' });
    }
    count++;
  });

  // Custom values untuk beberapa item
  _seedCustomValues();

  return count;
}

function _seedCustomValues() {
  // AC Split Daikin — item id 1 (approx)
  const acItems = get("SELECT id FROM items WHERE category_id = 1 LIMIT 1");
  if (acItems?.id) {
    const fields = get("SELECT id, field_key FROM category_fields WHERE category_id = 1 AND field_key = 'capacity_btu'");
    const fieldTemp = get("SELECT id FROM category_fields WHERE category_id = 1 AND field_key = 'temp_default'");
    const fieldRefrig = get("SELECT id FROM category_fields WHERE category_id = 1 AND field_key = 'refrigerant'");
    if (fields?.id)      run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [acItems.id, fields.id, '9000']);
    if (fieldTemp?.id)   run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [acItems.id, fieldTemp.id, '24']);
    if (fieldRefrig?.id) run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [acItems.id, fieldRefrig.id, 'R32']);
  }

  // Laptop Dell — custom values
  const laptopItem = get("SELECT id FROM items WHERE name LIKE '%Dell%' LIMIT 1");
  if (laptopItem?.id) {
    const fRam = get("SELECT id FROM category_fields WHERE category_id = 2 AND field_key = 'ram_gb'");
    const fOs  = get("SELECT id FROM category_fields WHERE category_id = 2 AND field_key = 'os'");
    const fIp  = get("SELECT id FROM category_fields WHERE category_id = 2 AND field_key = 'ip_address'");
    if (fRam?.id) run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [laptopItem.id, fRam.id, '16']);
    if (fOs?.id)  run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [laptopItem.id, fOs.id, 'Windows 11']);
    if (fIp?.id)  run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [laptopItem.id, fIp.id, '192.168.1.101']);
  }

  // Kendaraan Avanza
  const avanza = get("SELECT id FROM items WHERE name LIKE '%Avanza%' LIMIT 1");
  if (avanza?.id) {
    const fPlate = get("SELECT id FROM category_fields WHERE category_id = 5 AND field_key = 'plate_number'");
    const fYear  = get("SELECT id FROM category_fields WHERE category_id = 5 AND field_key = 'year'");
    const fFuel  = get("SELECT id FROM category_fields WHERE category_id = 5 AND field_key = 'fuel_type'");
    const fTax   = get("SELECT id FROM category_fields WHERE category_id = 5 AND field_key = 'tax_due_date'");
    if (fPlate?.id) run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [avanza.id, fPlate.id, 'B 1234 XYZ']);
    if (fYear?.id)  run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [avanza.id, fYear.id, '2022']);
    if (fFuel?.id)  run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [avanza.id, fFuel.id, 'Bensin']);
    if (fTax?.id)   run('INSERT OR IGNORE INTO item_custom_values (item_id, field_id, value) VALUES (?, ?, ?)', [avanza.id, fTax.id, '2026-03-15']);
  }
}
