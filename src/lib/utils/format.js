// ── Date formatting ───────────────────────────────────

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      ...opts
    });
  } catch { return dateStr; }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateStr; }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Baru saja';
  if (mins < 60)  return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7)   return `${days} hari lalu`;
  return formatDate(dateStr);
}

// ── Currency ──────────────────────────────────────────

export function formatCurrency(amount) {
  if (amount == null || amount === '') return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(val) {
  if (val == null || val === '') return '—';
  return new Intl.NumberFormat('id-ID').format(val);
}

// ── Status & Condition labels ─────────────────────────

export const STATUS_LABELS = {
  available:   'Tersedia',
  in_use:      'Digunakan',
  maintenance: 'Maintenance',
  retired:     'Tidak Aktif'
};

export const STATUS_ICONS = {
  available:   'fa-solid fa-circle-check',
  in_use:      'fa-solid fa-person-walking',
  maintenance: 'fa-solid fa-screwdriver-wrench',
  retired:     'fa-solid fa-box-archive'
};

export const STATUS_COLORS = {
  available:   '#10b981',
  in_use:      '#f59e0b',
  maintenance: '#3b82f6',
  retired:     '#6b7280'
};

export const CONDITION_LABELS = {
  good:   'Baik',
  fair:   'Cukup',
  poor:   'Buruk',
  broken: 'Rusak'
};

export const CONDITION_ICONS = {
  good:   'fa-solid fa-thumbs-up',
  fair:   'fa-solid fa-triangle-exclamation',
  poor:   'fa-solid fa-circle-exclamation',
  broken: 'fa-solid fa-ban'
};

export const ROLE_LABELS = {
  admin:      'Admin',
  technician: 'Teknisi',
  staff:      'Staff',
  viewer:     'Viewer'
};

// ── Compress image to base64 ──────────────────────────

export async function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
