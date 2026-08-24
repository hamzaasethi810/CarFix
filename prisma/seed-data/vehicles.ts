/*
  Vehicle taxonomy seed data.

  This is the ONLY file to edit when adding cars. `npm run db:seed` is
  idempotent, so re-running it after adding entries inserts just the new rows
  and leaves existing ones (and every experience attached to them) untouched.

  Shape:
    make -> model -> generation

  A generation carries the enthusiast chassis code and its year range. When a
  model is facelifted mid-generation, list the halves separately and give both
  the same `platform`, which is what makes them aggregate together:

      { code: "W212",  from: 2010, to: 2013, platform: "W212" }
      { code: "W212R", from: 2014, to: 2016, platform: "W212" }

  Pricing and search can then be read at either level — the exact generation
  (a 2015 W212R) or the whole platform (every W212 E-Class).

  `from`/`to` are model years, inclusive. `to: null` means still in production.
  Generations must not overlap within a model: the year the owner enters is
  what resolves the generation, so an overlap would make that ambiguous.
*/

import { mergeMakes, type MakeSpec } from "./types";
import { MAJOR_MAKES } from "./vehicles-major";

export type { GenerationSpec, ModelSpec, MakeSpec } from "./types";

export const ENGINES = [
  "1.5L I4 Turbo",
  "1.6L I4",
  "2.0L I4",
  "2.0L I4 Turbo",
  "2.4L I4",
  "2.5L I4",
  "2.5L H4 Turbo",
  "3.0L I6",
  "3.0L I6 Turbo",
  "3.0L I6 Twin-Turbo",
  "3.0L V6",
  "3.0L V6 Supercharged",
  "3.5L V6",
  "3.6L V6",
  "3.8L V6 Twin-Turbo",
  "4.0L V8 Twin-Turbo",
  "5.0L V8",
  "5.7L V8",
  "6.2L V8",
  "6.2L V8 Supercharged",
  "Electric — Single Motor",
  "Electric — Dual Motor",
];

export const DRIVETRAINS = ["FWD", "RWD", "AWD", "4WD"];

/*
  Services people actually report on, grouped so the picker stays navigable.
  This covers maintenance and repair as well as the modification work
  enthusiasts care about — a wrap or an exhaust install is exactly the kind of
  job where prices vary wildly and owner reports are worth having.

  Add a service by appending here; the seed is idempotent and the category is
  what the search groups by.
*/
export const SERVICES: { name: string; category: string }[] = [
  // Routine
  { name: "Oil change", category: "Maintenance" },
  { name: "Spark plugs", category: "Maintenance" },
  { name: "Battery", category: "Maintenance" },
  { name: "Coolant service", category: "Maintenance" },
  { name: "Transmission service", category: "Maintenance" },
  { name: "Differential service", category: "Maintenance" },
  { name: "Timing chain / belt", category: "Maintenance" },
  { name: "Air conditioning", category: "Maintenance" },
  { name: "Fluid flush", category: "Maintenance" },

  // Brakes, tyres, alignment
  { name: "Brake pads", category: "Brakes & Tires" },
  { name: "Brake pads + rotors", category: "Brakes & Tires" },
  { name: "Brake fluid flush", category: "Brakes & Tires" },
  { name: "Big brake kit install", category: "Brakes & Tires" },
  { name: "Tires", category: "Brakes & Tires" },
  { name: "Alignment", category: "Brakes & Tires" },
  { name: "Corner balancing", category: "Brakes & Tires" },
  { name: "Wheel installation", category: "Brakes & Tires" },

  // Repair
  { name: "Water pump", category: "Repair" },
  { name: "Thermostat", category: "Repair" },
  { name: "Motor mounts", category: "Repair" },
  { name: "Clutch", category: "Repair" },
  { name: "Turbocharger", category: "Repair" },
  { name: "Head gasket", category: "Repair" },
  { name: "Engine rebuild", category: "Repair" },
  { name: "Transmission rebuild", category: "Repair" },
  { name: "Diagnostic", category: "Repair" },
  { name: "Electrical diagnosis", category: "Repair" },

  // Performance
  { name: "Exhaust installation", category: "Performance" },
  { name: "Cat-back exhaust", category: "Performance" },
  { name: "Downpipe install", category: "Performance" },
  { name: "Header install", category: "Performance" },
  { name: "Intake install", category: "Performance" },
  { name: "ECU tune / flash", category: "Performance" },
  { name: "Dyno tuning", category: "Performance" },
  { name: "Turbo install", category: "Performance" },
  { name: "Supercharger install", category: "Performance" },
  { name: "Intercooler install", category: "Performance" },
  { name: "Fuel system upgrade", category: "Performance" },

  // Suspension and chassis
  { name: "Suspension", category: "Suspension & Chassis" },
  { name: "Coilover install", category: "Suspension & Chassis" },
  { name: "Lowering springs", category: "Suspension & Chassis" },
  { name: "Air suspension install", category: "Suspension & Chassis" },
  { name: "Sway bar install", category: "Suspension & Chassis" },
  { name: "Bushing replacement", category: "Suspension & Chassis" },
  { name: "Roll bar / cage", category: "Suspension & Chassis" },

  // Appearance and protection
  { name: "Full car wrap", category: "Appearance & Protection" },
  { name: "Partial wrap", category: "Appearance & Protection" },
  { name: "Paint protection film (PPF)", category: "Appearance & Protection" },
  { name: "Ceramic coating", category: "Appearance & Protection" },
  { name: "Window tint", category: "Appearance & Protection" },
  { name: "Paint correction", category: "Appearance & Protection" },
  { name: "Detailing", category: "Appearance & Protection" },
  { name: "Vinyl decals / livery", category: "Appearance & Protection" },
  { name: "Headlight restoration", category: "Appearance & Protection" },
  { name: "Body work / dent repair", category: "Appearance & Protection" },
  { name: "Respray", category: "Appearance & Protection" },

  // Interior and electronics
  { name: "Audio system install", category: "Interior & Electronics" },
  { name: "Seat install", category: "Interior & Electronics" },
  { name: "Upholstery / retrim", category: "Interior & Electronics" },
  { name: "Dash cam install", category: "Interior & Electronics" },
  { name: "Alarm / immobiliser", category: "Interior & Electronics" },

  { name: "Other", category: "Other" },
];

const BASE_MAKES: MakeSpec[] = [
  {
    name: "Acura",
    models: [
      { name: "Integra", generations: [
        { code: "DC2", from: 1994, to: 2001 },
        { code: "DE5", from: 2023, to: null, trims: ["Base", "A-Spec", "Type S"] },
      ]},
      { name: "TLX", generations: [
        { code: "UB1", from: 2015, to: 2020 },
        { code: "UB5", from: 2021, to: null, trims: ["Base", "A-Spec", "Type S"] },
      ]},
      { name: "NSX", generations: [
        { code: "NA1", from: 1991, to: 2005 },
        { code: "NC1", from: 2017, to: 2022 },
      ]},
      { name: "MDX", generations: [
        { code: "YD3", from: 2014, to: 2020 },
        { code: "YE1", from: 2022, to: null },
      ]},
    ],
  },
  {
    name: "Audi",
    models: [
      { name: "A4", generations: [
        { code: "B8", from: 2009, to: 2012, platform: "B8" },
        { code: "B8.5", from: 2013, to: 2016, platform: "B8" },
        { code: "B9", from: 2017, to: 2023, platform: "B9" },
      ]},
      { name: "S4", generations: [
        { code: "B8", from: 2010, to: 2012, platform: "B8" },
        { code: "B8.5", from: 2013, to: 2016, platform: "B8" },
        { code: "B9", from: 2018, to: null, platform: "B9" },
      ]},
      { name: "A3", generations: [
        { code: "8V", from: 2015, to: 2020 },
        { code: "8Y", from: 2022, to: null },
      ]},
      { name: "RS3", generations: [
        { code: "8V", from: 2017, to: 2020 },
        { code: "8Y", from: 2022, to: null },
      ]},
      { name: "Q5", generations: [
        { code: "8R", from: 2009, to: 2017 },
        { code: "FY", from: 2018, to: null },
      ]},
      { name: "R8", generations: [
        { code: "Type 42", from: 2008, to: 2015 },
        { code: "Type 4S", from: 2017, to: 2023 },
      ]},
    ],
  },
  {
    name: "BMW",
    models: [
      { name: "3 Series", generations: [
        { code: "E90", from: 2006, to: 2011, platform: "E9x" },
        { code: "F30", from: 2012, to: 2018, platform: "F3x" },
        { code: "G20", from: 2019, to: 2022, platform: "G2x" },
        { code: "G20 LCI", from: 2023, to: null, platform: "G2x" },
      ]},
      { name: "M3", generations: [
        { code: "E90", from: 2008, to: 2013, platform: "E9x" },
        { code: "F80", from: 2015, to: 2018, platform: "F8x", trims: ["Base", "Competition", "CS"] },
        { code: "G80", from: 2021, to: null, platform: "G8x", trims: ["Base", "Competition", "Competition xDrive", "CS"] },
      ]},
      { name: "M2", generations: [
        { code: "F87", from: 2016, to: 2021, platform: "F8x", trims: ["Base", "Competition", "CS"] },
        { code: "G87", from: 2023, to: null, platform: "G8x" },
      ]},
      { name: "5 Series", generations: [
        { code: "E60", from: 2004, to: 2010 },
        { code: "F10", from: 2011, to: 2016 },
        { code: "G30", from: 2017, to: 2023 },
      ]},
      { name: "X5", generations: [
        { code: "E70", from: 2007, to: 2013 },
        { code: "F15", from: 2014, to: 2018 },
        { code: "G05", from: 2019, to: null },
      ]},
      { name: "M5", generations: [
        { code: "E60", from: 2006, to: 2010 },
        { code: "F10", from: 2013, to: 2016 },
        { code: "F90", from: 2018, to: 2023 },
      ]},
    ],
  },
  {
    name: "Cadillac",
    models: [
      { name: "CTS-V", generations: [
        { code: "2nd Gen", from: 2009, to: 2015 },
        { code: "3rd Gen", from: 2016, to: 2019 },
      ]},
      { name: "CT4", generations: [
        { code: "1st Gen", from: 2020, to: null, trims: ["Luxury", "Premium Luxury", "V-Series", "Blackwing"] },
      ]},
      { name: "CT5", generations: [
        { code: "1st Gen", from: 2020, to: null, trims: ["Luxury", "Premium Luxury", "V-Series", "Blackwing"] },
      ]},
      { name: "Escalade", generations: [
        { code: "GMT K2XX", from: 2015, to: 2020 },
        { code: "T1XX", from: 2021, to: null },
      ]},
    ],
  },
  {
    name: "Chevrolet",
    models: [
      { name: "Corvette", generations: [
        { code: "C6", from: 2005, to: 2013 },
        { code: "C7", from: 2014, to: 2019, trims: ["Stingray", "Grand Sport", "Z06", "ZR1"] },
        { code: "C8", from: 2020, to: null, trims: ["Stingray", "Z06", "E-Ray"] },
      ]},
      { name: "Camaro", generations: [
        { code: "5th Gen", from: 2010, to: 2015 },
        { code: "6th Gen", from: 2016, to: 2024, platform: "Alpha", trims: ["LT", "SS", "ZL1"] },
      ]},
      { name: "Silverado 1500", generations: [
        { code: "GMT K2XX", from: 2014, to: 2018 },
        { code: "T1XX", from: 2019, to: null },
      ]},
      { name: "Tahoe", generations: [
        { code: "GMT K2XX", from: 2015, to: 2020 },
        { code: "T1XX", from: 2021, to: null },
      ]},
    ],
  },
  {
    name: "Chrysler",
    models: [
      { name: "300", generations: [
        { code: "LX", from: 2005, to: 2010 },
        { code: "LD", from: 2011, to: 2023 },
      ]},
      { name: "Pacifica", generations: [{ code: "RU", from: 2017, to: null }] },
    ],
  },
  {
    name: "Dodge",
    models: [
      { name: "Charger", generations: [
        { code: "LX", from: 2006, to: 2010 },
        { code: "LD", from: 2011, to: 2023, trims: ["SXT", "R/T", "Scat Pack", "Hellcat"] },
      ]},
      { name: "Challenger", generations: [
        { code: "LC", from: 2008, to: 2023, trims: ["SXT", "R/T", "Scat Pack", "Hellcat", "Demon"] },
      ]},
      { name: "Durango", generations: [{ code: "WD", from: 2011, to: null }] },
    ],
  },
  {
    name: "Ferrari",
    models: [
      { name: "488", generations: [{ code: "F142M", from: 2016, to: 2019 }] },
      { name: "F8 Tributo", generations: [{ code: "F142MFL", from: 2020, to: 2023 }] },
      { name: "Portofino", generations: [{ code: "F164", from: 2018, to: 2023 }] },
    ],
  },
  {
    name: "Ford",
    models: [
      { name: "Mustang", generations: [
        { code: "S197", from: 2005, to: 2014 },
        { code: "S550", from: 2015, to: 2017, platform: "S550", trims: ["EcoBoost", "GT", "Shelby GT350"] },
        { code: "S550.2", from: 2018, to: 2023, platform: "S550", trims: ["EcoBoost", "GT", "Mach 1", "Shelby GT500"] },
        { code: "S650", from: 2024, to: null, trims: ["EcoBoost", "GT", "Dark Horse"] },
      ]},
      { name: "F-150", generations: [
        { code: "P552", from: 2015, to: 2020 },
        { code: "P702", from: 2021, to: null, trims: ["XL", "XLT", "Lariat", "Raptor"] },
      ]},
      { name: "Focus", generations: [
        { code: "Mk3", from: 2012, to: 2018, trims: ["S", "SE", "ST", "RS"] },
      ]},
      { name: "Bronco", generations: [{ code: "U725", from: 2021, to: null }] },
      { name: "Explorer", generations: [
        { code: "U502", from: 2011, to: 2019 },
        { code: "U625", from: 2020, to: null },
      ]},
    ],
  },
  {
    name: "Genesis",
    models: [
      { name: "G70", generations: [{ code: "IK", from: 2019, to: null }] },
      { name: "G80", generations: [{ code: "RG3", from: 2021, to: null }] },
      { name: "GV70", generations: [{ code: "JK", from: 2022, to: null }] },
    ],
  },
  {
    name: "Honda",
    models: [
      { name: "Civic", generations: [
        { code: "FA/FG", from: 2006, to: 2011 },
        { code: "FB/FG", from: 2012, to: 2015 },
        { code: "FC/FK", from: 2016, to: 2021, trims: ["LX", "EX", "Si", "Type R"] },
        { code: "FE/FL", from: 2022, to: null, trims: ["LX", "Sport", "EX", "Si", "Type R"] },
      ]},
      { name: "Accord", generations: [
        { code: "CU/CS", from: 2008, to: 2012 },
        { code: "CR", from: 2013, to: 2017 },
        { code: "CV", from: 2018, to: 2022 },
      ]},
      { name: "CR-V", generations: [
        { code: "RM", from: 2012, to: 2016 },
        { code: "RW", from: 2017, to: 2022 },
      ]},
      { name: "S2000", generations: [{ code: "AP1/AP2", from: 2000, to: 2009 }] },
    ],
  },
  {
    name: "Hyundai",
    models: [
      { name: "Elantra", generations: [
        { code: "AD", from: 2017, to: 2020 },
        { code: "CN7", from: 2021, to: null, trims: ["SE", "SEL", "N Line", "N"] },
      ]},
      { name: "Sonata", generations: [
        { code: "LF", from: 2015, to: 2019 },
        { code: "DN8", from: 2020, to: null },
      ]},
      { name: "Veloster", generations: [
        { code: "JS", from: 2019, to: 2022, trims: ["Base", "Turbo", "N"] },
      ]},
      { name: "Tucson", generations: [
        { code: "TL", from: 2016, to: 2021 },
        { code: "NX4", from: 2022, to: null },
      ]},
    ],
  },
  {
    name: "Infiniti",
    models: [
      { name: "G37", generations: [{ code: "V36", from: 2008, to: 2013 }] },
      { name: "Q50", generations: [{ code: "V37", from: 2014, to: null, trims: ["Pure", "Luxe", "Red Sport 400"] }] },
      { name: "QX60", generations: [
        { code: "L50", from: 2014, to: 2020 },
        { code: "L51", from: 2022, to: null },
      ]},
    ],
  },
  {
    name: "Jaguar",
    models: [
      { name: "F-Type", generations: [{ code: "X152", from: 2014, to: 2024 }] },
      { name: "XE", generations: [{ code: "X760", from: 2017, to: 2020 }] },
      { name: "F-Pace", generations: [{ code: "X761", from: 2017, to: null }] },
    ],
  },
  {
    name: "Jeep",
    models: [
      { name: "Wrangler", generations: [
        { code: "JK", from: 2007, to: 2017 },
        { code: "JL", from: 2018, to: null, trims: ["Sport", "Sahara", "Rubicon", "392"] },
      ]},
      { name: "Grand Cherokee", generations: [
        { code: "WK2", from: 2011, to: 2021, trims: ["Laredo", "Limited", "Trailhawk", "SRT", "Trackhawk"] },
        { code: "WL", from: 2022, to: null },
      ]},
      { name: "Gladiator", generations: [{ code: "JT", from: 2020, to: null }] },
    ],
  },
  {
    name: "Kia",
    models: [
      { name: "Stinger", generations: [{ code: "CK", from: 2018, to: 2023, trims: ["GT-Line", "GT1", "GT2"] }] },
      { name: "Telluride", generations: [{ code: "ON", from: 2020, to: null }] },
      { name: "Forte", generations: [
        { code: "YD", from: 2014, to: 2018 },
        { code: "BD", from: 2019, to: null, trims: ["FE", "GT-Line", "GT"] },
      ]},
      { name: "K5", generations: [{ code: "DL3", from: 2021, to: null }] },
    ],
  },
  {
    name: "Lamborghini",
    models: [
      { name: "Huracan", generations: [{ code: "LB724", from: 2015, to: 2024 }] },
      { name: "Urus", generations: [{ code: "LB736", from: 2019, to: null }] },
    ],
  },
  {
    name: "Land Rover",
    models: [
      { name: "Range Rover Sport", generations: [
        { code: "L494", from: 2014, to: 2022 },
        { code: "L461", from: 2023, to: null },
      ]},
      { name: "Defender", generations: [{ code: "L663", from: 2020, to: null }] },
      { name: "Discovery", generations: [{ code: "L462", from: 2017, to: null }] },
    ],
  },
  {
    name: "Lexus",
    models: [
      { name: "IS", generations: [
        { code: "XE20", from: 2006, to: 2013 },
        { code: "XE30", from: 2014, to: 2020, platform: "XE30" },
        { code: "XE30 Facelift", from: 2021, to: null, platform: "XE30", trims: ["IS 300", "IS 350 F Sport", "IS 500"] },
      ]},
      { name: "RX", generations: [
        { code: "AL10", from: 2010, to: 2015 },
        { code: "AL20", from: 2016, to: 2022 },
        { code: "AL30", from: 2023, to: null },
      ]},
      { name: "GS", generations: [{ code: "L10", from: 2013, to: 2020, trims: ["GS 350", "GS F"] }] },
      { name: "RC", generations: [{ code: "XC10", from: 2015, to: 2024, trims: ["RC 300", "RC 350", "RC F"] }] },
    ],
  },
  {
    name: "Maserati",
    models: [
      { name: "Ghibli", generations: [{ code: "M157", from: 2014, to: 2023 }] },
      { name: "Levante", generations: [{ code: "M161", from: 2017, to: 2023 }] },
    ],
  },
  {
    name: "Mazda",
    models: [
      { name: "MX-5 Miata", generations: [
        { code: "NC", from: 2006, to: 2015 },
        { code: "ND", from: 2016, to: 2018, platform: "ND" },
        { code: "ND2", from: 2019, to: null, platform: "ND" },
      ]},
      { name: "Mazda3", generations: [
        { code: "BM", from: 2014, to: 2018 },
        { code: "BP", from: 2019, to: null, trims: ["Base", "Select", "Preferred", "Turbo"] },
      ]},
      { name: "CX-5", generations: [
        { code: "KE", from: 2013, to: 2016 },
        { code: "KF", from: 2017, to: null },
      ]},
      { name: "RX-8", generations: [{ code: "SE3P", from: 2004, to: 2011 }] },
    ],
  },
  {
    name: "McLaren",
    models: [
      { name: "570S", generations: [{ code: "P13", from: 2016, to: 2021 }] },
      { name: "720S", generations: [{ code: "P14", from: 2018, to: 2022 }] },
    ],
  },
  {
    name: "Mercedes-Benz",
    models: [
      {
        name: "E-Class",
        generations: [
          { code: "W211", from: 2003, to: 2009 },
          // The facelift split the user asked for: both halves aggregate as W212.
          { code: "W212", from: 2010, to: 2013, platform: "W212" },
          { code: "W212R", from: 2014, to: 2016, platform: "W212" },
          { code: "W213", from: 2017, to: 2020, platform: "W213" },
          { code: "W213R", from: 2021, to: 2023, platform: "W213" },
        ],
      },
      { name: "C-Class", generations: [
        { code: "W204", from: 2008, to: 2014 },
        { code: "W205", from: 2015, to: 2018, platform: "W205" },
        { code: "W205R", from: 2019, to: 2021, platform: "W205" },
        { code: "W206", from: 2022, to: null },
      ]},
      { name: "S-Class", generations: [
        { code: "W221", from: 2007, to: 2013 },
        { code: "W222", from: 2014, to: 2020 },
        { code: "W223", from: 2021, to: null },
      ]},
      { name: "GLE", generations: [
        { code: "W166", from: 2016, to: 2019 },
        { code: "W167", from: 2020, to: null },
      ]},
      { name: "C63 AMG", generations: [
        { code: "W204", from: 2008, to: 2014 },
        { code: "W205", from: 2015, to: 2021, trims: ["C63", "C63 S"] },
      ]},
    ],
  },
  {
    name: "MINI",
    models: [
      { name: "Cooper", generations: [
        { code: "R56", from: 2007, to: 2013, trims: ["Cooper", "Cooper S", "JCW"] },
        { code: "F56", from: 2014, to: 2024, trims: ["Cooper", "Cooper S", "JCW"] },
      ]},
      { name: "Countryman", generations: [
        { code: "R60", from: 2011, to: 2016 },
        { code: "F60", from: 2017, to: 2023 },
      ]},
    ],
  },
  {
    name: "Mitsubishi",
    models: [
      { name: "Lancer Evolution", generations: [
        { code: "CT9A (Evo IX)", from: 2003, to: 2007 },
        { code: "CZ4A (Evo X)", from: 2008, to: 2015, trims: ["GSR", "MR"] },
      ]},
      { name: "Outlander", generations: [
        { code: "GF", from: 2014, to: 2021 },
        { code: "GN", from: 2022, to: null },
      ]},
    ],
  },
  {
    name: "Nissan",
    models: [
      { name: "370Z", generations: [{ code: "Z34", from: 2009, to: 2020, trims: ["Base", "Sport", "NISMO"] }] },
      { name: "Z", generations: [{ code: "RZ34", from: 2023, to: null, trims: ["Sport", "Performance", "NISMO"] }] },
      { name: "GT-R", generations: [{ code: "R35", from: 2009, to: null, trims: ["Premium", "Track Edition", "NISMO"] }] },
      { name: "Altima", generations: [
        { code: "L33", from: 2013, to: 2018 },
        { code: "L34", from: 2019, to: null },
      ]},
      { name: "Rogue", generations: [
        { code: "T32", from: 2014, to: 2020 },
        { code: "T33", from: 2021, to: null },
      ]},
    ],
  },
  {
    name: "Porsche",
    models: [
      { name: "911", generations: [
        { code: "997.1", from: 2005, to: 2008, platform: "997" },
        { code: "997.2", from: 2009, to: 2011, platform: "997" },
        { code: "991.1", from: 2012, to: 2016, platform: "991" },
        { code: "991.2", from: 2017, to: 2019, platform: "991" },
        { code: "992", from: 2020, to: null, trims: ["Carrera", "Carrera S", "Turbo", "GT3"] },
      ]},
      { name: "Cayman", generations: [
        { code: "987", from: 2006, to: 2012 },
        { code: "981", from: 2013, to: 2016 },
        { code: "982", from: 2017, to: null, trims: ["Base", "S", "GTS 4.0", "GT4"] },
      ]},
      { name: "Macan", generations: [{ code: "95B", from: 2015, to: null, trims: ["Base", "S", "GTS", "Turbo"] }] },
      { name: "Cayenne", generations: [
        { code: "958", from: 2011, to: 2018 },
        { code: "9Y0", from: 2019, to: null },
      ]},
    ],
  },
  {
    name: "Ram",
    models: [
      { name: "1500", generations: [
        { code: "DS", from: 2009, to: 2018 },
        { code: "DT", from: 2019, to: null, trims: ["Tradesman", "Big Horn", "Laramie", "TRX"] },
      ]},
      { name: "2500", generations: [{ code: "DJ", from: 2019, to: null }] },
    ],
  },
  {
    name: "Subaru",
    models: [
      { name: "WRX", generations: [
        { code: "GR/GV", from: 2008, to: 2014 },
        { code: "VA", from: 2015, to: 2021, trims: ["Base", "Premium", "Limited", "STI"] },
        { code: "VB", from: 2022, to: null, trims: ["Base", "Premium", "Limited", "GT"] },
      ]},
      { name: "BRZ", generations: [
        { code: "ZC6", from: 2013, to: 2020 },
        { code: "ZD8", from: 2022, to: null, trims: ["Premium", "Limited", "tS"] },
      ]},
      { name: "Outback", generations: [
        { code: "BS", from: 2015, to: 2019 },
        { code: "BT", from: 2020, to: null },
      ]},
      { name: "Forester", generations: [
        { code: "SJ", from: 2014, to: 2018 },
        { code: "SK", from: 2019, to: null },
      ]},
    ],
  },
  {
    name: "Tesla",
    models: [
      { name: "Model 3", generations: [
        { code: "Model 3", from: 2017, to: 2023, platform: "Model 3" },
        { code: "Model 3 Highland", from: 2024, to: null, platform: "Model 3" },
      ]},
      { name: "Model Y", generations: [{ code: "Model Y", from: 2020, to: null, trims: ["Long Range", "Performance"] }] },
      { name: "Model S", generations: [
        { code: "Model S", from: 2012, to: 2020, platform: "Model S" },
        { code: "Model S Plaid", from: 2021, to: null, platform: "Model S" },
      ]},
    ],
  },
  {
    name: "Toyota",
    models: [
      { name: "Supra", generations: [
        { code: "A80", from: 1993, to: 1998 },
        { code: "A90", from: 2020, to: null, trims: ["2.0", "3.0", "3.0 Premium"] },
      ]},
      { name: "GR86", generations: [{ code: "ZN8", from: 2022, to: null }] },
      { name: "Camry", generations: [
        { code: "XV50", from: 2012, to: 2017 },
        { code: "XV70", from: 2018, to: 2024, trims: ["LE", "SE", "XSE", "TRD"] },
      ]},
      { name: "Corolla", generations: [
        { code: "E170", from: 2014, to: 2019 },
        { code: "E210", from: 2020, to: null, trims: ["LE", "SE", "XSE", "GR Corolla"] },
      ]},
      { name: "Tacoma", generations: [
        { code: "N300", from: 2016, to: 2023 },
        { code: "N400", from: 2024, to: null },
      ]},
      { name: "4Runner", generations: [{ code: "N280", from: 2010, to: 2024 }] },
    ],
  },
  {
    name: "Volkswagen",
    models: [
      { name: "Golf GTI", generations: [
        { code: "Mk6", from: 2010, to: 2014 },
        { code: "Mk7", from: 2015, to: 2017, platform: "Mk7" },
        { code: "Mk7.5", from: 2018, to: 2021, platform: "Mk7" },
        { code: "Mk8", from: 2022, to: null, trims: ["S", "SE", "Autobahn"] },
      ]},
      { name: "Golf R", generations: [
        { code: "Mk7", from: 2015, to: 2019, platform: "Mk7" },
        { code: "Mk8", from: 2022, to: null },
      ]},
      { name: "Jetta", generations: [
        { code: "Mk6", from: 2011, to: 2018 },
        { code: "Mk7", from: 2019, to: null, trims: ["S", "SE", "SEL", "GLI"] },
      ]},
      { name: "Tiguan", generations: [
        { code: "Mk1", from: 2009, to: 2017 },
        { code: "Mk2", from: 2018, to: null },
      ]},
    ],
  },
  {
    name: "Volvo",
    models: [
      { name: "S60", generations: [
        { code: "P3", from: 2011, to: 2018 },
        { code: "SPA", from: 2019, to: null, trims: ["Momentum", "R-Design", "Polestar"] },
      ]},
      { name: "XC90", generations: [
        { code: "P2", from: 2003, to: 2014 },
        { code: "SPA", from: 2016, to: null },
      ]},
      { name: "XC60", generations: [
        { code: "P3", from: 2010, to: 2017 },
        { code: "SPA", from: 2018, to: null },
      ]},
    ],
  },
];

/*
  The list the seed consumes. Add a marque-specific file, import it, and pass it
  here — no other code changes.
*/
export const MAKES: MakeSpec[] = mergeMakes(BASE_MAKES, MAJOR_MAKES);
