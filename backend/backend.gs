// ============================================================
// PPM1 — Backend Apps Script (v2 SIMPEL & ROBUST)
// ============================================================
// Cara pakai:
//   1. Buka https://script.google.com → New project
//   2. Hapus semua di editor → paste SEMUA kode ini → Save (Ctrl+S)
//   3. Run fungsi "setup" (dropdown atas) → Allow access
//   4. Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   5. Salin Web App URL → kirim ke developer
// ============================================================

// === Nama sheet ===
const SHEET = {
  ITEMS: 'items',
  BOOKINGS: 'bookings',
  USERS: 'users',
  LOG: 'activity_log',
  LABELS: 'labels',
  SESSIONS: 'sessions'
};

// === Config ===
const CONFIG = {
  SESSION_DAYS: 7,
  LOG_CAP: 500,
  DEFAULT_ADMIN: 'admin',
  DEFAULT_ADMIN_PASS: 'AdminPPM1@2026'
};

// ============================================================
// HELPER — hash password (SHA-256 + salt)
// ============================================================
function hashPassword(pass, salt) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pass, Utilities.Charset.UTF_8);
  return d.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}
function genSalt() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

// ============================================================
// HELPER — spreadsheet (baca dari Script Properties, fallback buat baru)
// ============================================================
function getSS() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PPM1_SS_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  // Fallback: spreadsheet aktif (jika terikat)
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('PPM1_SS_ID', active.getId());
    return active;
  }
  throw new Error('Spreadsheet tidak ditemukan. Jalankan setup() dulu.');
}

// ============================================================
// SETUP — jalankan SEKALI dari editor (Runtime > Run > setup)
// ============================================================
function setup() {
  // Buat spreadsheet baru
  const ss = SpreadsheetApp.create('PPM1 Database');
  PropertiesService.getScriptProperties().setProperty('PPM1_SS_ID', ss.getId());
  Logger.log('Spreadsheet: ' + ss.getUrl());

  // Buat semua sheet + header
  const shItems = ss.insertSheet(SHEET.ITEMS);
  shItems.getRange(1, 1, 1, 10).setValues([['id','nama','kategori','foto','kondisi','qty','harga','keterangan','updated_at','created_at']]);

  const shBookings = ss.insertSheet(SHEET.BOOKINGS);
  shBookings.getRange(1, 1, 1, 11).setValues([['id','itemId','tanggalPinjam','tanggalKembali','pelanggan','qty','status','harga','catatan','tanggalSelesai','created_at']]);

  const shUsers = ss.insertSheet(SHEET.USERS);
  shUsers.getRange(1, 1, 1, 6).setValues([['username','passHash','salt','role','nama','created_at']]);

  const shLog = ss.insertSheet(SHEET.LOG);
  shLog.getRange(1, 1, 1, 4).setValues([['timestamp','type','detail','userId']]);

  const shLabels = ss.insertSheet(SHEET.LABELS);
  shLabels.getRange(1, 1, 1, 3).setValues([['jenis','label','created_at']]);

  const shSessions = ss.insertSheet(SHEET.SESSIONS);
  shSessions.getRange(1, 1, 1, 4).setValues([['token','username','role','expires']]);

  // Hapus default sheet
  if (ss.getSheets().length > 6) ss.deleteSheet(ss.getSheets()[0]);

  // Seed admin
  const salt = genSalt();
  const hash = hashPassword(CONFIG.DEFAULT_ADMIN_PASS, salt);
  shUsers.getRange(2, 1, 1, 6).setValues([[CONFIG.DEFAULT_ADMIN, hash, salt, 'admin', 'Admin PPM1', new Date().toISOString()]]);

  Logger.log('Setup SELESAI. Login: ' + CONFIG.DEFAULT_ADMIN + ' / ' + CONFIG.DEFAULT_ADMIN_PASS);
  Logger.log('Spreadsheet: ' + ss.getUrl());
}

// ============================================================
// HELPER — append aman (pakai getRange + setValues, bukan .append())
// ============================================================
function appendRow(sheet, row) {
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
}

// ============================================================
// HELPER — log (best-effort, tidak boleh crash)
// ============================================================
function log(type, detail, userId) {
  try {
    const ss = getSS();
    const sh = ss.getSheetByName(SHEET.LOG);
    if (!sh) return;
    appendRow(sh, [new Date().toISOString(), type, detail, userId || 'system']);
    // Truncate
    if (sh.getLastRow() > CONFIG.LOG_CAP + 1) {
      const excess = sh.getLastRow() - (CONFIG.LOG_CAP + 1);
      sh.deleteRows(CONFIG.LOG_CAP + 2, excess);
    }
  } catch (e) {
    // abaikan
  }
}

// ============================================================
// AUTH — login & session (disimpan di sheet sessions)
// ============================================================
function login(username, password) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: 'Belum ada user. Jalankan setup().' };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const user = rows.find(function(r) { return r[0] === username; });
  if (!user) return { ok: false, error: 'User tidak ditemukan' };
  const hash = user[1], salt = user[2], role = user[3], nama = user[4];
  if (hashPassword(password, salt) !== hash) return { ok: false, error: 'Password salah' };

  // Buat session token
  const token = Utilities.getUuid();
  const expires = new Date(Date.now() + CONFIG.SESSION_DAYS * 86400000).toISOString();
  const shSessions = ss.getSheetByName(SHEET.SESSIONS);
  if (shSessions) appendRow(shSessions, [token, username, role, expires]);

  log('login', nama + ' (' + role + ') login', username);
  return { ok: true, session: token, role: role, nama: nama };
}

function checkSession(session) {
  if (!session) return null;
  try {
    const ss = getSS();
    const sh = ss.getSheetByName(SHEET.SESSIONS);
    if (!sh || sh.getLastRow() < 2) return null;
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
    const s = rows.find(function(r) { return r[0] === session; });
    if (!s) return null;
    if (new Date(s[3]) < new Date()) return null;
    return { username: s[1], role: s[2] };
  } catch (e) {
    return null;
  }
}

function logout(session) {
  try {
    const ss = getSS();
    const sh = ss.getSheetByName(SHEET.SESSIONS);
    if (!sh) return;
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === session) { sh.deleteRow(i + 2 + (rows.length - i - 1)); break; }
    }
  } catch (e) {}
}

// ============================================================
// CRUD ITEMS
// ============================================================
function listItems() {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.ITEMS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  return rows.map(function(r) {
    return { id: String(r[0]), nama: r[1], kategori: r[2], foto: r[3], kondisi: r[4],
      qty: +r[5] || 0, harga: +r[6] || 0, keterangan: r[7], updated_at: r[8], created_at: r[9] };
  });
}

function saveItem(item, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.ITEMS);
  if (!sh) throw new Error('Sheet items belum ada');
  const now = new Date().toISOString();
  const row = [item.id, item.nama, item.kategori || 'UMUM', item.foto || '', item.kondisi || 'BAIK',
    +item.qty || 0, +item.harga || 0, item.keterangan || '', now, item.created_at || now];
  // Update?
  if (sh.getLastRow() >= 2) {
    const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
    const idx = ids.indexOf(String(item.id));
    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, 10).setValues([row]);
      log('item-edit', 'Edit item "' + item.nama + '"', userId);
      return { ok: true, action: 'updated' };
    }
  }
  appendRow(sh, row);
  log('item-add', 'Tambah item "' + item.nama + '"', userId);
  return { ok: true, action: 'created' };
}

function deleteItem(id, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.ITEMS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
  const idx = ids.indexOf(String(id));
  if (idx < 0) return { ok: false };
  const nama = sh.getRange(idx + 2, 2).getValue();
  sh.deleteRow(idx + 2);
  // Hapus booking terkait
  const bsh = ss.getSheetByName(SHEET.BOOKINGS);
  if (bsh && bsh.getLastRow() >= 2) {
    const bIds = bsh.getRange(2, 2, bsh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
    for (let i = bIds.length - 1; i >= 0; i--) {
      if (bIds[i] === String(id)) bsh.deleteRow(i + 2);
    }
  }
  log('item-del', 'Hapus item "' + nama + '"', userId);
  return { ok: true };
}

// ============================================================
// CRUD BOOKINGS
// ============================================================
function listBookings() {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  return rows.map(function(r) {
    return { id: String(r[0]), itemId: String(r[1]), tanggalPinjam: r[2], tanggalKembali: r[3],
      pelanggan: r[4], qty: +r[5] || 1, status: r[6], harga: +r[7] || 0,
      catatan: r[8], tanggalSelesai: r[9], created_at: r[10] };
  });
}

function saveBooking(b, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh) throw new Error('Sheet bookings belum ada');
  const now = new Date().toISOString();
  const row = [b.id, b.itemId, b.tanggalPinjam, b.tanggalKembali || '', b.pelanggan || '',
    +b.qty || 1, b.status || 'AKTIF', +b.harga || 0, b.catatan || '', b.tanggalSelesai || '', now];
  appendRow(sh, row);
  log('booking-add', 'Booking "' + b.pelanggan + '" item ' + b.itemId, userId);
  return { ok: true };
}

function closeBooking(id, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
  const idx = ids.indexOf(String(id));
  if (idx < 0) return { ok: false };
  sh.getRange(idx + 2, 7).setValue('SELESAI');
  sh.getRange(idx + 2, 10).setValue(new Date().toISOString().slice(0, 10));
  log('booking-done', 'Booking ' + id + ' ditutup', userId);
  return { ok: true };
}

function deleteBooking(id, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.BOOKINGS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
  const idx = ids.indexOf(String(id));
  if (idx < 0) return { ok: false };
  const pel = sh.getRange(idx + 2, 5).getValue();
  sh.deleteRow(idx + 2);
  log('booking-del', 'Hapus booking "' + pel + '"', userId);
  return { ok: true };
}

// ============================================================
// LABELS
// ============================================================
function listLabels() {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.LABELS);
  if (!sh || sh.getLastRow() < 2) return { kategori: [], kondisi: [] };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  return {
    kategori: rows.filter(function(r) { return r[0] === 'kategori'; }).map(function(r) { return r[1]; }),
    kondisi: rows.filter(function(r) { return r[0] === 'kondisi'; }).map(function(r) { return r[1]; })
  };
}
function addLabel(jenis, label, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.LABELS);
  if (!sh) throw new Error('Sheet labels belum ada');
  appendRow(sh, [jenis, label, new Date().toISOString()]);
  log('label-add', 'Tambah ' + jenis + ' "' + label + '"', userId);
  return { ok: true };
}
function deleteLabel(jenis, label, userId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.LABELS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][0] === jenis && rows[i][1] === label) {
      sh.deleteRow(i + 2);
      log('label-del', 'Hapus ' + jenis + ' "' + label + '"', userId);
      return { ok: true };
    }
  }
  return { ok: false };
}

// ============================================================
// USERS (admin only)
// ============================================================
function listUsers() {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  return rows.map(function(r) { return { username: r[0], role: r[3], nama: r[4], created_at: r[5] }; });
}
function addUser(username, password, role, nama, byUserId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh) throw new Error('Sheet users belum ada');
  const salt = genSalt();
  const hash = hashPassword(password, salt);
  appendRow(sh, [username, hash, salt, role, nama, new Date().toISOString()]);
  log('user-add', 'Tambah user "' + username + '" (' + role + ')', byUserId);
  return { ok: true };
}
function changePassword(username, newPass, byUserId) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  const usernames = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
  const idx = usernames.indexOf(username);
  if (idx < 0) return { ok: false };
  const salt = genSalt();
  sh.getRange(idx + 2, 2).setValue(hashPassword(newPass, salt));
  sh.getRange(idx + 2, 3).setValue(salt);
  log('user-pass', username + ' ganti password', byUserId);
  return { ok: true };
}
function removeUser(username, byUserId) {
  if (username === byUserId) throw new Error('Tidak bisa hapus diri sendiri');
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.USERS);
  if (!sh || sh.getLastRow() < 2) return { ok: false };
  const usernames = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); });
  const idx = usernames.indexOf(username);
  if (idx < 0) return { ok: false };
  sh.deleteRow(idx + 2);
  log('user-del', 'Hapus user "' + username + '"', byUserId);
  return { ok: true };
}

// ============================================================
// LOG
// ============================================================
function listLog(types) {
  const ss = getSS();
  const sh = ss.getSheetByName(SHEET.LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  return rows.filter(function(r) { return !types || types.length === 0 || types.indexOf(r[1]) >= 0; })
             .map(function(r) { return { t: r[0], type: r[1], detail: r[2], userId: r[3]; } })
             .reverse().slice(0, 100);
}

// ============================================================
// WEB APP — endpoint HTTP
// ============================================================
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const session = e.parameter.session || '';
    // GET hanya untuk action yang butuh session
    if (action === 'ping') return json({ ok: true, msg: 'PPM1 backend aktif' });
    const user = checkSession(session);
    if (!user) return json({ ok: false, error: 'unauthorized' });
    const admin = user.role === 'admin';

    switch (action) {
      case 'me': return json({ ok: true, user: user });
      case 'items': return json({ ok: true, data: listItems() });
      case 'bookings': return json({ ok: true, data: listBookings() });
      case 'labels': return json({ ok: true, data: listLabels() });
      case 'log': return json({ ok: true, data: listLog(e.parameter.logType ? [e.parameter.logType] : []) });
      case 'users':
        if (!admin) return json({ ok: false, error: 'admin only' });
        return json({ ok: true, data: listUsers() });
      default: return json({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // Login TIDAK butuh session
    if (action === 'login') {
      return json(login(body.username, body.password));
    }

    // Logout TIDAK check session strict
    if (action === 'logout') {
      logout(body.session || '');
      return json({ ok: true });
    }

    // Semua action lain butuh session valid
    const user = checkSession(body.session || '');
    if (!user) return json({ ok: false, error: 'unauthorized' });
    const admin = user.role === 'admin';
    const editor = user.role === 'editor' || admin;
    const uid = user.username;

    switch (action) {
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
      default: return json({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}
