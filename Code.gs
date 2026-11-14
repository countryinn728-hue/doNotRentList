/**
 * Do Not Rent List — Google Apps Script backend (Web App JSON API)
 * ----------------------------------------------------------------
 * This script is BOUND to the Google Sheet that stores the list.
 * Every request is a POST with a JSON body (sent as text/plain to avoid a
 * CORS preflight) and must include a passcode:
 *
 *   {action:"login",  code}               -> {ok, role}      role = "staff" | "manager"
 *   {action:"list",   code}               -> {ok, role, rows} (newest first)
 *   {action:"add",    code, ...fields}    -> {ok, row}       staff or manager
 *   {action:"delete", code, id}           -> {ok, deleted}   MANAGER ONLY
 *
 * PASSCODES are NOT in this code. Set them in the Apps Script editor:
 *   Project Settings (gear icon) -> Script Properties -> Add script property
 *     STAFF_CODE    = 123456   (search, view, add)
 *     MANAGER_CODE  = 2490      (search, view, add, delete)
 * Changing a passcode there takes effect immediately (no redeploy needed).
 */

var SHEET_NAME = 'DoNotRent';
var HEADERS = ['id', 'first_name', 'last_name', 'reason', 'notes', 'added_by', 'created_at'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns "manager", "staff", or null for a wrong/missing code.
 * Fails closed: if the passcodes were never set, nobody gets in.
 */
function getRole_(code) {
  var props = PropertiesService.getScriptProperties();
  var manager = props.getProperty('MANAGER_CODE');
  var staff = props.getProperty('STAFF_CODE');
  if (!manager || !staff) {
    throw new Error('Passcodes are not set up yet (Script Properties STAFF_CODE and MANAGER_CODE).');
  }
  code = (code || '').toString().trim();
  if (!code) return null;
  if (code === manager) return 'manager';
  if (code === staff) return 'staff';
  Utilities.sleep(1500); // slow down guessing
  return null;
}

function listRows_() {
  var values = getSheet_().getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue;
    rows.push({
      id: String(r[0]),
      first_name: String(r[1] || ''),
      last_name: String(r[2] || ''),
      reason: String(r[3] || ''),
      notes: String(r[4] || ''),
      added_by: String(r[5] || ''),
      created_at: r[6] ? new Date(r[6]).toISOString() : ''
    });
  }
  rows.reverse(); // newest first
  return rows;
}

/** GET is no longer used for data (it would put the passcode in the URL). */
function doGet() {
  return jsonResponse_({ ok: false, error: 'Use the Do Not Rent page.' });
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action;
    var role = getRole_(body.code);
    if (!role) {
      return jsonResponse_({ ok: false, auth: false, error: 'Wrong passcode.' });
    }

    if (action === 'login') {
      return jsonResponse_({ ok: true, role: role });
    }

    if (action === 'list') {
      return jsonResponse_({ ok: true, role: role, rows: listRows_() });
    }

    if (action === 'add') {
      var reason = (body.reason || '').toString().trim();
      if (!reason) {
        return jsonResponse_({ ok: false, error: 'Reason is required.' });
      }
      var newRow = {
        id: Utilities.getUuid(),
        first_name: (body.first_name || '').toString().trim(),
        last_name: (body.last_name || '').toString().trim(),
        reason: reason,
        notes: (body.notes || '').toString().trim(),
        added_by: (body.added_by || '').toString().trim(),
        created_at: new Date()
      };
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        getSheet_().appendRow([
          newRow.id, newRow.first_name, newRow.last_name, newRow.reason,
          newRow.notes, newRow.added_by, newRow.created_at
        ]);
      } finally {
        lock.releaseLock();
      }
      newRow.created_at = newRow.created_at.toISOString();
      return jsonResponse_({ ok: true, row: newRow });
    }

    if (action === 'delete') {
      if (role !== 'manager') {
        return jsonResponse_({ ok: false, error: 'Only a manager can delete entries.' });
      }
      var id = (body.id || '').toString();
      if (!id) {
        return jsonResponse_({ ok: false, error: 'id is required for delete.' });
      }
      var lock2 = LockService.getScriptLock();
      lock2.waitLock(10000);
      try {
        var sheet = getSheet_();
        var values = sheet.getDataRange().getValues();
        for (var i = values.length - 1; i >= 1; i--) {
          if (String(values[i][0]) === id) {
            sheet.deleteRow(i + 1);
            return jsonResponse_({ ok: true, deleted: id });
          }
        }
      } finally {
        lock2.releaseLock();
      }
      return jsonResponse_({ ok: false, error: 'Entry not found (it may already be deleted).' });
    }

    return jsonResponse_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err.message || err) });
  }
}
