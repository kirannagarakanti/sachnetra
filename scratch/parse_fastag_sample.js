import fs from 'fs';
import path from 'path';

const monthMap = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

// Cleans numeric strings containing commas and spaces, parses to float
function cleanNum(val) {
  if (val == null || val === '' || val === 'NA' || val === '-') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/\u00a0/g, '').trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Parses "March 01, 2026" -> "2026-03-01"
function parseDailyDate(npciDay) {
  if (!npciDay || npciDay.toLowerCase() === 'total') return null;
  const parts = npciDay.replace(',', '').split(/\s+/);
  if (parts.length < 3) return null;
  const monthName = parts[0].toLowerCase();
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  const m = monthMap[monthName];
  if (m === undefined || isNaN(day) || isNaN(year)) return null;
  
  // Format as YYYY-MM-DD
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Parses "March-2026" -> "2026-03-01" (first of month)
function parseMonthlyDate(monthStr) {
  if (!monthStr) return null;
  const parts = monthStr.split('-');
  if (parts.length < 2) return null;
  const monthName = parts[0].toLowerCase();
  const year = parseInt(parts[1], 10);
  
  const m = monthMap[monthName];
  if (m === undefined || isNaN(year)) return null;
  
  const mm = String(m + 1).padStart(2, '0');
  return `${year}-${mm}-01`;
}

function parseDailySample(filePath) {
  console.log(`\n--- Parsing Daily Sample: ${path.basename(filePath)} ---`);
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  const results = json.data?.results || [];
  
  const parsedRows = [];
  for (const row of results) {
    if (row.npci_day.toLowerCase() === 'total' || row.isTotal) {
      console.log(`Skipping total row: Vol=${row.netc_volume_mn} Mn, Amt=${row.netc_value_crores} Cr`);
      continue;
    }
    
    const targetDate = parseDailyDate(row.npci_day);
    if (!targetDate) {
      console.warn(`Failed to parse date: ${row.npci_day}`);
      continue;
    }
    
    const volumeMn = cleanNum(row.netc_volume_mn);
    const amountCr = cleanNum(row.netc_value_crores);
    
    // Derived raw count and raw INR amount
    const transactionCount = volumeMn !== null ? Math.round(volumeMn * 1_000_000) : null;
    const transactionValueInr = amountCr !== null ? amountCr * 10_000_000 : null;
    
    parsedRows.push({
      target_date: targetDate,
      row_type: 'daily_national',
      transaction_count: transactionCount,
      transaction_value_inr: transactionValueInr,
      active_tags: null,
      live_banks: null,
      volume_mn: volumeMn,
      amount_cr: amountCr
    });
  }
  
  console.log(`Parsed ${parsedRows.length} daily rows.`);
  if (parsedRows.length > 0) {
    console.log('First row:', parsedRows[0]);
    console.log('Last row:', parsedRows[parsedRows.length - 1]);
  }
  return parsedRows;
}

function parseMonthlySample(filePath) {
  console.log(`\n--- Parsing Monthly Sample: ${path.basename(filePath)} ---`);
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  const results = json.data?.results || [];
  
  const parsedRows = [];
  for (const row of results) {
    const targetDate = parseMonthlyDate(row.month);
    if (!targetDate) {
      console.warn(`Failed to parse monthly date: ${row.month}`);
      continue;
    }
    
    const volumeMn = cleanNum(row.volume_in_mn);
    const amountCr = cleanNum(row.amount_in_cr);
    const tagIssuance = cleanNum(row.tag_issuance_in_nos);
    const liveBanks = cleanNum(row.no_of_banks_live_on_netc);
    
    // Derived values
    const transactionCount = volumeMn !== null ? Math.round(volumeMn * 1_000_000) : null;
    const transactionValueInr = amountCr !== null ? amountCr * 10_000_000 : null;
    
    parsedRows.push({
      target_date: targetDate,
      row_type: 'monthly_national',
      transaction_count: transactionCount,
      transaction_value_inr: transactionValueInr,
      active_tags: tagIssuance,
      live_banks: liveBanks !== null ? Math.round(liveBanks) : null,
      volume_mn: volumeMn,
      amount_cr: amountCr
    });
  }
  
  console.log(`Parsed ${parsedRows.length} monthly rows.`);
  if (parsedRows.length > 0) {
    console.log('First row:', parsedRows[0]);
    console.log('Last row:', parsedRows[parsedRows.length - 1]);
  }
  return parsedRows;
}

function main() {
  parseDailySample('scratch/fastag_daily_2026_march.json');
  parseMonthlySample('scratch/fastag_latest.json');
}

main();
