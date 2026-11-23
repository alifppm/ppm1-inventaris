// ============================================================
// PPM1 — Backend Apps Script
// Deploy: https://script.google.com → New project → paste semua ini
// ============================================================

// === Sheet names (bisa diubah) ===
const SHEET = {
  ITEMS: 'items',
  BOOKINGS: 'bookings',
  USERS: 'users',
  LOG: 'activity_log',
  LABELS: 'labels'
};

// === Config (ubah sesuai kebutuhan) ===
const CONFIG = {
  SESSION_DAYS: 7,           // session login bertahan berapa hari
  LOG_CAP: 500,              // batas log
  DEFAULT_ADMIN: 'admin',    // user pertama yang dibuat saat setup
  DEFAULT_ADMIN_PASS: 'AdminPPM1@2026'  // GANTI!
};

// ============================================================
// AUTH — hash password (SHA-256 + salt)
// ============================================================
function hashPassword(pass, salt) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pass, Utilities.Charset.UTF_8);
  return d.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}
function genSalt() {
  const bytes = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  return bytes;
}

// ============================================================
// SETUP — panggil sekali dari Apps Script editor (Runtime > Run > setup)
// Buat sheet & seed user admin pertama
// ============================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(SHEET).forEach(([k, name]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
  });
  // Header
  ss.getSheetByName(SHEET.ITEMS).getRange('A1:J1').setValues([[
    'id','nama','kategori','foto','kondisi','qty','harga','keterangan','updated_at','created_at'
  ]]);
  ss.getSheetByName(SHEET.BOOKINGS).getRange('A1:K1').setValues([[
    'id','itemId','tanggalPinjam','tanggalKembali','pelanggan','qty','status','harga','catatan','tanggalSelesai','created_at'
  ]]);
  ss.getSheetByName(SHEET.USERS).getRange('A1:F1').setValues([[
    'username','passHash','salt','role','nama','created_at'
  ]]);
  ss.getSheetByName(SHEET.LOG).getRange('A1:D1').setValues([
    ['timestamp','type','detail','userId']
  ]);
  ss.getSheetByName(SHEET.LABELS).getRange('A1:C1').setValues([
    ['jenis','label','created_at']
  ]);

  // Seed admin pertama (hanya jika sheet users kosong)
  const usersSheet = ss.getSheetByName(SHEET.USERS);
  if (usersSheet.getLastRow() < 2) {
    const salt = genSalt();
    const hash = hashPassword(CONFIG.DEFAULT_ADMIN_PASS, salt);
    usersSheet.getRange('A2:F2').setValues([[
      CONFIG.DEFAULT_ADMIN, hash, salt, 'admin', 'Admin PPM1', new Date().toISOString()
    ]]);
  }
  logSafe('setup', 'Backend di-setup, admin pertama: ' + CONFIG.DEFAULT_ADMIN, 'system');
  SpreadsheetApp.flush();
}

function logSafe(type, detail, userId) {
  try {
    log(type, detail, userId);
  } catch (e) {
    // Log sheet belum siap — abaikan, jangan crash
  }
}

// ============================================================
// AUTH — login & session
// ============================================================
function login(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh) throw new Error('Sheet users belum ada. Jalankan setup() dulu.');
  const rows = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 6).getValues();
  const user = rows.find(r => r[0] === username);
  if (!user) return { ok: false, error: 'User tidak ditemukan' };
  const [uname, hash, salt, role, nama] = user;
  const calc = hashPassword(password, salt);
  if (calc !== hash) return { ok: false, error: 'Password salah' };
  const session = Utilities.getUuid();
  const cache = CacheService.getSystemCache();
  cache.put('ppm1_session_' + session, JSON.stringify({
    username: uname, role, nama,
    expires: new Date(Date.now() + CONFIG.SESSION_DAYS * 86400000).toISOString()
  }), CONFIG.SESSION_DAYS * 86400);
  log('login', `${nama} (${role}) login`, uname);
  return { ok: true, session, role, nama };
}

function checkSession(session) {
  if (!session) return null;
  const cache = CacheService.getSystemCache();
  const data = cache.get('ppm1_session_' + session);
  if (!data) return null;
  const u = JSON.parse(data);
  if (new Date(u.expires) < new Date()) return null;
  return u;
}

function logout(session) {
  if (session) CacheService.getSystemCache().remove('ppm1_session_' + session);
}

// ============================================================
// CRUD ITEMS
// ============================================================
function listItems() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.ITEMS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  return rows.map(r => ({
    id: String(r[0]), nama: r[1], kategori: r[2], foto: r[3], kondisi: r[4],
    qty: +r[5]||0, harga: +r[6]||0, keterangan: r[7],
    updated_at: r[8], created_at: r[9]
  }));
}

function saveItem(item, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.ITEMS);
  if (!sh) throw new Error('Sheet items belum ada');
  const now = new Date().toISOString();
  const row = [item.id, item.nama, item.kategori||'UMUM', item.foto||'', item.kondisi||'BAIK',
    +item.qty||0, +item.harga||0, item.keterangan||'', now, item.created_at||now];
  if (item.id) {
    // update: cari baris dengan id
    const lastRow = sh.getLastRow();
    if (lastRow >= 2) {
      const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
      const idx = ids.indexOf(String(item.id));
      if (idx >= 0) {
        row[8] = now;
        row[9] = sh.getRange(idx + 2, 10).getValue() || now;
        sh.getRange(idx + 2, 1, 1, 10).setValues([row]);
        log('item-edit', `Edit item "${item.nama}" (${item.id})`, userId);
        return { ok: true, action: 'updated' };
      }
    }
  }
  // add baru
  sh.append(row);
  log('item-add', `Tambah item "${item.nama}" (${item.id})`, userId);
  return { ok: true, action: 'created' };
}

function deleteItem(id, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.ITEMS);
  if (!sh) return { ok: false };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const idx = ids.indexOf(String(id));
  if (idx < 0) return { ok: false };
  const nama = sh.getRange(idx + 2, 2).getValue();
  sh.deleteRow(idx + 2);
  // hapus booking terkait
  const bsh = ss.getSheetByName(SHEET.BOOKINGS);
  if (bsh && bsh.getLastRow() >= 2) {
    const bIds = bsh.getRange(2, 2, bsh.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
    for (let i = bIds.length - 1; i >= 0; i--) {
      if (bIds[i] === String(id)) bsh.deleteRow(i + 2);
    }
  }
  log('item-del', `Hapus item "${nama}" (${id})`, userId);
  return { ok: true };
}

// ============================================================
// CRUD BOOKINGS
// ============================================================
function listBookings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  return rows.map(r => ({
    id: String(r[0]), itemId: String(r[1]), tanggalPinjam: r[2], tanggalKembali: r[3],
    pelanggan: r[4], qty: +r[5]||1, status: r[6], harga: +r[7]||0,
    catatan: r[8], tanggalSelesai: r[9], created_at: r[10]
  }));
}

function saveBooking(b, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh) throw new Error('Sheet bookings belum ada');
  const now = new Date().toISOString();
  const row = [b.id, b.itemId, b.tanggalPinjam, b.tanggalKembali||'', b.pelanggan||'',
    +b.qty||1, b.status||'AKTIF', +b.harga||0, b.catatan||'', b.tanggalSelesai||'', now];
  sh.append(row);
  log('booking-add', `Booking "${b.pelanggan}" — item ${b.itemId}`, userId);
  return { ok: true };
}

function closeBooking(id, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh) return { ok: false };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const idx = ids.indexOf(String(id));
  if (idx < 0) return { ok: false };
  sh.getRange(idx + 2, 7).setValue('SELESAI');
  sh.getRange(idx + 2, 10).setValue(new Date().toISOString().slice(0, 10));
  log('booking-done', `Booking ${id} ditutup`, userId);
  return { ok: true };
}

function deleteBooking(id, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh) return { ok: false };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const idx = ids.indexOf(String(id));
  if (idx < 0) return { ok: false };
  const pel = sh.getRange(idx + 2, 5).getValue();
  sh.deleteRow(idx + 2);
  log('booking-del', `Hapus booking "${pel}" (${id})`, userId);
  return { ok: true };
}

// ============================================================
// LABELS & USERS (admin only)
// ============================================================
function listLabels() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.LABELS);
  if (!sh || sh.getLastRow() < 2) return { kategori: [], kondisi: [] };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  return {
    kategori: rows.filter(r => r[0] === 'kategori').map(r => r[1]),
    kondisi: rows.filter(r => r[0] === 'kondisi').map(r => r[1])
  };
}
function addLabel(jenis, label, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.LABELS);
  if (!sh) throw new Error('Sheet labels belum ada');
  sh.append([jenis, label, new Date().toISOString()]);
  log('label-add', `Tambah ${jenis} "${label}"`, userId);
  return { ok: true };
}
function deleteLabel(jenis, label, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.LABELS);
  if (!sh) return { ok: false };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };
  const rows = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][0] === jenis && rows[i][1] === label) {
      sh.deleteRow(i + 2);
      log('label-del', `Hapus ${jenis} "${label}"`, userId);
      return { ok: true };
    }
  }
  return { ok: false };
}

function listUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  return rows.map(r => ({ username: r[0], role: r[3], nama: r[4], created_at: r[5] }));
}

function addUser(username, password, role, nama, byUserId) {
  if (role !== 'admin') throw new Error('Hanya admin yang bisa tambah user');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh) throw new Error('Sheet users belum ada');
  const salt = genSalt();
  const hash = hashPassword(password, salt);
  sh.append([username, hash, salt, role, nama, new Date().toISOString()]);
  log('user-add', `Tambah user "${username}" (${role})`, byUserId);
  return { ok: true };
}

function changePassword(username, newPass, byUserId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh) return { ok: false };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };
  const usernames = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const idx = usernames.indexOf(username);
  if (idx < 0) return { ok: false };
  const salt = genSalt();
  const hash = hashPassword(newPass, salt);
  sh.getRange(idx + 2, 2).setValue(hash);
  sh.getRange(idx + 2, 3).setValue(salt);
  log('user-pass', `${username} ganti password`, byUserId);
  return { ok: true };
}

function removeUser(username, byUserId) {
  if (username === byUserId) throw new Error('Tidak bisa hapus diri sendiri');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh) return { ok: false };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };
  const usernames = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const idx = usernames.indexOf(username);
  if (idx < 0) return { ok: false };
  sh.deleteRow(idx + 2);
  log('user-del', `Hapus user "${username}"`, byUserId);
  return { ok: true };
}

// ============================================================
// LOG
// ============================================================
function log(type, detail, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET.LOG);
    if (!sh) return;
    sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues([[
      new Date().toISOString(), type, detail, userId || 'system'
    ]]);
    // Truncate: jaga cap 500 baris
    const lastRow = sh.getLastRow();
    if (lastRow > CONFIG.LOG_CAP + 1) {
      sh.deleteRows(CONFIG.LOG_CAP + 2, lastRow - (CONFIG.LOG_CAP + 1));
    }
  } catch (e) {
    // Jangan crash — log adalah best-effort
  }
}

function listLog(types, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  return rows.filter(r => !types || types.length === 0 || types.includes(r[1]))
             .map(r => ({ t: r[0], type: r[1], detail: r[2], userId: r[3] }))
             .reverse().slice(0, 100);
}

// ============================================================
// WEB APP — endpoint HTTP (dipanggil dari web)
// ============================================================
function doGet(e) {
  const action = e.parameter.action;
  const session = e.parameter.session || '';
  const user = checkSession(session);
  if (!user) return json({ ok: false, error: 'unauthorized' });

  // Role check
  const admin = user.role === 'admin';
  const editor = user.role === 'editor' || admin;
  const viewer = true;

  switch (action) {
    case 'me':
      return json({ ok: true, user: user });
    case 'items':
      return json({ ok: true, data: listItems() });
    case 'bookings':
      return json({ ok: true, data: listBookings() });
    case 'labels':
      return json({ ok: true, data: listLabels() });
    case 'log':
      return json({ ok: true, data: listLog(e.parameter.logType ? [e.parameter.logType] : [], user.username) });
    case 'users':
      if (!admin) return json({ ok: false, error: 'admin only' });
      return json({ ok: true, data: listUsers() });
    default:
      return json({ ok: false, error: 'unknown action' });
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  const session = body.session || '';
  const user = checkSession(session);
  if (!user) return json({ ok: false, error: 'unauthorized' });

  const admin = user.role === 'admin';
  const editor = user.role === 'editor' || admin;
  const uid = user.username;

  switch (action) {
    case 'login':
      return json(login(body.username, body.password));
    case 'logout':
      logout(session);
      return json({ ok: true });

    case 'item-save':
      if (!editor) return json({ ok: false, error: 'editor/admin only' });
      return json(saveItem(body.item, uid));
    case 'item-delete':
      if (!editor) return json({ ok: false, error: 'editor/admin only' });
      return json(deleteItem(body.id, uid));

    case 'booking-save':
      if (!editor) return json({ ok: false, error: 'editor/admin only' });
      return json(saveBooking(body.b, uid));
    case 'booking-close':
      if (!editor) return json({ ok: false, error: 'editor/admin only' });
      return json(closeBooking(body.id, uid));
    case 'booking-delete':
      if (!editor) return json({ ok: false, error: 'editor/admin only' });
      return json(deleteBooking(body.id, uid));

    case 'label-add':
      if (!admin) return json({ ok: false, error: 'admin only' });
      return json(addLabel(body.jenis, body.label, uid));
    case 'label-delete':
      if (!admin) return json({ ok: false, error: 'admin only' });
      return json(deleteLabel(body.jenis, body.label, uid));

    case 'user-add':
      if (!admin) return json({ ok: false, error: 'admin only' });
      return json(addUser(body.username, body.password, body.role, body.nama, uid));
    case 'user-pass':
      if (!admin) return json({ ok: false, error: 'admin only' });
      return json(changePassword(body.username, body.newPass, uid));
    case 'user-delete':
      if (!admin) return json({ ok: false, error: 'admin only' });
      return json(removeUser(body.username, uid));

    default:
      return json({ ok: false, error: 'unknown action' });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
