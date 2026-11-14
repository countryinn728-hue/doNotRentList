/**
 * Do Not Rent List — Google Apps Script backend (Web App JSON API)
 * ----------------------------------------------------------------
 * This script is BOUND to the Google Sheet that stores the list.
 * It is deployed as a Web App and exposes a tiny JSON API:
 *
 *   GET  ?action=list            -> returns all rows (newest first)
 *   POST {action:"add", ...}     -> appends a row, returns the new row
 *   POST {action:"delete", id}   -> removes the row with that id
 *
 * CORS NOTE (important):
 * Apps Script Web Apps cannot set custom CORS response headers and cannot
 * answer the OPTIONS "preflight" request that browsers send for JSON POSTs.
 * The frontend therefore sends POST bodies as Content-Type: text/plain,
 * which the browser treats as a "simple request" (no preflight needed).
 * We parse that text body as JSON here. GET requests are simple too.
 * All responses are returned as real JSON via ContentService.
 */

// The sheet/tab name that holds the data. Change if your tab is named differently.
var SHEET_NAME = 'DoNotRent';

// Column order in the sheet. Row 1 must be these exact headers.
var HEADERS = ['id', 'first_name', 'last_name', 'reason', 'notes', 'added_by', 'created_at'];

/**
 * Returns the data sheet, creating it (with headers) if it does not exist yet.
 */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

/**
 * Helper: build a JSON HTTP response.
 */
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Read every data row and return an array of row objects (newest first).
 */
function listRows_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var rows = [];
  // Start at 1 to skip the header row.
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue; // skip blank/empty id rows
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
  // Newest first: reverse so the most recently appended row is on top.
  rows.reverse();
  return rows;
}

/**
 * GET handler. Only supports action=list (the default).
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'list') {
      return jsonResponse_({ ok: true, rows: listRows_() });
    }
    return jsonResponse_({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/**
 * POST handler. Body is JSON (sent as text/plain to avoid CORS preflight).
 * Supports action=add and action=delete.
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action;

    if (action === 'add') {
      // reason is required; names are strongly recommended.
      var reason = (body.reason || '').toString().trim();
      if (!reason) {
        return jsonResponse_({ ok: false, error: 'Reason is required.' });
      }
      var sheet = getSheet_();
      var newRow = {
        id: Utilities.getUuid(),
        first_name: (body.first_name || '').toString().trim(),
        last_name: (body.last_name || '').toString().trim(),
        reason: reason,
        notes: (body.notes || '').toString().trim(),
        added_by: (body.added_by || '').toString().trim(),
        created_at: new Date()
      };
      sheet.appendRow([
        newRow.id,
        newRow.first_name,
        newRow.last_name,
        newRow.reason,
        newRow.notes,
        newRow.added_by,
        newRow.created_at
      ]);
      // Return the row with created_at as an ISO string for the frontend.
      newRow.created_at = newRow.created_at.toISOString();
      return jsonResponse_({ ok: true, row: newRow });
    }

    if (action === 'delete') {
      var id = (body.id || '').toString();
      if (!id) {
        return jsonResponse_({ ok: false, error: 'id is required for delete.' });
      }
      var sheet2 = getSheet_();
      var values = sheet2.getDataRange().getValues();
      // Search rows bottom-up so row indexes stay valid after deletion.
      for (var i = values.length - 1; i >= 1; i--) {
        if (String(values[i][0]) === id) {
          sheet2.deleteRow(i + 1); // +1 because sheet rows are 1-indexed
          return jsonResponse_({ ok: true, deleted: id });
        }
      }
      return jsonResponse_({ ok: false, error: 'id not found: ' + id });
    }

    return jsonResponse_({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}
