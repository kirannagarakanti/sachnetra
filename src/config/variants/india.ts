// India variant - sachnetra.com
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

// Re-export base config
export * from './base';

// Feeds for SachNetra — Indian news sources
import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';
const rss = rssProxyUrl;

// --------------------------------------------
// Map configuration — India variant
// --------------------------------------------

// Basemap: OpenFreeMap Positron (light grey, minimal, no API key required)
// Upgrade path: switch to 'carto' + 'dark-matter' post-launch (already in basemap.ts)
export const MAP_CONFIG = {
  defaultProvider: 'openfreemap' as const,
  defaultTheme: 'positron' as const,
  defaultMode: 'flat' as const,     // Never 3D globe on mobile
  mobileOptimized: true,
};

// Kashmir-compliant boundary overlay — MUST always load for india variant
// Source: https://github.com/datameet/maps (Survey of India official boundary, ODbL license)
// Upload target: R2 bucket at maps.sachnetra.com — deferred to infrastructure setup
// DeckGLMap wiring: deferred to Task 006.5
export const INDIA_BOUNDARY_OVERLAY = 'https://maps.sachnetra.com/india-states-official.geojson';

// --------------------------------------------
// State filtering — Task 007
// --------------------------------------------

/** All 36 states + UTs with display info for the state selector grid. */
export const INDIA_STATES: ReadonlyArray<{ code: string; name: string; city: string }> = [
  { code: 'AN', name: 'Andaman & Nicobar', city: 'Port Blair' },
  { code: 'AP', name: 'Andhra Pradesh', city: 'Amaravati' },
  { code: 'AR', name: 'Arunachal Pradesh', city: 'Itanagar' },
  { code: 'AS', name: 'Assam', city: 'Guwahati' },
  { code: 'BR', name: 'Bihar', city: 'Patna' },
  { code: 'CH', name: 'Chandigarh', city: 'Chandigarh' },
  { code: 'CT', name: 'Chhattisgarh', city: 'Raipur' },
  { code: 'DD', name: 'Daman & Diu', city: 'Daman' },
  { code: 'DL', name: 'Delhi', city: 'New Delhi' },
  { code: 'DN', name: 'Dadra & Nagar Haveli', city: 'Silvassa' },
  { code: 'GA', name: 'Goa', city: 'Panaji' },
  { code: 'GJ', name: 'Gujarat', city: 'Ahmedabad' },
  { code: 'HP', name: 'Himachal Pradesh', city: 'Shimla' },
  { code: 'HR', name: 'Haryana', city: 'Gurugram' },
  { code: 'JH', name: 'Jharkhand', city: 'Ranchi' },
  { code: 'JK', name: 'Jammu & Kashmir', city: 'Srinagar' },
  { code: 'KA', name: 'Karnataka', city: 'Bengaluru' },
  { code: 'KL', name: 'Kerala', city: 'Thiruvananthapuram' },
  { code: 'LA', name: 'Ladakh', city: 'Leh' },
  { code: 'LD', name: 'Lakshadweep', city: 'Kavaratti' },
  { code: 'MH', name: 'Maharashtra', city: 'Mumbai' },
  { code: 'ML', name: 'Meghalaya', city: 'Shillong' },
  { code: 'MN', name: 'Manipur', city: 'Imphal' },
  { code: 'MP', name: 'Madhya Pradesh', city: 'Bhopal' },
  { code: 'MZ', name: 'Mizoram', city: 'Aizawl' },
  { code: 'NL', name: 'Nagaland', city: 'Kohima' },
  { code: 'OR', name: 'Odisha', city: 'Bhubaneswar' },
  { code: 'PB', name: 'Punjab', city: 'Chandigarh' },
  { code: 'PY', name: 'Puducherry', city: 'Puducherry' },
  { code: 'RJ', name: 'Rajasthan', city: 'Jaipur' },
  { code: 'SK', name: 'Sikkim', city: 'Gangtok' },
  { code: 'TG', name: 'Telangana', city: 'Hyderabad' },
  { code: 'TN', name: 'Tamil Nadu', city: 'Chennai' },
  { code: 'TR', name: 'Tripura', city: 'Agartala' },
  { code: 'UP', name: 'Uttar Pradesh', city: 'Lucknow' },
  { code: 'UT', name: 'Uttarakhand', city: 'Dehradun' },
  { code: 'WB', name: 'West Bengal', city: 'Kolkata' },
];

/**
 * Keywords for matching news stories to states.
 * Source: ai_docs/prep/04_data_sources.md L195-233
 */
export const INDIA_STATE_KEYWORDS: Record<string, string[]> = {
  'AN': ['andaman', 'nicobar', 'port blair'],
  'AP': ['andhra', 'amaravati', 'visakhapatnam', 'vijayawada', 'tirupati'],
  'AR': ['arunachal', 'itanagar', 'tawang'],
  'AS': ['assam', 'guwahati', 'dispur', 'brahmaputra', 'barpeta', 'silchar'],
  'BR': ['bihar', 'patna', 'gaya', 'muzaffarpur'],
  'CH': ['chandigarh'],
  'CT': ['chhattisgarh', 'raipur', 'bilaspur', 'bastar', 'naxal'],
  'DD': ['daman', 'diu'],
  'DL': ['delhi', 'new delhi', 'ncr', 'lutyen', 'rashtrapati'],
  'DN': ['dadra', 'nagar haveli'],
  'GA': ['goa', 'panaji', 'margao'],
  'GJ': ['gujarat', 'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'kutch'],
  'HP': ['himachal', 'shimla', 'manali', 'dharamsala'],
  'HR': ['haryana', 'chandigarh', 'gurugram', 'faridabad', 'ambala'],
  'JH': ['jharkhand', 'ranchi', 'jamshedpur', 'dhanbad'],
  'JK': ['kashmir', 'jammu', 'srinagar', 'leh', 'ladakh', 'loc', 'pulwama', 'afspa'],
  'KA': ['karnataka', 'bengaluru', 'bangalore', 'mysuru', 'hubli'],
  'KL': ['kerala', 'thiruvananthapuram', 'kochi', 'kozhikode', 'wayanad'],
  'LA': ['ladakh', 'leh', 'kargil', 'lac', 'galwan'],
  'LD': ['lakshadweep'],
  'MH': ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'thane', 'aurangabad'],
  'ML': ['meghalaya', 'shillong'],
  'MN': ['manipur', 'imphal', 'meitei', 'kuki', 'ethnic violence'],
  'MP': ['madhya pradesh', 'bhopal', 'indore', 'gwalior', 'jabalpur'],
  'MZ': ['mizoram', 'aizawl'],
  'NL': ['nagaland', 'kohima', 'dimapur'],
  'OR': ['odisha', 'bhubaneswar', 'cuttack', 'puri', 'cyclone odisha'],
  'PB': ['punjab', 'amritsar', 'ludhiana', 'chandigarh', 'farmer'],
  'PY': ['puducherry', 'pondicherry'],
  'RJ': ['rajasthan', 'jaipur', 'jodhpur', 'udaipur', 'kota'],
  'SK': ['sikkim', 'gangtok'],
  'TG': ['telangana', 'hyderabad', 'warangal', 'nizamabad'],
  'TN': ['tamil nadu', 'chennai', 'madurai', 'coimbatore', 'trichy', 'salem'],
  'TR': ['tripura', 'agartala'],
  'UP': ['uttar pradesh', 'lucknow', 'noida', 'agra', 'varanasi', 'kanpur', 'prayagraj', 'ayodhya'],
  'UT': ['uttarakhand', 'dehradun', 'haridwar', 'rishikesh', 'nainital'],
  'WB': ['west bengal', 'kolkata', 'calcutta', 'siliguri', 'darjeeling', 'howrah'],
};

/**
 * Maps kebab-case data-state attribute values (from panel-layout.ts grid cells)
 * to 2-letter state codes used by INDIA_STATE_KEYWORDS.
 * 'all' maps to empty string (= no filter / All India).
 */
export const STATE_SLUG_TO_CODE: Record<string, string> = {
  'all': '',
  'andaman-nicobar': 'AN',
  'andhra-pradesh': 'AP',
  'arunachal-pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chandigarh': 'CH',
  'chhattisgarh': 'CT',
  'daman-diu': 'DD',
  'delhi': 'DL',
  'dadra-nagar-haveli': 'DN',
  'goa': 'GA',
  'gujarat': 'GJ',
  'himachal-pradesh': 'HP',
  'haryana': 'HR',
  'jharkhand': 'JH',
  'jammu-kashmir': 'JK',
  'karnataka': 'KA',
  'kerala': 'KL',
  'ladakh': 'LA',
  'lakshadweep': 'LD',
  'maharashtra': 'MH',
  'meghalaya': 'ML',
  'manipur': 'MN',
  'madhya-pradesh': 'MP',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OR',
  'punjab': 'PB',
  'puducherry': 'PY',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'telangana': 'TG',
  'tamil-nadu': 'TN',
  'tripura': 'TR',
  'uttar-pradesh': 'UP',
  'uttarakhand': 'UT',
  'west-bengal': 'WB',
};

export const FEEDS: Record<string, Feed[]> = {
  // Tier 1 — Wire Services & Major Broadcasters
  politics: [
    { name: 'NDTV', url: rss('https://feeds.feedburner.com/ndtvnews-top-stories'), region: 'national' },
    { name: 'The Hindu', url: rss('https://www.thehindu.com/news/feeder/default.rss'), region: 'national' },
    { name: 'Indian Express', url: rss('https://news.google.com/rss/search?q=site:indianexpress.com+India&hl=en&gl=IN&ceid=IN:en'), region: 'national' },
    { name: 'ANI', url: rss('https://www.aninews.in/rss/india.xml'), region: 'national' },
    { name: 'Times of India', url: rss('https://timesofindia.indiatimes.com/rssfeedstopstories.cms'), region: 'national' },
    // Tier 2 — Established outlets
    { name: 'Hindustan Times', url: rss('https://news.google.com/rss/search?q=site:hindustantimes.com+India&hl=en&gl=IN&ceid=IN:en'), region: 'national' },
    { name: 'India Today', url: rss('https://www.indiatoday.in/rss/1206578'), region: 'national' },
    // Tier 2 — Quality independent journalism
    { name: 'The Wire', url: rss('https://thewire.in/feed'), region: 'national', propagandaRisk: 'low' },
    { name: 'Scroll', url: rss('https://scroll.in/feed'), region: 'national' },
    { name: 'The Print', url: rss('https://theprint.in/feed'), region: 'national' },
  ],

  disaster: [
    { name: 'NDTV India', url: rss('https://feeds.feedburner.com/ndtvnews-india-news'), region: 'national' },
    { name: 'The Hindu Environment', url: rss('https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss'), region: 'national' },
  ],

  economy: [
    { name: 'LiveMint', url: rss('https://news.google.com/rss/search?q=site:livemint.com&hl=en&gl=IN&ceid=IN:en'), region: 'national' },
    { name: 'Economic Times', url: rss('https://news.google.com/rss/search?q=site:economictimes.indiatimes.com&hl=en&gl=IN&ceid=IN:en'), region: 'national' },
    { name: 'Business Standard', url: rss('https://news.google.com/rss/search?q=site:business-standard.com&hl=en&gl=IN&ceid=IN:en'), region: 'national' },
  ],

  technology: [
    { name: 'YourStory', url: rss('https://yourstory.com/feed'), region: 'national' },
    { name: 'Inc42', url: rss('https://inc42.com/feed/'), region: 'national' },
  ],

  // State-affiliated sources — tagged for UI transparency
  government: [
    { name: 'DD News', url: rss('https://news.google.com/rss/search?q=site:ddnews.gov.in&hl=en&gl=IN&ceid=IN:en'), region: 'national', stateAffiliated: 'India' },
    { name: 'PIB', url: rss('https://news.google.com/rss/search?q=site:pib.gov.in&hl=en&gl=IN&ceid=IN:en'), region: 'national', stateAffiliated: 'India' },
  ],
};


export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  'live-news': { name: 'India News', enabled: true, priority: 1 },
  // RSS article panels — keys must match FEEDS category keys
  'politics': { name: 'Politics', enabled: true, priority: 2 },
  'disaster': { name: 'Disaster & Environment', enabled: true, priority: 3 },
  'economy': { name: 'Economy', enabled: true, priority: 4 },
  'technology': { name: 'Technology', enabled: true, priority: 5 },
  'government': { name: 'Government', enabled: true, priority: 6 },
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,
  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: true,
  economic: false,
  waterways: false,
  outages: false,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech variant layers (not used in india variant)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance variant layers
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity variant layers
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
};

export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,
  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: false,
  waterways: false,
  outages: false,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: false,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech variant layers (not used in india variant)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance variant layers
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity variant layers
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
};

export const VARIANT_CONFIG: VariantConfig = {
  name: 'india',
  description: 'SachNetra — Indian news clarity tool',
  panels: DEFAULT_PANELS,
  mapLayers: DEFAULT_MAP_LAYERS,
  mobileMapLayers: MOBILE_DEFAULT_MAP_LAYERS,
};
