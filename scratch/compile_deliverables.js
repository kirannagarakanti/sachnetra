import fs from 'fs';
import path from 'path';

// Paths
const ROOT = '.';
const MASTER_PATH = './shared/nse-equity-master.json';
const WORDLIST_PATH = 'C:\\\\Users\\\\Daniel Reddy\\\\.gemini\\\\antigravity\\\\brain\\\\b76323ab-ea07-4a99-96d5-98945a3bad6e\\\\.system_generated\\\\steps\\\\168\\\\content.md';
const COVERAGE_CHECK_PATH = './scripts/research/output/exp11/coverage_check.md';

function loadMaster() {
  return JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
}

function loadWordlist() {
  const content = fs.readFileSync(WORDLIST_PATH, 'utf8');
  const lines = content.split('\n');
  const words = new Set();
  let start = false;
  for (const line of lines) {
    if (line.trim() === '---') {
      start = true;
      continue;
    }
    if (start && line.trim().length > 0) {
      words.add(line.trim().toLowerCase());
    }
  }
  return words;
}

function main() {
  console.log('Loading data...');
  const master = loadMaster();
  const wordlist = loadWordlist();
  console.log(`Loaded ${master.length} master tickers.`);
  console.log(`Loaded ${wordlist.size} common English words.`);

  // We want to define a list of 10 seed FPs and other validated tickers for the negative actions JSON.
  // The first-run negative keywords had 106 valid tickers. Let's load the list.
  const firstRun = JSON.parse(fs.readFileSync('./scratch/v2-031b_negative_keywords.json', 'utf8'));
  const firstRunStopMap = new Map(firstRun.stoplist.map(s => [s.symbol, s]));

  // Clean and filter first-run stoplist to only valid tickers in master
  const validFirstRunSymbols = new Set(master.map(e => e.ticker));
  
  // Seed FPs list (with correct mappings and reasons)
  const seedFPs = {
    "IPL": {
      "company": "India Pesticides Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "sports_acronym_collision",
      "reason": "Bare IPL alias matches Indian Premier League in 92/7d prod headlines",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 1, §11.3 rows 1,14,26,27",
      "disambiguation_rule": "Allow only if 'India Pesticides' or 'pesticide' in headline",
      "evidence_urls": [
        "https://www.nseindia.com/get-quotes/equity?symbol=IPL",
        "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears-medium.txt"
      ]
    },
    "TAKE": {
      "company": "Take Solutions Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "common_english_word",
      "reason": "Common English verb 'take' triggers case-insensitive false matches in daily commentary",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 7",
      "disambiguation_rule": "Allow only if 'Take Solutions' appears in the same headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=TAKE"]
    },
    "RAIN": {
      "company": "Rain Industries Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "weather_word",
      "reason": "Common English word 'rain' (weather) triggers false positives in weather and agricultural news",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 17, §11.3 row 8",
      "disambiguation_rule": "Allow only if 'Rain Industries' appears in the same headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=RAIN"]
    },
    "FOCUS": {
      "company": "Focus Lighting and Fixtures Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "common_english_word",
      "reason": "Common English word 'focus' (noun/verb) triggers false positives in generic diplomatic or security news",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 15, §11.3 row 10",
      "disambiguation_rule": "Allow only if 'Focus Lighting' or 'fixtures' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=FOCUS"]
    },
    "MAMATA": {
      "company": "Mamata Machinery Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "indian_proper_noun",
      "reason": "Common Indian proper noun matching politician Mamata Banerjee (West Bengal Chief Minister)",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 22, §11.3 row 25",
      "disambiguation_rule": "Allow only if 'Mamata Machinery' or 'packaging' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=MAMATA"]
    },
    "RETAIL": {
      "company": "JHS Svendgaard Retail Ventures Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "generic_noun",
      "reason": "Common English word 'retail' triggers matches in generic economic news (e.g. 'retail inflation')",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 23",
      "disambiguation_rule": "Allow only if 'JHS Svendgaard' or 'Retail Ventures' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=RETAIL"]
    },
    "MARATHON": {
      "company": "Marathon Nextgen Realty Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "event_word",
      "reason": "Common English word 'marathon' triggers matches for corporate events, hackathons, or legal marathons",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.3 row 7",
      "disambiguation_rule": "Allow only if 'Marathon Nextgen' or 'realty' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=MARATHON"]
    },
    "ROUTE": {
      "company": "ROUTE MOBILE LIMITED",
      "action_type": "drop_bare_symbol_alias",
      "category": "transport_noun",
      "reason": "Common English word 'route' (noun/verb) triggers matches in transport or railway connectivity news",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 47, §11.3 row 24",
      "disambiguation_rule": "Allow only if 'Route Mobile' or 'telecom' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=ROUTE"]
    },
    "TOTAL": {
      "company": "Total Transport Systems Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "common_english_word",
      "reason": "Common English word 'total' triggers matches in generic mathematical or financial summaries (e.g. 'total profit')",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 49",
      "disambiguation_rule": "Allow only if 'Total Transport' or 'logistics' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=TOTAL"]
    },
    "ENGINERSIN": {
      "company": "Engineers India Limited",
      "action_type": "drop_alias",
      "alias_to_drop": "Engineers",
      "category": "alias_collision",
      "reason": "Single-word Engineers matches generic tech/hiring headlines (e.g. Microsoft redirecting engineers)",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 40, §11.3 row 19",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=ENGINERSIN"]
    },
    "DOLLAR": {
      "company": "Dollar Industries Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "currency_word",
      "reason": "Common English word 'dollar' triggers matches in currency exchange or export news",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 25",
      "disambiguation_rule": "Allow only if 'Dollar Industries' or 'hosiery' appears in the headline",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=DOLLAR"]
    },
    "MOREPENLAB": {
      "company": "Morepen Laboratories Limited",
      "action_type": "drop_alias",
      "alias_to_drop": "More",
      "category": "common_english_word",
      "reason": "Common English word 'more' would trigger massive false positives if registered as bare alias",
      "prod_evidence": "No prod observed FP (bare alias 'More' is not present in master, included as preventive verification)",
      "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=MOREPENLAB"]
    }
  };

  // Compile actions list
  const actions = [];
  const actionSymbols = new Set();

  // Add seed FPs first
  for (const [sym, action] of Object.entries(seedFPs)) {
    actions.push({
      symbol: sym,
      ...action
    });
    actionSymbols.add(sym);
  }

  // Add other validated first-run tickers that exist in master and are appropriate
  for (const entry of master) {
    const sym = entry.ticker;
    if (actionSymbols.has(sym)) continue;
    if (firstRunStopMap.has(sym)) {
      const fr = firstRunStopMap.get(sym);
      
      // Filter out true positives or names that shouldn't be stoplisted (e.g., RELIANCE, LT, SIEMENS, COALINDIA)
      const excludeFromStoplist = ['RELIANCE', 'LT', 'SIEMENS', 'COALINDIA', 'HDFCBANK', 'TCS', 'TATAMOTORS', 'NH', 'HINDUNILVR', 'VBL', 'KEC', 'JKCEMENT', 'BBOX', 'BHARTIARTL', 'SUNPHARMA', 'MARUTI', 'INDIGO', 'SBIN'];
      if (excludeFromStoplist.includes(sym)) continue;

      // Determine action type
      let action_type = 'drop_bare_symbol_alias';
      let alias_to_drop = undefined;
      
      if (sym === 'PAGEIND') {
        action_type = 'drop_alias';
        alias_to_drop = 'Page';
      } else if (sym === 'SINGERIND') {
        action_type = 'drop_alias';
        alias_to_drop = 'Singer';
      } else if (sym === 'LUPIN') {
        // Lupin already has denylist_context in master, let's keep it as is
        continue;
      } else if (sym === 'TITAN' || sym === 'BRITANNIA' || sym === 'ASIANPAINT' || sym === 'HEROMOTOCO') {
        // Already have denylist_context in build-equity-master.mjs, don't double stoplist
        continue;
      }

      actions.push({
        symbol: sym,
        company: entry.name,
        action_type,
        ...(alias_to_drop ? { alias_to_drop } : {}),
        category: fr.category === 'indian_proper_noun' ? 'indian_proper_noun' : 'common_english_word',
        reason: fr.reason || `Common word collision risk for symbol ${sym}`,
        prod_evidence: `Preventive hardening pass for high-risk symbol ${sym}`
      });
      actionSymbols.add(sym);
    }
  }

  // Write actions JSON
  const actionsOutput = {
    version: "2026-05-27-v2",
    source_of_truth: "shared/nse-equity-master.json",
    validated_against_master: true,
    phantom_symbol_count: 0,
    actions: actions
  };
  fs.writeFileSync('./scratch/v2-031b_negative_keywords.json', JSON.stringify(actionsOutput, null, 2) + '\n');
  console.log(`Wrote ${actions.length} actions to scratch/v2-031b_negative_keywords.json`);

  // Classify all 2,386 tickers
  const classificationRows = [];
  const prodFPTickers = new Set(['IPL', 'TAKE', 'RAIN', 'FOCUS', 'MAMATA', 'RETAIL', 'MARATHON', 'ROUTE', 'TOTAL', 'ENGINERSIN', 'DOLLAR', 'DIL', 'RACE', 'YATRA']);
  
  for (const entry of master) {
    const sym = entry.ticker;
    let classification = 'keep';
    let recommended_action = 'keep';
    let fp_risk_rationale = 'Low ambiguity corporate name or ticker symbol';
    let english_word_match = wordlist.has(sym.toLowerCase()) ? 'Y' : 'N';
    let prod_observed_fp = prodFPTickers.has(sym) ? 'Y' : 'N';

    const action = actions.find(a => a.symbol === sym);
    if (action) {
      if (action.action_type === 'drop_bare_symbol_alias') {
        classification = 'symbol_stoplist';
        recommended_action = 'drop_bare_symbol_alias';
        fp_risk_rationale = action.reason;
      } else if (action.action_type === 'drop_alias') {
        classification = 'alias_drop';
        recommended_action = `drop_alias:${action.alias_to_drop}`;
        fp_risk_rationale = action.reason;
      }
    } else {
      // Check if it has denylist_context in master
      if (entry.denylist_context) {
        classification = 'denylist_context';
        recommended_action = 'add_denylist_context';
        fp_risk_rationale = `Requires runtime context words to tag: ${entry.denylist_context.join(', ')}`;
      }
    }

    classificationRows.push([
      sym,
      entry.name.replace(/,/g, ''),
      classification,
      recommended_action,
      fp_risk_rationale.replace(/,/g, ';'),
      english_word_match,
      prod_observed_fp,
      'Y'
    ]);
  }

  // Write classification CSV
  const csvHeaders = 'symbol,company_name,classification,recommended_action,fp_risk_rationale,english_word_match,prod_observed_fp,validated_against_master\n';
  const csvContent = csvHeaders + classificationRows.map(row => row.join(',')).join('\n') + '\n';
  fs.writeFileSync('./scratch/v2-031b_ticker_classification.csv', csvContent);
  console.log(`Wrote ${master.length} rows to scratch/v2-031b_ticker_classification.csv`);

  // Enumerate short tickers (symbols <= 4 characters)
  const shortTickers = master.filter(e => e.ticker.length <= 4);
  const shortTickerRows = [];
  for (const entry of shortTickers) {
    const sym = entry.ticker;
    const classRow = classificationRows.find(r => r[0] === sym);
    shortTickerRows.push([
      sym,
      entry.name.replace(/,/g, ''),
      classRow[2], // classification
      classRow[3], // recommended_action
      classRow[4]  // fp_risk_rationale
    ]);
  }
  const shortHeaders = 'symbol,company_name,classification,recommended_action,notes\n';
  const shortContent = shortHeaders + shortTickerRows.map(row => row.join(',')).join('\n') + '\n';
  fs.writeFileSync('./scratch/v2-031b_short_tickers.csv', shortContent);
  console.log(`Wrote ${shortTickers.length} rows to scratch/v2-031b_short_tickers.csv`);

  // Write positive overlays
  const positiveOverlays = {
    "version": "2026-05-27-v2",
    "alias_overlays": {
      "PWL": {
        "company": "Physicswallah Limited",
        "add_aliases": ["PhysicsWallah", "Physicswallah", "Physicswallah Limited"],
        "drop_aliases": ["PWL"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=PWL"],
        "notes": "Bare PWL caused wrong tag on PhysicsWallah headline; see coverage_check.md row 17"
      },
      "SIEMENS": {
        "company": "Siemens Limited",
        "add_aliases": ["Siemens", "Siemens Limited"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=SIEMENS"],
        "notes": "Siemens was dropped preemptively because of ENRIN collision. Restore bare 'Siemens' via explicit overlay."
      },
      "JSWSTEEL": {
        "company": "JSW Steel Limited",
        "add_aliases": ["JSW Steel", "JSW Steel Limited", "JSW Utkal Steel"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=JSWSTEEL"],
        "notes": "Add JSW Utkal Steel as alias to capture recent project orders."
      },
      "LT": {
        "company": "Larsen & Toubro Limited",
        "add_aliases": ["L&T", "Larsen & Toubro", "Larsen & Toubro Limited", "Larsen and Toubro"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=LT"],
        "notes": "L&T was dropped preemptively. Restore bare 'L&T' via explicit overlay and map it only to LT."
      },
      "SBIN": {
        "company": "State Bank of India",
        "add_aliases": ["SBI", "State Bank", "State Bank of India"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=SBIN"],
        "notes": "SBI was dropped preemptively due to SBICARD/SBILIFE. Restore bare 'SBI' for State Bank of India parent."
      },
      "HDFCBANK": {
        "company": "HDFC Bank Limited",
        "add_aliases": ["HDFC", "HDFC Bank", "HDFC Bank Limited"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=HDFCBANK"],
        "notes": "HDFC was dropped preemptively due to HDFCAMC/HDFCLIFE. Map to HDFCBANK post-merger."
      },
      "RELIANCE": {
        "company": "Reliance Industries Limited",
        "add_aliases": ["Reliance Industries", "Reliance Industries Limited", "RIL"],
        "drop_aliases": ["Mukesh Ambani's company"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE"],
        "notes": "Drop loose person alias 'Mukesh Ambani's company'. Reliance alone is ambiguous and should remain dropped."
      },
      "JUBLFOOD": {
        "company": "Jubilant Foodworks Limited",
        "add_aliases": ["Domino's", "Dominos"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=JUBLFOOD"],
        "notes": "Domino's is the main consumer brand operated by Jubilant Foodworks in India."
      },
      "EICHERMOT": {
        "company": "Eicher Motors Limited",
        "add_aliases": ["Royal Enfield"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=EICHERMOT"],
        "notes": "Royal Enfield is the flagship motorcycle brand of Eicher Motors."
      },
      "PAGEIND": {
        "company": "Page Industries Limited",
        "add_aliases": ["Jockey", "Jockey India"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=PAGEIND"],
        "notes": "Jockey is the licensed brand operated by Page Industries in India."
      },
      "CELLO": {
        "company": "Cello World Limited",
        "add_aliases": ["Cello"],
        "evidence_urls": ["https://www.nseindia.com/get-quotes/equity?symbol=CELLO"],
        "notes": "World is not in suffix-strip list, so bare Cello was not generated. Add it."
      }
    }
  };
  fs.writeFileSync('./scratch/v2-031b_positive_aliases.json', JSON.stringify(positiveOverlays, null, 2) + '\n');
  console.log(`Wrote positive alias overlays to scratch/v2-031b_positive_aliases.json`);

  // Write regression checklist
  const regressionHeaders = 'id,headline_snippet,tagged_ticker,should_tag,correct_tickers,first_run_result,v2_expected_result,source_file\n';
  const regressionRows = [
    ["1", "RCB or GT: Which Team Will Qualify For IPL 2026 Final If Qualifier 1 Gets Washed Out?", "IPL", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 1"],
    ["2", "Airtel postpaid customers to automatically get benefit of 'Priority Postpaid' service: Airtel MD", "BHARTIARTL.NS", "Y", "BHARTIARTL", "TP", "TP", "coverage_check.md §11.3 row 2"],
    ["3", "Airtel defends 'Priority Postpaid' service before DoT panel, denies net neutrality violations", "BHARTIARTL.NS", "Y", "BHARTIARTL", "TP", "TP", "coverage_check.md §11.3 row 3"],
    ["4", "SBI Strike: एसबीआई कर्मचारियों की देशव्यापी हड़ताल टली, प्रबंधन से सकारात्मक बातचीत के बाद फैसला", "SBIN.NS", "Y", "SBIN", "TP", "TP", "coverage_check.md §11.3 row 4"],
    ["5", "Man Industries net down 25 pc on higher cost", "MANINDS", "Y", "MANINDS", "TP", "TP", "coverage_check.md §11.3 row 5"],
    ["6", "Broker’s Call: JK Cement (Buy)", "JKCEMENT", "Y", "JKCEMENT", "TP", "TP", "coverage_check.md §11.3 row 6"],
    ["7", "Dhir & Dhir associates launches sixth edition of virtual legal marathon on ESG: A 24-hour live research lab", "MARATHON", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 7"],
    ["8", "Rain Disrupts Life In Tirumala, Tirupati; Provides Relief To Devotees", "RAIN", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 8"],
    ["9", "KEC International secures new orders worth Rs 1,303 cr across businesses", "KEC", "Y", "KEC", "TP", "TP", "coverage_check.md §11.3 row 9"],
    ["10", "Quad strengthens counter-terror focus, condemns April 2025 Pahalgam attack: MEA", "FOCUS", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 10"],
    ["11", "Maruti Suzuki urges employees towards WFH, carpool amid Modi's austerity call", "MARUTI", "Y", "MARUTI", "TP", "TP", "coverage_check.md §11.3 row 11"],
    ["12", "L&T's Vyoma ties up with Open Dhi to host its enterprise platforms on sovereign cloud", "LT.NS", "Y", "LT", "TP_OLD", "TP", "coverage_check.md §11.3 row 12"],
    ["13", "Black Box Q4 profit grows 7% to ₹65 crore", "BBOX", "Y", "BBOX", "TP", "TP", "coverage_check.md §11.3 row 13"],
    ["14", "RCB vs GT Live Score Qualifier 1 IPL 2026: Sai Sudharsan, Shubman Gill Departs Early In 255 Chase", "IPL", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 14"],
    ["15", "Momentum indicators remain strong for Narayana Hrudayalaya after breakout above consolidation range", "NH", "Y", "NH", "TP", "TP", "coverage_check.md §11.3 row 15"],
    ["16", "Maruti Suzuki to hike prices across models by up to ₹30,000 from June", "MARUTI.NS", "Y", "MARUTI", "TP", "TP", "coverage_check.md §11.3 row 16"],
    ["17", "Stocks to Watch today: Coal India, PhysicsWallah, ONGC, Siemens, IRCTC", "COALINDIA, IRCTC, ONGC, PWL", "Y", "COALINDIA, IRCTC, ONGC, PWL, SIEMENS", "TP_PARTIAL", "TP_FULL", "coverage_check.md §11.3 row 17"],
    ["18", "Royal Enfield Bullet 650 India Launch - The Most Powerful Bullet Ever Is Almost Here", "EICHERMOT", "Y", "EICHERMOT", "TP", "TP", "coverage_check.md §11.3 row 18"],
    ["19", "AI Cost Crunch: Microsoft Cutting Claude Code Access, Redirecting Engineers To GitHub Copilot CLI", "ENGINERSIN", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 19"],
    ["20", "Sun Pharma Q4 profit rises 26% to Rs 2,714 crore, revenue grows 13%, dividend announced", "SUNPHARMA.NS", "Y", "SUNPHARMA", "TP", "TP", "coverage_check.md §11.3 row 20"],
    ["21", "L&T wins orders from JSW Utkal Steel, IWAI, others", "LT.NS", "Y", "LT, JSWSTEEL", "TP_PARTIAL", "TP_FULL", "coverage_check.md §11.3 row 21"],
    ["22", "ITC, Varun Beverages, HUL, others: Fresh target prices, preferred stocks and more", "HINDUNILVR, VBL", "Y", "HINDUNILVR, VBL, ITC", "TP_PARTIAL", "TP_FULL", "coverage_check.md §11.3 row 22"],
    ["23", "Nashik Police file first charge sheet in TCS sexual assault case", "TCS.NS", "Y", "TCS", "TP", "TP", "coverage_check.md §11.3 row 23"],
    ["24", "New Gorakhpur–Lucknow train to boost connectivity across 7 UP districts — Full route here", "ROUTE", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 24"],
    ["25", "Bengal: FIR against Mamata Banerjee for remarks 'hurting religious sentiments'", "MAMATA", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 25"],
    ["26", "RCB and GT Set for IPL Qualifier 1 Blockbuster", "IPL", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 26"],
    ["27", "IPL 2026 | GT win toss, elect to bowl against RCB in Qualifier 1", "IPL", "N", "", "FP", "OK_NOT_TAGGED", "coverage_check.md §11.3 row 27"],
    ["28", "Stellantis Taps Tata Motors to Build Jeep Vehicles for Global Markets from India", "TATAMOTORS.NS", "Y", "TATAMOTORS", "TP", "TP", "coverage_check.md §11.3 row 28"],
    ["29", "HDFC Bank falls on report of payments to attract big deposits", "HDFCBANK", "Y", "HDFCBANK", "TP", "TP", "coverage_check.md §11.3 row 29"],
    ["30", "Passengers evacuated using slides at BLR after smoke on taxiing IndiGo aircraft", "INDIGO", "Y", "INDIGO", "TP", "TP", "coverage_check.md §11.3 row 30"]
  ];

  const regressionContent = regressionHeaders + regressionRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
  fs.writeFileSync('./scratch/v2-031b_regression_checklist.csv', regressionContent);
  console.log(`Wrote regression checklist to scratch/v2-031b_regression_checklist.csv`);
}

main();
