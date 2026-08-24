/*
  Sample shops. Coordinates are real places in the DC / Northern Virginia metro
  so the map has a believable spread and pins actually cluster at low zoom.

  Add shops by appending here; the seed is idempotent and matches on
  (name, city).
*/

export type MechanicSpec = {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  specialties: string[];
};

export const MECHANICS: MechanicSpec[] = [
  {
    name: "Apex Motorworks",
    description: "European performance specialists. In-house dyno and corner balancing.",
    address: "3410 Pickett Rd",
    city: "Fairfax", state: "VA", zip: "22031",
    lat: 38.8462, lng: -77.3064,
    phone: "703-555-0142", website: "https://example.com/apex",
    specialties: ["Brake pads + rotors", "Suspension", "Spark plugs", "Diagnostic"],
  },
  {
    name: "Redline Auto Service",
    description: "General repair with a strong Subaru and Ford following.",
    address: "820 W Broad St",
    city: "Falls Church", state: "VA", zip: "22046",
    lat: 38.8823, lng: -77.1711,
    phone: "703-555-0188", website: null,
    specialties: ["Oil change", "Tires", "Alignment", "Coolant service"],
  },
  {
    name: "Torque District",
    description: "Enthusiast-owned. Track prep and alignment specialists.",
    address: "1145 Fern St",
    city: "Arlington", state: "VA", zip: "22202",
    lat: 38.8577, lng: -77.0524,
    phone: "703-555-0199", website: "https://example.com/torque",
    specialties: ["Alignment", "Suspension", "Exhaust", "Brake pads"],
  },
  {
    name: "Potomac German Auto",
    description: "BMW, Mercedes, and Audi service. Factory diagnostic tooling.",
    address: "7412 Fullerton Rd",
    city: "Springfield", state: "VA", zip: "22153",
    lat: 38.7515, lng: -77.2119,
    phone: "703-555-0221", website: "https://example.com/potomac",
    specialties: ["Diagnostic", "Timing chain / belt", "Water pump", "Motor mounts"],
  },
  {
    name: "Rosslyn Import Service",
    description: "Independent import shop serving the Arlington corridor since 1998.",
    address: "1500 Wilson Blvd",
    city: "Arlington", state: "VA", zip: "22209",
    lat: 38.8951, lng: -77.0721,
    phone: "703-555-0233", website: null,
    specialties: ["Oil change", "Battery", "Air conditioning", "Diagnostic"],
  },
  {
    name: "Capitol Performance",
    description: "Forced induction builds and tuning. Mustang and Camaro heavy.",
    address: "2401 Bladensburg Rd NE",
    city: "Washington", state: "DC", zip: "20018",
    lat: 38.9256, lng: -76.9711,
    phone: "202-555-0177", website: "https://example.com/capitol",
    specialties: ["Turbocharger", "Exhaust", "Clutch", "Differential service"],
  },
  {
    name: "Navy Yard Auto Works",
    description: "Daily-driver maintenance close to the ballpark.",
    address: "1220 Half St SE",
    city: "Washington", state: "DC", zip: "20003",
    lat: 38.8752, lng: -77.0055,
    phone: "202-555-0164", website: null,
    specialties: ["Oil change", "Brake pads", "Tires", "Battery"],
  },
  {
    name: "Bethesda Motorsport",
    description: "Porsche and Lexus specialists with loaner fleet.",
    address: "4915 Fairmont Ave",
    city: "Bethesda", state: "MD", zip: "20814",
    lat: 38.9847, lng: -77.0947,
    phone: "301-555-0142", website: "https://example.com/bethesda",
    specialties: ["Suspension", "Brake pads + rotors", "Coolant service", "Alignment"],
  },
  {
    name: "Silver Spring Service Co.",
    description: "Family-run general repair. Strong Honda and Toyota reputation.",
    address: "8730 Georgia Ave",
    city: "Silver Spring", state: "MD", zip: "20910",
    lat: 38.9987, lng: -77.0286,
    phone: "301-555-0155", website: null,
    specialties: ["Oil change", "Timing chain / belt", "Transmission service", "Thermostat"],
  },
  {
    name: "Rockville Precision Auto",
    description: "Diagnostics-first shop. Heavy on electrical and drivability.",
    address: "1400 E Gude Dr",
    city: "Rockville", state: "MD", zip: "20850",
    lat: 39.0916, lng: -77.1329,
    phone: "301-555-0198", website: "https://example.com/rockville",
    specialties: ["Diagnostic", "Battery", "Spark plugs", "Air conditioning"],
  },
  {
    name: "Alexandria Auto Clinic",
    description: "Old Town independent. Volvo and Land Rover experience.",
    address: "1600 King St",
    city: "Alexandria", state: "VA", zip: "22314",
    lat: 38.8065, lng: -77.0619,
    phone: "703-555-0111", website: null,
    specialties: ["Oil change", "Suspension", "Brake pads", "Coolant service"],
  },
  {
    name: "Del Ray Garage",
    description: "Neighborhood shop with quick turnaround on routine work.",
    address: "2400 Mount Vernon Ave",
    city: "Alexandria", state: "VA", zip: "22301",
    lat: 38.8283, lng: -77.0594,
    phone: "703-555-0126", website: null,
    specialties: ["Oil change", "Tires", "Alignment", "Battery"],
  },
  {
    name: "Tysons Euro Werks",
    description: "Audi and VW focused. TSI and DSG service done in-house.",
    address: "8300 Boone Blvd",
    city: "Vienna", state: "VA", zip: "22182",
    lat: 38.9246, lng: -77.2242,
    phone: "703-555-0170", website: "https://example.com/tysons",
    specialties: ["Transmission service", "Turbocharger", "Water pump", "Diagnostic"],
  },
  {
    name: "Reston Motor Care",
    description: "Hybrid and EV capable. High-voltage certified technicians.",
    address: "11400 Sunset Hills Rd",
    city: "Reston", state: "VA", zip: "20190",
    lat: 38.9532, lng: -77.3479,
    phone: "703-555-0182", website: null,
    specialties: ["Battery", "Diagnostic", "Brake pads", "Air conditioning"],
  },
  {
    name: "Herndon Truck & Auto",
    description: "Trucks, SUVs, and tow packages. Ram and F-150 heavy.",
    address: "540 Elden St",
    city: "Herndon", state: "VA", zip: "20170",
    lat: 38.9696, lng: -77.3861,
    phone: "703-555-0193", website: null,
    specialties: ["Differential service", "Suspension", "Exhaust", "Oil change"],
  },
  {
    name: "Manassas Motorworks",
    description: "Domestic V8 specialists. Engine and transmission rebuilds.",
    address: "8500 Centreville Rd",
    city: "Manassas", state: "VA", zip: "20110",
    lat: 38.7509, lng: -77.4753,
    phone: "703-555-0147", website: "https://example.com/manassas",
    specialties: ["Clutch", "Transmission service", "Motor mounts", "Exhaust"],
  },
  {
    name: "Woodbridge Auto Center",
    description: "Full-service shop off I-95 with state inspection.",
    address: "14000 Jefferson Davis Hwy",
    city: "Woodbridge", state: "VA", zip: "22191",
    lat: 38.6409, lng: -77.2669,
    phone: "703-555-0158", website: null,
    specialties: ["Oil change", "Brake pads + rotors", "Tires", "Diagnostic"],
  },
  {
    name: "Sterling Sportscar Service",
    description: "Exotics and low-volume cars. Ferrari and McLaren experience.",
    address: "22570 Shaw Rd",
    city: "Sterling", state: "VA", zip: "20166",
    lat: 39.0207, lng: -77.4172,
    phone: "703-555-0166", website: "https://example.com/sterling",
    specialties: ["Suspension", "Brake pads + rotors", "Coolant service", "Alignment"],
  },
  {
    name: "College Park Auto",
    description: "Student-friendly pricing on routine maintenance.",
    address: "9200 Baltimore Ave",
    city: "College Park", state: "MD", zip: "20740",
    lat: 38.9897, lng: -76.9378,
    phone: "301-555-0132", website: null,
    specialties: ["Oil change", "Battery", "Tires", "Brake pads"],
  },
  {
    name: "Gaithersburg Import Tech",
    description: "Japanese import specialists. Subaru head gaskets a specialty.",
    address: "800 Muddy Branch Rd",
    city: "Gaithersburg", state: "MD", zip: "20878",
    lat: 39.1305, lng: -77.2233,
    phone: "301-555-0179", website: null,
    specialties: ["Timing chain / belt", "Water pump", "Thermostat", "Diagnostic"],
  },
  {
    name: "Annandale Complete Car Care",
    description: "Long-running neighborhood shop, strong on suspension work.",
    address: "7000 Columbia Pike",
    city: "Annandale", state: "VA", zip: "22003",
    lat: 38.8304, lng: -77.1964,
    phone: "703-555-0135", website: null,
    specialties: ["Suspension", "Alignment", "Oil change", "Motor mounts"],
  },
  {
    name: "Chantilly Autohaus",
    description: "German marque service with weekend appointments.",
    address: "14500 Lee Jackson Memorial Hwy",
    city: "Chantilly", state: "VA", zip: "20151",
    lat: 38.8846, lng: -77.4311,
    phone: "703-555-0184", website: "https://example.com/chantilly",
    specialties: ["Spark plugs", "Coolant service", "Brake pads + rotors", "Diagnostic"],
  },
  {
    name: "Hyattsville Garage",
    description: "Honest general repair with transparent estimates.",
    address: "5500 Baltimore Ave",
    city: "Hyattsville", state: "MD", zip: "20781",
    lat: 38.9548, lng: -76.9419,
    phone: "301-555-0121", website: null,
    specialties: ["Oil change", "Brake pads", "Air conditioning", "Battery"],
  },
  {
    name: "Leesburg Performance",
    description: "Track day prep, brake upgrades, and corner balancing.",
    address: "1000 Edwards Ferry Rd NE",
    city: "Leesburg", state: "VA", zip: "20176",
    lat: 39.1157, lng: -77.5478,
    phone: "703-555-0190", website: null,
    specialties: ["Brake pads + rotors", "Suspension", "Alignment", "Exhaust"],
  },
  {
    name: "Fairfax Transmission Works",
    description: "Automatic and manual transmission rebuilds, clutches same day.",
    address: "10500 Lee Hwy",
    city: "Fairfax", state: "VA", zip: "22030",
    lat: 38.8637, lng: -77.2794,
    phone: "703-555-0173", website: null,
    specialties: ["Transmission service", "Clutch", "Differential service", "Diagnostic"],
  },
];
