const { google } = require('googleapis');

const FIELD_ORDER = [
  'receivedCalls',
  'outboundCalls',
  'bookingByStaff',
  'bookingOnline',
  'bookingByCustomer',
  'emailQuoteSent',
  'marketingRobo',
  'textBrigade',
  'quoteFormLead',
  'newRecurring',
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, shiftDate, values, timestamp } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (!shiftDate || typeof shiftDate !== 'string' || !shiftDate.trim()) {
    res.status(400).json({ error: 'Shift date is required' });
    return;
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      new Date(timestamp || Date.now()).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' }),
      shiftDate.trim(),
      name.trim(),
      ...FIELD_ORDER.map((key) => Number(values && values[key]) || 0),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'EOS Reports!A:M',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Sheet append failed:', err);
    res.status(500).json({ error: 'Failed to save report. Please try again or notify your manager.' });
  }
};
