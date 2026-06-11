// =============================================
// GOOGLE APPS SCRIPT - WhatsApp Bot Database
// =============================================
// DEPLOYMENT INSTRUCTIONS:
// 1. Create a Google Sheet
// 2. Extensions > Apps Script
// 3. Paste this entire code
// 4. Click Deploy > New Deployment
// 5. Type: Web App, Execute as: Me, Access: Anyone
// 6. Copy the Web App URL into your .env file
// =============================================

const SHEET_NAME = 'Appointments';

function ensureHeaders(sheet) {
  const headers = [['ID', 'Customer Name', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Booked At']];
  const existing = sheet.getRange('A1:H1').getValues()[0];
  if (!existing[0]) {
    sheet.getRange('A1:H1').setValues(headers);
    sheet.setFrozenRows(1);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);

    ensureHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);

    const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, '_'));
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => { row[h] = data[i][j] !== undefined ? data[i][j].toString() : ''; });
      rows.push(row);
    }
    return ContentService.createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      ss.insertSheet(SHEET_NAME);
      ensureHeaders(ss.getSheetByName(SHEET_NAME));
    }

    const s = ss.getSheetByName(SHEET_NAME);
    ensureHeaders(s);

    const params = JSON.parse(e.postData.contents);
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
    const lastRow = s.getLastRow();
    const id = lastRow;

    s.appendRow([
      id,
      params.name || 'Unknown',
      params.phone || '',
      params.service || 'General',
      params.date || 'TBD',
      params.time || 'TBD',
      'confirmed',
      now
    ]);

    const result = {
      success: true,
      id: id,
      message: 'Appointment booked successfully'
    };
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
