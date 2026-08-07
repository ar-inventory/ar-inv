import { run, get, all, getLastInsertId } from './database.js';

export function getAllLocations() {
  return all('SELECT * FROM locations ORDER BY level ASC, name ASC');
}

export function getLocationById(id) {
  return get('SELECT * FROM locations WHERE id = ?', [id]);
}

export function getRootLocations() {
  return all('SELECT * FROM locations WHERE parent_id IS NULL ORDER BY name ASC');
}

export function getChildLocations(parentId) {
  return all('SELECT * FROM locations WHERE parent_id = ? ORDER BY name ASC', [parentId]);
}

export function createLocation({ name, parent_id = null, level = 0 }) {
  run(
    'INSERT INTO locations (name, parent_id, level) VALUES (?, ?, ?)',
    [name, parent_id, level]
  );
  return getLastInsertId();
}

export function updateLocation(id, { name }) {
  run('UPDATE locations SET name = ? WHERE id = ?', [name, id]);
}

export function deleteLocation(id) {
  // Cek apakah ada item di lokasi ini
  const itemCount = get('SELECT COUNT(*) as cnt FROM items WHERE location_id = ?', [id]);
  if (itemCount?.cnt > 0) {
    throw new Error(`Tidak bisa hapus lokasi — masih ada ${itemCount.cnt} item di sini.`);
  }
  // Cek apakah ada sublokasi
  const childCount = get('SELECT COUNT(*) as cnt FROM locations WHERE parent_id = ?', [id]);
  if (childCount?.cnt > 0) {
    throw new Error('Tidak bisa hapus lokasi — masih ada sublokasi di dalamnya.');
  }
  run('DELETE FROM locations WHERE id = ?', [id]);
}

export function getItemCountByLocation(id) {
  const result = get('SELECT COUNT(*) as cnt FROM items WHERE location_id = ?', [id]);
  return result?.cnt ?? 0;
}

// Build tree struktur dari flat list
export function buildLocationTree(locations) {
  const map = {};
  const roots = [];
  locations.forEach(loc => {
    map[loc.id] = { ...loc, children: [] };
  });
  locations.forEach(loc => {
    if (loc.parent_id && map[loc.parent_id]) {
      map[loc.parent_id].children.push(map[loc.id]);
    } else {
      roots.push(map[loc.id]);
    }
  });
  return roots;
}

// Breadcrumb path untuk sebuah lokasi
export function getLocationPath(id, allLocations) {
  const map = Object.fromEntries(allLocations.map(l => [l.id, l]));
  const path = [];
  let current = map[id];
  while (current) {
    path.unshift(current.name);
    current = current.parent_id ? map[current.parent_id] : null;
  }
  return path.join(' › ');
}
