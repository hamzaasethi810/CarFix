import type { MakeSpec } from "./types";

/*
  Deep coverage for the makes people report on most: full model lines from
  2000 to the present, with real chassis codes and facelift splits.

  These entries are MERGED into the base list in vehicles.ts — a make defined
  in both places ends up with the union of its models, so this file can grow
  without touching the other.

  Same rules as the base file: generations must not overlap within a model,
  and facelift halves share a `platform` so they aggregate together.
*/

export const MAJOR_MAKES: MakeSpec[] = [
  {
    name: "BMW",
    models: [
      { name: "1 Series", generations: [
        { code: "E87", from: 2004, to: 2011 },
        { code: "F20", from: 2012, to: 2019 },
        { code: "F40", from: 2020, to: null },
      ]},
      { name: "2 Series", generations: [
        { code: "F22", from: 2014, to: 2021 },
        { code: "G42", from: 2022, to: null },
      ]},
      { name: "4 Series", generations: [
        { code: "F32", from: 2014, to: 2020 },
        { code: "G22", from: 2021, to: null },
      ]},
      { name: "M4", generations: [
        { code: "F82", from: 2015, to: 2020, platform: "F8x" },
        { code: "G82", from: 2021, to: null, platform: "G8x", trims: ["Base", "Competition", "CSL"] },
      ]},
      { name: "6 Series", generations: [
        { code: "E63", from: 2004, to: 2010 },
        { code: "F12", from: 2012, to: 2018 },
      ]},
      { name: "7 Series", generations: [
        { code: "E65", from: 2002, to: 2008 },
        { code: "F01", from: 2009, to: 2015 },
        { code: "G11", from: 2016, to: 2022 },
        { code: "G70", from: 2023, to: null },
      ]},
      { name: "8 Series", generations: [{ code: "G15", from: 2019, to: null }] },
      { name: "X1", generations: [
        { code: "E84", from: 2013, to: 2015 },
        { code: "F48", from: 2016, to: 2022 },
        { code: "U11", from: 2023, to: null },
      ]},
      { name: "X3", generations: [
        { code: "E83", from: 2004, to: 2010 },
        { code: "F25", from: 2011, to: 2017 },
        { code: "G01", from: 2018, to: 2024 },
      ]},
      { name: "X7", generations: [{ code: "G07", from: 2019, to: null }] },
      { name: "Z4", generations: [
        { code: "E85", from: 2003, to: 2008 },
        { code: "E89", from: 2009, to: 2016 },
        { code: "G29", from: 2019, to: null },
      ]},
    ],
  },
  {
    name: "Mercedes-Benz",
    models: [
      { name: "CLA", generations: [
        { code: "C117", from: 2014, to: 2019 },
        { code: "C118", from: 2020, to: null },
      ]},
      { name: "GLA", generations: [
        { code: "X156", from: 2015, to: 2020 },
        { code: "H247", from: 2021, to: null },
      ]},
      { name: "GLC", generations: [
        { code: "X253", from: 2016, to: 2022 },
        { code: "X254", from: 2023, to: null },
      ]},
      { name: "GLS", generations: [
        { code: "X166", from: 2017, to: 2019 },
        { code: "X167", from: 2020, to: null },
      ]},
      { name: "SL", generations: [
        { code: "R230", from: 2002, to: 2011 },
        { code: "R231", from: 2013, to: 2020 },
        { code: "R232", from: 2022, to: null },
      ]},
      { name: "Sprinter", generations: [
        { code: "NCV3", from: 2007, to: 2018 },
        { code: "VS30", from: 2019, to: null },
      ]},
    ],
  },
  {
    name: "Toyota",
    models: [
      { name: "RAV4", generations: [
        { code: "XA20", from: 2001, to: 2005 },
        { code: "XA30", from: 2006, to: 2012 },
        { code: "XA40", from: 2013, to: 2018 },
        { code: "XA50", from: 2019, to: null },
      ]},
      { name: "Highlander", generations: [
        { code: "XU20", from: 2001, to: 2007 },
        { code: "XU40", from: 2008, to: 2013 },
        { code: "XU50", from: 2014, to: 2019 },
        { code: "XU70", from: 2020, to: null },
      ]},
      { name: "Tundra", generations: [
        { code: "XK30", from: 2000, to: 2006 },
        { code: "XK50", from: 2007, to: 2021 },
        { code: "XK70", from: 2022, to: null },
      ]},
      { name: "Prius", generations: [
        { code: "XW20", from: 2004, to: 2009 },
        { code: "XW30", from: 2010, to: 2015 },
        { code: "XW50", from: 2016, to: 2022 },
        { code: "XW60", from: 2023, to: null },
      ]},
      { name: "Sienna", generations: [
        { code: "XL20", from: 2004, to: 2010 },
        { code: "XL30", from: 2011, to: 2020 },
        { code: "XL40", from: 2021, to: null },
      ]},
      { name: "Sequoia", generations: [
        { code: "XK30", from: 2001, to: 2007 },
        { code: "XK60", from: 2008, to: 2022 },
        { code: "XK80", from: 2023, to: null },
      ]},
      { name: "Avalon", generations: [
        { code: "XX30", from: 2005, to: 2012 },
        { code: "XX40", from: 2013, to: 2018 },
        { code: "XX50", from: 2019, to: 2022 },
      ]},
    ],
  },
  {
    name: "Honda",
    models: [
      { name: "Pilot", generations: [
        { code: "YF1", from: 2003, to: 2008 },
        { code: "YF3", from: 2009, to: 2015 },
        { code: "YF6", from: 2016, to: 2022 },
        { code: "YG", from: 2023, to: null },
      ]},
      { name: "Odyssey", generations: [
        { code: "RL3", from: 2005, to: 2010 },
        { code: "RL5", from: 2011, to: 2017 },
        { code: "RL6", from: 2018, to: null },
      ]},
      { name: "Fit", generations: [
        { code: "GD", from: 2007, to: 2008 },
        { code: "GE", from: 2009, to: 2013 },
        { code: "GK", from: 2015, to: 2020 },
      ]},
      { name: "HR-V", generations: [
        { code: "RU", from: 2016, to: 2022 },
        { code: "RV", from: 2023, to: null },
      ]},
      { name: "Ridgeline", generations: [
        { code: "YK1", from: 2006, to: 2014 },
        { code: "YK2", from: 2017, to: null },
      ]},
      { name: "Passport", generations: [{ code: "YF7", from: 2019, to: null }] },
    ],
  },
  {
    name: "Lexus",
    models: [
      { name: "ES", generations: [
        { code: "XV30", from: 2002, to: 2006 },
        { code: "XV40", from: 2007, to: 2012 },
        { code: "XV60", from: 2013, to: 2018 },
        { code: "XZ10", from: 2019, to: null },
      ]},
      { name: "LS", generations: [
        { code: "XF30", from: 2001, to: 2006 },
        { code: "XF40", from: 2007, to: 2017 },
        { code: "XF50", from: 2018, to: null },
      ]},
      { name: "NX", generations: [
        { code: "AZ10", from: 2015, to: 2021 },
        { code: "AZ20", from: 2022, to: null },
      ]},
      { name: "GX", generations: [
        { code: "J120", from: 2003, to: 2009 },
        { code: "J150", from: 2010, to: 2023 },
        { code: "J250", from: 2024, to: null },
      ]},
      { name: "LX", generations: [
        { code: "J100", from: 2000, to: 2007 },
        { code: "J200", from: 2008, to: 2021 },
        { code: "J310", from: 2022, to: null },
      ]},
      { name: "LC", generations: [{ code: "Z100", from: 2018, to: null }] },
    ],
  },
  {
    name: "Audi",
    models: [
      { name: "A3", generations: [
        { code: "8P", from: 2006, to: 2013 },
      ]},
      { name: "A5", generations: [
        { code: "8T", from: 2008, to: 2017 },
        { code: "F5", from: 2018, to: null },
      ]},
      { name: "A6", generations: [
        { code: "C6", from: 2005, to: 2011 },
        { code: "C7", from: 2012, to: 2018 },
        { code: "C8", from: 2019, to: null },
      ]},
      { name: "Q3", generations: [
        { code: "8U", from: 2015, to: 2018 },
        { code: "F3", from: 2019, to: null },
      ]},
      { name: "Q7", generations: [
        { code: "4L", from: 2007, to: 2015 },
        { code: "4M", from: 2017, to: null },
      ]},
      { name: "TT", generations: [
        { code: "8N", from: 2000, to: 2006 },
        { code: "8J", from: 2008, to: 2015 },
        { code: "8S", from: 2016, to: 2023 },
      ]},
    ],
  },
  {
    name: "Volkswagen",
    models: [
      { name: "Passat", generations: [
        { code: "B5.5", from: 2001, to: 2005 },
        { code: "B6", from: 2006, to: 2010 },
        { code: "B7", from: 2012, to: 2015 },
        { code: "B8", from: 2016, to: 2022 },
      ]},
      { name: "Atlas", generations: [{ code: "CA1", from: 2018, to: null }] },
      { name: "Beetle", generations: [
        { code: "A4", from: 2000, to: 2010 },
        { code: "A5", from: 2012, to: 2019 },
      ]},
      { name: "ID.4", generations: [{ code: "MEB", from: 2021, to: null }] },
    ],
  },
  {
    name: "Subaru",
    models: [
      { name: "Impreza", generations: [
        { code: "GD", from: 2002, to: 2007 },
        { code: "GE/GH", from: 2008, to: 2011 },
        { code: "GJ/GP", from: 2012, to: 2016 },
        { code: "GK/GT", from: 2017, to: 2023 },
      ]},
      { name: "Legacy", generations: [
        { code: "BL/BP", from: 2005, to: 2009 },
        { code: "BM/BR", from: 2010, to: 2014 },
        { code: "BN", from: 2015, to: 2019 },
        { code: "BW", from: 2020, to: null },
      ]},
      { name: "Crosstrek", generations: [
        { code: "GP", from: 2013, to: 2017 },
        { code: "GT", from: 2018, to: 2023 },
        { code: "GU", from: 2024, to: null },
      ]},
      { name: "Ascent", generations: [{ code: "WM", from: 2019, to: null }] },
    ],
  },
  {
    name: "Nissan",
    models: [
      { name: "350Z", generations: [{ code: "Z33", from: 2003, to: 2009 }] },
      { name: "Sentra", generations: [
        { code: "B16", from: 2007, to: 2012 },
        { code: "B17", from: 2013, to: 2019 },
        { code: "B18", from: 2020, to: null },
      ]},
      { name: "Maxima", generations: [
        { code: "A34", from: 2004, to: 2008 },
        { code: "A35", from: 2009, to: 2014 },
        { code: "A36", from: 2016, to: 2023 },
      ]},
      { name: "Pathfinder", generations: [
        { code: "R51", from: 2005, to: 2012 },
        { code: "R52", from: 2013, to: 2020 },
        { code: "R53", from: 2022, to: null },
      ]},
      { name: "Frontier", generations: [
        { code: "D40", from: 2005, to: 2021 },
        { code: "D41", from: 2022, to: null },
      ]},
    ],
  },
  {
    name: "Mazda",
    models: [
      { name: "Mazda6", generations: [
        { code: "GG", from: 2003, to: 2008 },
        { code: "GH", from: 2009, to: 2013 },
        { code: "GJ", from: 2014, to: 2021 },
      ]},
      { name: "CX-9", generations: [
        { code: "TB", from: 2007, to: 2015 },
        { code: "TC", from: 2016, to: 2023 },
      ]},
      { name: "CX-30", generations: [{ code: "DM", from: 2020, to: null }] },
      { name: "CX-50", generations: [{ code: "KF", from: 2023, to: null }] },
    ],
  },
  {
    name: "Ford",
    models: [
      { name: "Escape", generations: [
        { code: "ZB", from: 2001, to: 2007 },
        { code: "ZD", from: 2008, to: 2012 },
        { code: "C520", from: 2013, to: 2019 },
        { code: "CX482", from: 2020, to: null },
      ]},
      { name: "Edge", generations: [
        { code: "U387", from: 2007, to: 2014 },
        { code: "CD539", from: 2015, to: 2024 },
      ]},
      { name: "Fusion", generations: [
        { code: "CD338", from: 2006, to: 2012 },
        { code: "CD4", from: 2013, to: 2020 },
      ]},
      { name: "Ranger", generations: [
        { code: "T6", from: 2019, to: 2023 },
        { code: "P703", from: 2024, to: null },
      ]},
      { name: "Maverick", generations: [{ code: "P758", from: 2022, to: null }] },
    ],
  },
  {
    name: "Chevrolet",
    models: [
      { name: "Malibu", generations: [
        { code: "Epsilon", from: 2004, to: 2012 },
        { code: "Epsilon II", from: 2013, to: 2015 },
        { code: "E2XX", from: 2016, to: 2024 },
      ]},
      { name: "Equinox", generations: [
        { code: "Theta", from: 2005, to: 2009 },
        { code: "Theta II", from: 2010, to: 2017 },
        { code: "D2XX", from: 2018, to: 2024 },
      ]},
      { name: "Traverse", generations: [
        { code: "Lambda", from: 2009, to: 2017 },
        { code: "C1XX", from: 2018, to: 2023 },
      ]},
      { name: "Colorado", generations: [
        { code: "GMT355", from: 2004, to: 2012 },
        { code: "GMT31XX", from: 2015, to: 2022 },
        { code: "31XX-2", from: 2023, to: null },
      ]},
      { name: "Suburban", generations: [
        { code: "GMT800", from: 2000, to: 2006 },
        { code: "GMT900", from: 2007, to: 2014 },
        { code: "K2XX", from: 2015, to: 2020 },
        { code: "T1XX", from: 2021, to: null },
      ]},
    ],
  },
  {
    name: "Hyundai",
    models: [
      { name: "Santa Fe", generations: [
        { code: "SM", from: 2001, to: 2006 },
        { code: "CM", from: 2007, to: 2012 },
        { code: "DM", from: 2013, to: 2018 },
        { code: "TM", from: 2019, to: 2023 },
        { code: "MX5", from: 2024, to: null },
      ]},
      { name: "Palisade", generations: [{ code: "LX2", from: 2020, to: null }] },
      { name: "Kona", generations: [
        { code: "OS", from: 2018, to: 2023 },
        { code: "SX2", from: 2024, to: null },
      ]},
      { name: "Ioniq 5", generations: [{ code: "NE", from: 2022, to: null }] },
    ],
  },
  {
    name: "Kia",
    models: [
      { name: "Sorento", generations: [
        { code: "BL", from: 2003, to: 2009 },
        { code: "XM", from: 2011, to: 2015 },
        { code: "UM", from: 2016, to: 2020 },
        { code: "MQ4", from: 2021, to: null },
      ]},
      { name: "Sportage", generations: [
        { code: "KM", from: 2005, to: 2010 },
        { code: "SL", from: 2011, to: 2016 },
        { code: "QL", from: 2017, to: 2022 },
        { code: "NQ5", from: 2023, to: null },
      ]},
      { name: "Soul", generations: [
        { code: "AM", from: 2010, to: 2013 },
        { code: "PS", from: 2014, to: 2019 },
        { code: "SK3", from: 2020, to: null },
      ]},
      { name: "EV6", generations: [{ code: "CV", from: 2022, to: null }] },
    ],
  },
  {
    name: "Porsche",
    models: [
      { name: "Boxster", generations: [
        { code: "986", from: 2000, to: 2004 },
        { code: "987", from: 2005, to: 2012 },
        { code: "981", from: 2013, to: 2016 },
        { code: "982", from: 2017, to: null },
      ]},
      { name: "Panamera", generations: [
        { code: "970", from: 2010, to: 2016 },
        { code: "971", from: 2017, to: 2023 },
      ]},
      { name: "Taycan", generations: [{ code: "J1", from: 2020, to: null }] },
    ],
  },
];
