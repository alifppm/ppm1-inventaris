/**
 * Reset admin password ke AdminPPM1@2026
 * Jalankan sekali: Runtime > Run > resetAdminPassword
 * (akan meminta approval saat pertama kali)
 * Setelah itu panggil lagi tanpa argumen = selesai.
 */
function resetAdminPassword(newPass) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('PPM1_SS_ID'));
  } catch(e) {
    Logger.log('Error: Spreadsheet ID tidak ditemukan di Script Properties.');
    return 'ERROR';
  }
  var sh = ss.getSheetByName('users');
  if (!sh || sh.getLastRow() < 2) {
    Logger.log('Sheet users belum ada atau kosong.');
    return 'NO_USERS_SHEET';
  }
  // Password baru
  if (!newPass) newPass = 'AdminPPM1@2026';
  var salt = genSalt();
  var hash = hashPassword(newPass, salt);
  // Update baris 2 (admin)
  sh.getRange(2, 1, 1, 6).setValues([['admin', hash, salt, 'admin', 'Admin PPM1', new Date().toISOString()]]);
  Logger.log('Password admin berhasil diubah ke: ' + newPass);
  Logger.log('Login sekarang: admin / ' + newPass);
}
