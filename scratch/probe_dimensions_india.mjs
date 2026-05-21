import { CHROME_UA } from '../scripts/_seed-utils.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATASETS = [
  'WS_CBPOL',
  'WS_EER',
  'WS_TC',
  'WS_CREDIT_GAP',
  'WS_DSR',
  'WS_SPP',
  'WS_DPP',
  'WS_CPP',
  'WS_LONG_CPI',
  'WS_XRU',
  'WS_CBTA',
  'WS_GLI'
];

async function probeDataset(dataset) {
  // We fetch without a key to get all data (which is usually small for country-level stats),
  // then filter for India (IN) in JavaScript.
  let key = '';
  if (dataset === 'WS_XRU') key = '/M.IN.INR';
  const url = `https://stats.bis.org/api/v1/data/${dataset}${key}?detail=dataonly&format=csv`;
  console.log(`\n=========================================`);
  console.log(`Probing dataset: ${dataset}`);
  console.log(`URL: ${url}`);
  
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/csv'
      },
      signal: AbortSignal.timeout(60_000)
    });
    
    console.log(`Status: ${resp.status}`);
    if (resp.status !== 200) {
      console.log(`  Failed to fetch: HTTP ${resp.status}`);
      return;
    }
    
    const csvText = await resp.text();
    console.log(`Length: ${csvText.length} bytes`);
    
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      console.log(`  No data found (less than 2 lines).`);
      return;
    }
    
    const headers = parseCSVLine(lines[0]);
    console.log(`Headers: ${headers.join(', ')}`);
    
    // Find index of country dimension
    // Common country columns: REF_AREA, BORROWERS_CTY, LENDERS_CTY, DOM_CTY, etc.
    const ccHeaders = ['REF_AREA', 'BORROWERS_CTY', 'Reference area', "Borrowers' country", 'DOM_CTY'];
    let countryIdx = -1;
    for (const h of ccHeaders) {
      countryIdx = headers.indexOf(h);
      if (countryIdx !== -1) break;
    }
    
    if (countryIdx === -1) {
      // Look for a column name containing 'area' or 'country' or 'cty'
      countryIdx = headers.findIndex(h => /area|country|cty/i.test(h));
    }
    
    console.log(`Country column index: ${countryIdx} (${countryIdx !== -1 ? headers[countryIdx] : 'NOT FOUND'})`);
    
    // Group rows by unique series keys
    // A series key in SDMX is typically formed by the non-time, non-value dimensions in the header order.
    const timeIdx = headers.findIndex(h => /time/i.test(h) || h === 'TIME_PERIOD');
    const valIdx = headers.indexOf('OBS_VALUE') !== -1 ? headers.indexOf('OBS_VALUE') : headers.findIndex(h => /value/i.test(h));
    
    const keyDimensions = [];
    for (let i = 0; i < headers.length; i++) {
      if (i !== timeIdx && i !== valIdx) {
        keyDimensions.push({ name: headers[i], index: i });
      }
    }
    
    console.log(`Key dimensions: ${keyDimensions.map(kd => kd.name).join(', ')}`);
    
    const indiaSeries = new Map();
    let totalIndiaRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const lineVals = parseCSVLine(lines[i]);
      if (lineVals.length < headers.length) continue;
      
      // Determine if this is an India row
      let isIndia = false;
      if (countryIdx !== -1) {
        isIndia = lineVals[countryIdx] === 'IN';
      } else {
        // Fallback: check if 'IN' is in any field
        isIndia = lineVals.some(v => v === 'IN');
      }
      
      if (!isIndia) continue;
      totalIndiaRows++;
      
      // Form unique key for this series
      const keyParts = keyDimensions.map(kd => lineVals[kd.index]);
      const seriesKey = keyParts.join('.');
      
      if (!indiaSeries.has(seriesKey)) {
        indiaSeries.set(seriesKey, {
          keyParts,
          dimensionValues: Object.fromEntries(keyDimensions.map(kd => [kd.name, lineVals[kd.index]])),
          observations: []
        });
      }
      
      const timeVal = lineVals[timeIdx] || '';
      const obsVal = lineVals[valIdx] || '';
      indiaSeries.get(seriesKey).observations.push({ time: timeVal, value: obsVal });
    }
    
    console.log(`Total India rows: ${totalIndiaRows}`);
    console.log(`Unique India series: ${indiaSeries.size}`);
    
    if (indiaSeries.size > 0) {
      // Save a sample CSV file
      const sampleFile = path.join('scratch', `bis_${dataset.toLowerCase()}_india.csv`);
      
      // We will write all India rows for this dataset to the sample CSV
      let sampleCsvContent = headers.join(',') + '\n';
      let countWritten = 0;
      
      for (const [sKey, sData] of indiaSeries) {
        console.log(`\n  Series Key: ${sKey}`);
        console.log(`  Dimensions:`, sData.dimensionValues);
        sData.observations.sort((a, b) => a.time.localeCompare(b.time));
        const obs = sData.observations;
        console.log(`  Cadence/Freq: ${sData.dimensionValues.FREQ || 'N/A'}`);
        console.log(`  Observations count: ${obs.length}`);
        if (obs.length > 0) {
          console.log(`  Range: ${obs[0].time} to ${obs[obs.length - 1].time}`);
          console.log(`  Earliest value: ${obs[0].value}`);
          console.log(`  Latest value: ${obs[obs.length - 1].value}`);
        }
        
        // Add all rows for this series to the sample CSV
        for (const o of obs) {
          const rowVals = new Array(headers.length);
          // Fill key dimensions
          for (const kd of keyDimensions) {
            rowVals[kd.index] = sData.dimensionValues[kd.name];
          }
          rowVals[timeIdx] = o.time;
          rowVals[valIdx] = o.value;
          sampleCsvContent += rowVals.map(v => v.includes(',') ? `"${v}"` : v).join(',') + '\n';
          countWritten++;
        }
      }
      
      fs.writeFileSync(sampleFile, sampleCsvContent, 'utf8');
      console.log(`\nSaved ${countWritten} India rows to ${sampleFile}`);
    }
    
  } catch (err) {
    console.error(`Error probing ${dataset}: ${err.message}`);
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  for (const ds of DATASETS) {
    await probeDataset(ds);
  }
}

main();
