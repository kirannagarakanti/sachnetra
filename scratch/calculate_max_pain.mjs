import fs from 'node:fs';

const nifty = JSON.parse(fs.readFileSync('scratch/nse_optionchain_NIFTY.json', 'utf8'));

function calculateMetrics(data) {
  const rows = data.records.data;
  
  // 1. PCR Calculation
  const totPeOI = data.filtered.PE.totOI;
  const totCeOI = data.filtered.CE.totOI;
  const pcr = totPeOI / totCeOI;
  
  console.log(`--- PCR Analysis ---`);
  console.log(`Total PE OI: ${totPeOI}`);
  console.log(`Total CE OI: ${totCeOI}`);
  console.log(`Derived PCR: ${pcr.toFixed(4)}`);
  
  // 2. Max Pain Calculation
  // We need to calculate the pain at each strike price.
  // The strikes are present in records.strikePrices
  const strikes = data.records.strikePrices;
  let minPain = Infinity;
  let maxPainStrike = null;
  const painValues = [];

  for (const targetStrike of strikes) {
    let totalPain = 0;
    for (const row of rows) {
      const strike = row.strikePrice;
      
      // Call Pain (if targetStrike < strike, Call is ITM at strike)
      if (row.CE && strike > targetStrike) {
        totalPain += (strike - targetStrike) * (row.CE.openInterest || 0);
      }
      // Put Pain (if targetStrike > strike, Put is ITM at strike)
      if (row.PE && strike < targetStrike) {
        totalPain += (targetStrike - strike) * (row.PE.openInterest || 0);
      }
    }
    
    painValues.push({ strike: targetStrike, pain: totalPain });
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = targetStrike;
    }
  }

  console.log(`\n--- Max Pain Analysis ---`);
  console.log(`Computed Max Pain Strike: ${maxPainStrike}`);
  console.log(`Minimum Pain Value: ${minPain}`);
  
  // Let's sort and print a few strikes around max pain
  painValues.sort((a, b) => a.pain - b.pain);
  console.log('Top 5 strikes with lowest pain (best candidates):');
  painValues.slice(0, 5).forEach(pv => {
    console.log(`  Strike: ${pv.strike} | Pain: ${pv.pain.toFixed(0)}`);
  });
}

calculateMetrics(nifty);
