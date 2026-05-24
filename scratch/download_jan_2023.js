import { execSync } from 'child_process';
import fs from 'fs';
import XLSX from 'xlsx';

// Define the static state-to-region mapping based on our structural analysis
const stateRegionMap = {
  // Northern Region (NR)
  'Punjab': 'NR',
  'Haryana': 'NR',
  'Rajasthan': 'NR',
  'Delhi': 'NR',
  'UP': 'NR',
  'Uttarakhand': 'NR',
  'HP': 'NR',
  'J&K(UT) & Ladakh(UT)': 'NR',
  'Chandigarh': 'NR',
  'Railways_NR ISTS': 'NR',
  // Western Region (WR)
  'Chhattisgarh': 'WR',
  'Gujarat': 'WR',
  'MP': 'WR',
  'Maharashtra': 'WR',
  'Goa': 'WR',
  'DNHDDPDCL': 'WR',
  'AMNSIL': 'WR',
  'BALCO': 'WR',
  'RIL JAMNAGAR': 'WR',
  // Southern Region (SR)
  'Andhra Pradesh': 'SR',
  'Telangana': 'SR',
  'Karnataka': 'SR',
  'Kerala': 'SR',
  'Tamil Nadu': 'SR',
  'Puducherry': 'SR',
  // Eastern Region (ER)
  'Bihar': 'ER',
  'DVC': 'ER',
  'Jharkhand': 'ER',
  'Odisha': 'ER',
  'West Bengal': 'ER',
  'Sikkim': 'ER',
  'Railways_ER ISTS': 'ER',
  // North-Eastern Region (NER)
  'Arunachal Pradesh': 'NER',
  'Assam': 'NER',
  'Manipur': 'NER',
  'Meghalaya': 'NER',
  'Mizoram': 'NER',
  'Nagaland': 'NER',
  'Tripura': 'NER'
};

function cleanValue(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'string') {
    const clean = val.trim();
    if (clean === '-' || clean === '') return 0;
    const num = parseFloat(clean);
    if (!isNaN(num) && isFinite(clean)) return num;
    return clean;
  }
  return val;
}

function run() {
  const url = 'https://webapi.grid-india.in/api/v1/file';
  const body = {
    _source: 'GRDW',
    _type: 'DAILY_PSP_REPORT',
    _fileDate: '2022-23',
    _month: '01'
  };
  
  console.log("Querying files for January 2023...");
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    const data = JSON.parse(response);
    if (!data.retData || data.retData.length === 0) {
      console.log("No files found.");
      return;
    }
    
    // Find a sample XLS file (let's say 15.01.23_NLDC_PSP or similar)
    const xlsFiles = data.retData.filter(f => (f.FilePath || '').toLowerCase().endsWith('.xls'));
    console.log(`Found ${xlsFiles.length} XLS files in January 2023.`);
    
    const sample = xlsFiles.find(f => f.Title_.includes('15.01.23') || f.Title_.includes('15-01-23'));
    if (!sample) {
      console.log("Could not find sample for Jan 15, 2023. Using the first available XLS file.");
    }
    
    const targetFile = sample || xlsFiles[0];
    console.log("Selected sample file:", targetFile);
    
    const downloadUrl = `https://webcdn.grid-india.in/${targetFile.FilePath}`;
    const localPath = 'scratch/posoco_psp_2023_01_15.xls';
    
    console.log(`Downloading ${downloadUrl} to ${localPath}...`);
    execSync(`curl.exe -k -s -o ${localPath} "${downloadUrl}"`);
    console.log("Download complete. File size:", fs.statSync(localPath).size, "bytes");
    
    // Now parse it dynamically to verify compatibility
    console.log("Parsing downloaded Jan 2023 file...");
    const workbook = XLSX.readFile(localPath);
    const sheet = workbook.Sheets['MOP_E'];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find reporting date
    let reportingDateStr = null;
    for (let r = 0; r < Math.min(sheetData.length, 10); r++) {
      const row = sheetData[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        if (typeof row[c] === 'string' && row[c].includes('Date of Reporting:')) {
          for (let nextC = c + 1; nextC < row.length; nextC++) {
            if (row[nextC]) {
              reportingDateStr = row[nextC].toString().trim();
              break;
            }
          }
          break;
        }
      }
      if (reportingDateStr) break;
    }
    
    console.log(`Date of Reporting cell: "${reportingDateStr}"`);
    const reportingDate = new Date(reportingDateStr);
    const targetDate = new Date(reportingDate.getTime() - 24 * 60 * 60 * 1000);
    const targetDateFormatted = targetDate.toISOString().split('T')[0];
    console.log(`Calculated Target Date: ${targetDateFormatted}`);
    
    // Find start of Section C
    let startIdx = -1;
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (row && row[0] && typeof row[0] === 'string' && row[0].includes('C. Power Supply Position in States')) {
        startIdx = i;
        break;
      }
    }
    
    console.log(`Section C header found at row ${startIdx + 1}`);
    const dataStartIdx = startIdx + 3;
    const parsedRecords = [];
    
    for (let idx = dataStartIdx; idx < sheetData.length; idx++) {
      const row = sheetData[idx];
      if (!row || row.length === 0) break;
      if (row[0] && typeof row[0] === 'string' && (row[0].startsWith('D. ') || row[0].includes('Transnational Exchanges'))) {
        break;
      }
      
      const stateName = row[1] ? row[1].trim() : null;
      if (!stateName) break;
      
      const region = stateRegionMap[stateName];
      
      const maxDemandMetMW = cleanValue(row[2]);
      const shortageMaxDemandMW = cleanValue(row[3]);
      const energyMetMU = cleanValue(row[4]);
      const drawalScheduleMU = cleanValue(row[5]);
      const odUdMU = cleanValue(row[6]);
      const maxOdUdMW = cleanValue(row[7]);
      const energyShortageMU = cleanValue(row[8]);
      
      parsedRecords.push({
        target_date: targetDateFormatted,
        region: region || 'UNKNOWN',
        state_name: stateName,
        max_demand_met_mw: maxDemandMetMW,
        shortage_max_demand_mw: shortageMaxDemandMW,
        energy_met_mu: energyMetMU,
        drawal_schedule_mu: drawalScheduleMU,
        od_ud_mu: odUdMU,
        max_od_ud_mw: maxOdUdMW,
        energy_shortage_mu: energyShortageMU
      });
    }
    
    console.log(`Successfully parsed ${parsedRecords.length} records dynamically from Jan 2023!`);
    console.log("States parsed:", parsedRecords.map(r => r.state_name).join(', '));
    console.log("Sample Punjab record:", parsedRecords[0]);
  } catch (err) {
    console.error("Error occurred:", err.message);
  }
}

run();
