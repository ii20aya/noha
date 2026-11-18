function doPost(event) {
  const result = (ok) => ContentService.createTextOutput(JSON.stringify({ ok }))
    .setMimeType(ContentService.MimeType.JSON);
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('RSVP_SCRIPT_SECRET');
  const data = JSON.parse(event.postData.contents);
  if (!secret || data.secret !== secret) return result(false);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const book = SpreadsheetApp.openById(props.getProperty('RSVP_SHEET_ID'));
    const sheet = book.getSheetByName('RSVP') || book.insertSheet('RSVP');
    if (!sheet.getLastRow()) {
      sheet.appendRow(['Request ID', 'Received at', 'Name', 'Attendance', 'Guests', 'Message']);
    }
    if (sheet.getRange('A:A').createTextFinder(data.id).matchEntireCell(true).findNext()) {
      return result(true);
    }
    const textCell = (text) => "'" + text;
    sheet.appendRow([data.id, new Date(), textCell(data.name), data.attendance, data.guests, textCell(data.message)]);
    SpreadsheetApp.flush();
    return result(true);
  } finally {
    lock.releaseLock();
  }
}

