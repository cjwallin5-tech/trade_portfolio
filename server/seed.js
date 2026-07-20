const crypto = require('crypto');
const db = require('./db');

const pros = [
  {
    name: 'Marcus Ondera',
    trade: 'Electrical',
    tagline: 'Panel upgrades, rewires, and the stuff inspectors actually pass.',
    bio: "I've been running Ondera Electric out of the east side for twelve years, mostly residential service upgrades and troubleshooting. If your breaker trips for no reason or you're adding a sub-panel for a shop, that's my everyday work. I pull my own permits and I don't leave a job until it's tested.",
    location: 'Columbus, OH',
    phone: '(614) 555-0148',
    email: 'marcus@onderaelectric.com',
    years_experience: 12,
    license_number: 'OH-EL-48821',
    avatar_seed: 'marcus-ondera',
    portfolio: [
      { seed: 'panel-upgrade-1', caption: '200A panel upgrade, 1950s colonial' },
      { seed: 'subpanel-2', caption: 'Sub-panel run to detached garage' },
      { seed: 'wiring-3', caption: 'Knob-and-tube replacement, kitchen circuit' },
      { seed: 'ev-charger-4', caption: 'Level 2 EV charger install' },
    ],
  },
  {
    name: 'Dana Whitfield',
    trade: 'Plumbing',
    tagline: 'Repipes, water heaters, and drain lines that stay unclogged.',
    bio: 'Whitfield Plumbing has been a two-person outfit since 2015 — me and my brother Cole. We do a lot of repipe work in older homes with galvanized pipe still in the walls, plus tankless water heater conversions. We show up when we say we will, which apparently still counts as a selling point in this business.',
    location: 'Portland, OR',
    phone: '(503) 555-0119',
    email: 'dana@whitfieldplumbing.com',
    years_experience: 9,
    license_number: 'OR-PL-11290',
    avatar_seed: 'dana-whitfield',
    portfolio: [
      { seed: 'repipe-1', caption: 'Full repipe, 1962 ranch home' },
      { seed: 'tankless-2', caption: 'Tankless water heater conversion' },
      { seed: 'drain-3', caption: 'Main line replacement, cast iron to PVC' },
      { seed: 'bathroom-4', caption: 'Rough-in for a basement bathroom' },
    ],
  },
  {
    name: 'Reyna Castillo',
    trade: 'Carpentry',
    tagline: 'Built-ins, trim, and framing that closes up tight.',
    bio: "I started as a framer, spent a few years doing finish trim, and now I mostly do custom built-ins and cabinetry for people who don't want another IKEA bookshelf. Every job gets a sketch and a materials list before I touch wood, so there aren't surprises on the invoice.",
    location: 'Asheville, NC',
    phone: '(828) 555-0176',
    email: 'reyna@castillowoodwork.com',
    years_experience: 15,
    license_number: 'NC-GC-77430',
    avatar_seed: 'reyna-castillo',
    portfolio: [
      { seed: 'builtin-1', caption: 'Living room built-ins around a fireplace' },
      { seed: 'trim-2', caption: 'Crown and baseboard, full first floor' },
      { seed: 'stair-3', caption: 'Open-riser staircase rebuild' },
      { seed: 'cabinet-4', caption: 'Mudroom cabinetry and bench' },
    ],
  },
  {
    name: 'Terrance Boyd',
    trade: 'Roofing',
    tagline: 'Tear-offs, metal roofing, and flashing done right the first time.',
    bio: "Boyd Roofing has been around since my dad started it in 1988. I took it over in 2011. Most of what we do is full tear-off and reroof — asphalt and standing seam metal both. I still climb every roof I quote, I don't send a salesman.",
    location: 'Tulsa, OK',
    phone: '(918) 555-0163',
    email: 'terrance@boydroofingok.com',
    years_experience: 22,
    license_number: 'OK-RF-30512',
    avatar_seed: 'terrance-boyd',
    portfolio: [
      { seed: 'roof-tearoff-1', caption: 'Full tear-off, architectural shingle' },
      { seed: 'metal-roof-2', caption: 'Standing seam metal, farmhouse' },
      { seed: 'flashing-3', caption: 'Chimney flashing and step flashing repair' },
      { seed: 'gutter-4', caption: 'Gutter replacement after hail damage' },
    ],
  },
  {
    name: 'Priya Nair',
    trade: 'Painting',
    tagline: 'Interior and exterior painting with real prep work.',
    bio: "I run a small crew — three of us, no subcontracted labor. We prep every surface properly before a brush touches it, which is the difference between paint that lasts two years and paint that lasts ten. Mostly interior repaints and exterior siding work.",
    location: 'Sacramento, CA',
    phone: '(916) 555-0134',
    email: 'priya@nairpainting.com',
    years_experience: 7,
    license_number: 'CA-C33-99215',
    avatar_seed: 'priya-nair',
    portfolio: [
      { seed: 'interior-paint-1', caption: 'Whole-house interior repaint' },
      { seed: 'exterior-paint-2', caption: 'Exterior siding, color change' },
      { seed: 'cabinet-paint-3', caption: 'Kitchen cabinet refinish' },
      { seed: 'trim-paint-4', caption: 'Trim and door repaint, historic home' },
    ],
  },
  {
    name: 'Gabriel Hoyt',
    trade: 'HVAC',
    tagline: 'Furnace and AC installs, plus the diagnostic work most people skip.',
    bio: "I got tired of working for a big HVAC franchise that pushed unnecessary replacements, so I went out on my own in 2018. I'd rather fix your existing unit if it's fixable and tell you straight if it's not worth it. Installs, tune-ups, and duct sealing.",
    location: 'Grand Rapids, MI',
    phone: '(616) 555-0187',
    email: 'gabriel@hoythvac.com',
    years_experience: 11,
    license_number: 'MI-HV-20874',
    avatar_seed: 'gabriel-hoyt',
    portfolio: [
      { seed: 'furnace-1', caption: 'Furnace replacement, 96% efficiency unit' },
      { seed: 'ac-install-2', caption: 'Central AC install, split system' },
      { seed: 'ductwork-3', caption: 'Duct sealing and insulation, attic run' },
      { seed: 'minisplit-4', caption: 'Ductless mini-split, converted garage' },
    ],
  },
  {
    name: 'Sofia Marchetti',
    trade: 'Masonry',
    tagline: 'Brick, block, and stone work that outlasts the building around it.',
    bio: "Third-generation mason. My grandfather laid brick in this city, my father after him, and now me. Chimney repair, retaining walls, and repointing old brick facades make up most of the calls I take. I still mix mortar the way I was taught, not just whatever the big-box store sells.",
    location: 'Pittsburgh, PA',
    phone: '(412) 555-0155',
    email: 'sofia@marchettimasonry.com',
    years_experience: 19,
    license_number: 'PA-MS-40213',
    avatar_seed: 'sofia-marchetti',
    portfolio: [
      { seed: 'chimney-1', caption: 'Chimney rebuild above the roofline' },
      { seed: 'retaining-wall-2', caption: 'Fieldstone retaining wall' },
      { seed: 'repoint-3', caption: 'Repointing, 1910 brick facade' },
      { seed: 'patio-4', caption: 'Bluestone patio and steps' },
    ],
  },
  {
    name: 'Devon Michaels',
    trade: 'Landscaping',
    tagline: 'Hardscaping, drainage, and yards that don’t flood every spring.',
    bio: "Most of my calls start with 'my yard turns into a swamp every time it rains.' I do grading and drainage work first, then hardscaping — patios, walkways, retaining walls — on top of a yard that actually drains. Plant installs are a smaller part of what I do, but I coordinate with a landscape designer when a job needs one.",
    location: 'Richmond, VA',
    phone: '(804) 555-0142',
    email: 'devon@michaelslandworks.com',
    years_experience: 10,
    license_number: 'VA-LC-15873',
    avatar_seed: 'devon-michaels',
    portfolio: [
      { seed: 'drainage-1', caption: 'French drain and regrading, backyard' },
      { seed: 'patio-2', caption: 'Paver patio with fire pit' },
      { seed: 'retaining-3', caption: 'Segmental retaining wall, sloped lot' },
      { seed: 'walkway-4', caption: 'Front walkway, natural stone' },
    ],
  },
  {
    name: 'Lena Okafor',
    trade: 'Flooring',
    tagline: 'Hardwood refinishing and tile that’s actually level.',
    bio: "I spent six years working under a flooring contractor before going out on my own in 2019. Hardwood sand-and-refinish jobs are most of my calendar, along with tile work in kitchens and bathrooms. I check subfloor level before I quote anything — it's the step that gets skipped and causes problems two years later.",
    location: 'Denver, CO',
    phone: '(303) 555-0121',
    email: 'lena@okaforfloors.com',
    years_experience: 8,
    license_number: 'CO-FL-60249',
    avatar_seed: 'lena-okafor',
    portfolio: [
      { seed: 'hardwood-1', caption: 'Red oak refinish, natural stain' },
      { seed: 'tile-2', caption: 'Kitchen tile install, herringbone pattern' },
      { seed: 'lvp-3', caption: 'LVP install, basement finish' },
      { seed: 'stairs-floor-4', caption: 'Hardwood stair treads to match' },
    ],
  },
];

const insertPro = db.prepare(`
  INSERT INTO pros (name, trade, tagline, bio, location, phone, email, years_experience, license_number, avatar_path, dashboard_token)
  VALUES (@name, @trade, @tagline, @bio, @location, @phone, @email, @years_experience, @license_number, @avatar_path, @dashboard_token)
`);

const insertPhoto = db.prepare(`
  INSERT INTO portfolio_items (pro_id, image_path, caption, sort_order)
  VALUES (?, ?, ?, ?)
`);

const seedAll = db.transaction(() => {
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM portfolio_items').run();
  db.prepare('DELETE FROM pros').run();

  for (const pro of pros) {
    const info = insertPro.run({
      name: pro.name,
      trade: pro.trade,
      tagline: pro.tagline,
      bio: pro.bio,
      location: pro.location,
      phone: pro.phone,
      email: pro.email,
      years_experience: pro.years_experience,
      license_number: pro.license_number,
      avatar_path: `placeholder:${pro.avatar_seed}`,
      dashboard_token: crypto.randomBytes(16).toString('hex'),
    });
    const proId = info.lastInsertRowid;
    pro.portfolio.forEach((item, idx) => {
      insertPhoto.run(proId, `placeholder:${item.seed}`, item.caption, idx);
    });
  }
});

seedAll();

const count = db.prepare('SELECT COUNT(*) AS n FROM pros').get().n;
console.log(`Seeded ${count} pros.`);
