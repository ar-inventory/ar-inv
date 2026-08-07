/**
 * swal.js — Helper SweetAlert2 terpusat
 */
import Swal from 'sweetalert2';

// ── Toast ─────────────────────────────────────────────

export function toastSuccess(title) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  });
}

export function toastError(title) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true
  });
}

// ── Konfirmasi ────────────────────────────────────────

export async function confirmDelete(itemName = 'item ini') {
  const result = await Swal.fire({
    title: 'Hapus?',
    text: `${itemName} akan dihapus permanen dan tidak bisa dikembalikan.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor:  '#6b7280',
    confirmButtonText:  '<i class="fa-solid fa-trash me-1"></i> Ya, Hapus',
    cancelButtonText:   'Batal',
    reverseButtons: true
  });
  return result?.isConfirmed ?? false;
}

export async function confirmAction(title, text, confirmText = 'Ya, Lanjutkan') {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#6366f1',
    cancelButtonColor:  '#6b7280',
    confirmButtonText:  confirmText,
    cancelButtonText:   'Batal',
    reverseButtons: true
  });
  return result?.isConfirmed ?? false;
}

export async function confirmDanger(title, text, confirmText = 'Ya, Lanjutkan') {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor:  '#6b7280',
    confirmButtonText:  confirmText,
    cancelButtonText:   'Batal',
    reverseButtons: true
  });
  return result?.isConfirmed ?? false;
}

// Konfirmasi reset dengan ketik teks
export async function confirmReset() {
  const result = await Swal.fire({
    title: 'Reset Semua Data?',
    html: `
      <p style="color:#6b7280;margin-bottom:16px">
        Semua data inventory, kategori, dan riwayat akan <strong>dihapus permanen</strong>.
        Tindakan ini <strong>tidak bisa dibatalkan</strong>.
      </p>
      <p style="margin-bottom:8px;font-size:.85rem">Ketik <strong>HAPUS SEMUA</strong> untuk konfirmasi:</p>
    `,
    input: 'text',
    inputPlaceholder: 'Ketik HAPUS SEMUA',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor:  '#6b7280',
    confirmButtonText:  'Reset Sekarang',
    cancelButtonText:   'Batal',
    reverseButtons: true,
    preConfirm: (val) => {
      if (val !== 'HAPUS SEMUA') {
        Swal.showValidationMessage('Teks tidak sesuai. Ketik persis: HAPUS SEMUA');
        return false;
      }
      return true;
    }
  });
  return result?.isConfirmed ?? false;
}

// ── Alert biasa ───────────────────────────────────────

export function alertError(title, text = '') {
  return Swal.fire({ title, text, icon: 'error', confirmButtonColor: '#6366f1' });
}

export function alertSuccess(title, text = '') {
  return Swal.fire({ title, text, icon: 'success', confirmButtonColor: '#6366f1' });
}
