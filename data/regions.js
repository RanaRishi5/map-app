// Coromandel sub-regions. bbox = [south, west, north, east] (approximate, used for map bounds + OSM queries).
// Highlight coordinates are approximate (town / beach level); detailed peaks, streams, huts and tracks are loaded live from OpenStreetMap.
window.REGIONS = [
  {
    id: "far-north",
    name: "Northern Coromandel & Moehau",
    color: "#7a4b2a",
    bbox: [-36.62, 175.33, -36.40, 175.55],
    blurb: "Remote top of the peninsula: Colville, Port Jackson, Fletcher Bay and the Moehau Range. Gravel roads, empty beaches and the Coromandel Walkway.",
    activities: ["Hiking", "Camping", "Surfing", "Fishing", "4WD", "Stargazing"],
    highlights: [
      { name: "Colville", lat: -36.6417, lon: 175.4750, type: "town", note: "Last stop for supplies - general store and cafe." },
      { name: "Fletcher Bay (Coromandel Walkway end)", lat: -36.4950, lon: 175.3550, type: "walk", note: "Gravel road end; 3-4 h one-way walk to Stony Bay." }
    ]
  },
  {
    id: "coromandel-town",
    name: "Coromandel Town & Driving Creek",
    color: "#a05a2c",
    bbox: [-36.86, 175.38, -36.64, 175.60],
    blurb: "Historic gold and kauri town on the west coast with arts, oysters, the Driving Creek Railway and kauri walks in the Kauri Block.",
    activities: ["Hiking", "Kayaking", "Arts & craft", "Railway", "Gold-mining history", "Mountain biking"],
    highlights: [
      { name: "Coromandel Town", lat: -36.7592, lon: 175.4983, type: "town", note: "Main service town for the north." }
    ]
  },
  {
    id: "thames",
    name: "Thames & Kauaeranga (Pinnacles)",
    color: "#2f6b3a",
    bbox: [-37.25, 175.45, -36.95, 175.75],
    blurb: "Gateway town with gold-mining history and the Kauaeranga Valley, home of the Pinnacles, Coromandel's most famous hut-to-summit hike.",
    activities: ["Hiking", "Hut stays", "Camping", "Swimming holes", "Rock climbing", "Mining heritage"],
    highlights: [
      { name: "Thames", lat: -37.1383, lon: 175.5400, type: "town", note: "Largest town on the peninsula." },
      { name: "Kauaeranga Valley Visitor Centre", lat: -37.0545, lon: 175.6590, type: "info", note: "DOC hut bookings, track info (approx. location)." }
    ]
  },
  {
    id: "west-coast",
    name: "Thames Coast (Tapu to Te Mata)",
    color: "#2c6aa0",
    bbox: [-37.05, 175.40, -36.80, 175.55],
    blurb: "Pohutukawa-lined coastal road north of Thames with beaches, the Tapu-Coroglen road and the Rapaura Watergardens.",
    activities: ["Scenic drive", "Swimming", "Fishing", "Kayaking", "Short walks"],
    highlights: []
  },
  {
    id: "whitianga",
    name: "Whitianga & Mercury Bay",
    color: "#1e8fa8",
    bbox: [-36.92, 175.55, -36.75, 175.78],
    blurb: "Big-game fishing, kayaking and bay cruises around Mercury Bay, with Buffalo Beach, Shakespeare Cliff and a ferry to Ferry Landing.",
    activities: ["Fishing", "Kayaking", "Snorkelling", "Boat tours", "Walks", "Cycling"],
    highlights: [
      { name: "Whitianga", lat: -36.8333, lon: 175.7000, type: "town", note: "Mercury Bay hub." }
    ]
  },
  {
    id: "hahei",
    name: "Hahei, Cathedral Cove & Hot Water Beach",
    color: "#d0693a",
    bbox: [-36.93, 175.72, -36.80, 175.88],
    blurb: "The postcard Coromandel: Cathedral Cove, Hahei Beach, Hot Water Beach and the Te Whanganui-A-Hei Marine Reserve.",
    activities: ["Coastal walking", "Kayaking", "Snorkelling", "Hot pool digging", "Beach days", "Marine reserve"],
    highlights: [
      { name: "Cathedral Cove", lat: -36.8277, lon: 175.7906, type: "attraction", note: "Walk from Hahei or the Grange Rd car park; check DOC for track closures." },
      { name: "Hahei Beach", lat: -36.8431, lon: 175.7973, type: "beach", note: "Village, cafes, holiday park." },
      { name: "Hot Water Beach", lat: -36.8857, lon: 175.8205, type: "attraction", note: "Dig your own hot pool 2 h either side of low tide." }
    ]
  },
  {
    id: "kuaotunu",
    name: "Kuaotunu, Matarangi & Opito",
    color: "#c18f2b",
    bbox: [-36.78, 175.62, -36.66, 175.78],
    blurb: "Quiet east-coast beaches, the Otama and Opito bays and the Kuaotunu Peninsula walks.",
    activities: ["Beach", "Walks", "Surfing", "Golf", "Fishing"],
    highlights: []
  },
  {
    id: "tairua",
    name: "Tairua & Pauanui",
    color: "#7b4fa3",
    bbox: [-37.08, 175.78, -36.94, 175.92],
    blurb: "Twin towns split by the Tairua Harbour: climb Paku summit, take the ferry or paddle to Shoe Island.",
    activities: ["Hiking", "Kayaking", "Fishing", "Surfing", "Ferry rides"],
    highlights: [
      { name: "Tairua", lat: -36.9908, lon: 175.8546, type: "town", note: "Paku Peak walk starts here." },
      { name: "Pauanui", lat: -37.0184, lon: 175.8548, type: "town", note: "Canal-side holiday town." }
    ]
  },
  {
    id: "whangamata",
    name: "Whangamata & Wentworth Valley",
    color: "#c2417f",
    bbox: [-37.32, 175.70, -37.10, 175.95],
    blurb: "Surf town with a long beach, offshore islands and Wentworth Valley's falls and kauri-valley tracks.",
    activities: ["Surfing", "Hiking", "Island trips", "Camping", "Waterfalls", "Mountain biking"],
    highlights: [
      { name: "Whangamata", lat: -37.2087, lon: 175.8714, type: "town", note: "Surf, cafes and the Wentworth Falls walk." }
    ]
  },
  {
    id: "waihi",
    name: "Waihi, Waihi Beach & Karangahake Gorge",
    color: "#8a2f2f",
    bbox: [-37.47, 175.70, -37.33, 175.97],
    blurb: "Gold-mining country: the Karangahake Gorge Historic Walkway, the Hauraki Rail Trail and 10 km of Waihi Beach.",
    activities: ["Cycling", "Heritage walks", "Surfing", "Hauraki Rail Trail", "Mine tours"],
    highlights: [
      { name: "Waihi", lat: -37.3911, lon: 175.8403, type: "town", note: "Martha Mine, Goldfields Railway." },
      { name: "Karangahake Gorge", lat: -37.4244, lon: 175.7133, type: "walk", note: "Historic walkways and tunnels (approx. location)." }
    ]
  }
];

// Whole-peninsula bounds
window.COROMANDEL_BOUNDS = [[-37.50, 175.30], [-36.38, 176.00]];
