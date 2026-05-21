import fs from 'node:fs';
import path from 'node:path';

function analyze(filePath) {
  console.log(`\nAnalyzing ${path.basename(filePath)}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`Top-level keys: ${Object.keys(data).join(', ')}`);
  
  if (data.records) {
    const r = data.records;
    console.log(`records keys: ${Object.keys(r).join(', ')}`);
    console.log(`records.timestamp: ${r.timestamp} (Type: ${typeof r.timestamp})`);
    console.log(`records.underlyingValue: ${r.underlyingValue} (Type: ${typeof r.underlyingValue})`);
    console.log(`records.expiryDates count: ${r.expiryDates?.length}`);
    console.log(`records.expiryDates sample: ${r.expiryDates?.slice(0, 5).join(', ')}`);
    console.log(`records.strikePrices count: ${r.strikePrices?.length}`);
    console.log(`records.strikePrices sample: ${r.strikePrices?.slice(0, 5).join(', ')}`);
    console.log(`records.data rows: ${r.data?.length}`);
    
    if (r.data && r.data.length > 0) {
      const sampleRow = r.data[0];
      console.log(`records.data[0] keys: ${Object.keys(sampleRow).join(', ')}`);
      console.log(`records.data[0] values: strikePrice=${sampleRow.strikePrice}, expiryDate=${sampleRow.expiryDate}`);
      
      if (sampleRow.CE) {
        console.log(`CE keys: ${Object.keys(sampleRow.CE).join(', ')}`);
        console.log('CE Sample Values:');
        for (const [k, v] of Object.entries(sampleRow.CE)) {
          console.log(`  CE.${k}: ${v} (Type: ${typeof v})`);
        }
      }
      if (sampleRow.PE) {
        console.log('PE Sample Values:');
        for (const [k, v] of Object.entries(sampleRow.PE)) {
          console.log(`  PE.${k}: ${v} (Type: ${typeof v})`);
        }
      }
    }
  }

  if (data.filtered) {
    const f = data.filtered;
    console.log(`filtered keys: ${Object.keys(f).join(', ')}`);
    if (f.data && f.data.length > 0) {
      console.log(`filtered.data rows: ${f.data.length}`);
      console.log(`filtered.data[0] strikePrice: ${f.data[0].strikePrice}, expiryDate: ${f.data[0].expiryDate}`);
    }
    if (f.CE) {
      console.log(`filtered.CE (aggregated CE info) keys: ${Object.keys(f.CE).join(', ')}`);
      for (const [k, v] of Object.entries(f.CE)) {
        console.log(`  filtered.CE.${k}: ${v} (Type: ${typeof v})`);
      }
    }
    if (f.PE) {
      console.log(`filtered.PE (aggregated PE info) keys: ${Object.keys(f.PE).join(', ')}`);
      for (const [k, v] of Object.entries(f.PE)) {
        console.log(`  filtered.PE.${k}: ${v} (Type: ${typeof v})`);
      }
    }
  }

  // Nullability / value range analysis
  if (data.records && data.records.data) {
    const rows = data.records.data;
    let ceIvZeroCount = 0;
    let ceIvNullCount = 0;
    let ceOiZeroCount = 0;
    let totalRowsWithCe = 0;
    
    for (const r of rows) {
      if (r.CE) {
        totalRowsWithCe++;
        if (r.CE.impliedVolatility === 0 || r.CE.impliedVolatility === null) {
          ceIvZeroCount++;
        }
        if (r.CE.impliedVolatility === null) {
          ceIvNullCount++;
        }
        if (r.CE.openInterest === 0) {
          ceOiZeroCount++;
        }
      }
    }
    console.log(`CE analysis over ${totalRowsWithCe} rows:`);
    console.log(`  Rows with impliedVolatility == 0 or null: ${ceIvZeroCount}`);
    console.log(`  Rows with impliedVolatility === null: ${ceIvNullCount}`);
    console.log(`  Rows with openInterest == 0: ${ceOiZeroCount}`);
  }
}

analyze('scratch/nse_optionchain_NIFTY.json');
analyze('scratch/nse_optionchain_RELIANCE.json');
