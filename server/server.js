const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
const TRADES = require('./trades');

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, '..', 'public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.json());
app.use(express.static(publicDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 11 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image uploads are allowed'));
  },
});

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function proPublic(row) {
  const { dashboard_token, ...rest } = row;
  return rest;
}

app.get('/api/trades', (req, res) => {
  res.json(TRADES);
});

app.get('/api/pros', (req, res) => {
  const { trade, q } = req.query;
  let sql = `
    SELECT pros.*,
      (SELECT image_path FROM portfolio_items WHERE pro_id = pros.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS cover_photo
    FROM pros WHERE 1=1
  `;
  const params = [];
  if (trade && TRADES.includes(trade)) {
    sql += ' AND trade = ?';
    params.push(trade);
  }
  if (q) {
    sql += ' AND (name LIKE ? OR location LIKE ? OR tagline LIKE ? OR trade LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(proPublic));
});

app.get('/api/pros/:id', (req, res) => {
  const pro = db.prepare('SELECT * FROM pros WHERE id = ?').get(req.params.id);
  if (!pro) return res.status(404).json({ error: 'Not found' });
  const photos = db
    .prepare('SELECT id, image_path, caption FROM portfolio_items WHERE pro_id = ? ORDER BY sort_order ASC, id ASC')
    .all(pro.id);
  res.json({ ...proPublic(pro), portfolio: photos });
});

app.post('/api/pros', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'photos', maxCount: 10 }]), (req, res) => {
  const { name, trade, tagline, bio, location, phone, email, years_experience, license_number } = req.body;

  if (!name || !trade || !location || !phone || !email) {
    return res.status(400).json({ error: 'Name, trade, location, phone, and email are required.' });
  }
  if (!TRADES.includes(trade)) {
    return res.status(400).json({ error: 'Unknown trade category.' });
  }

  const avatarFile = req.files?.avatar?.[0];
  const photoFiles = req.files?.photos || [];
  const captions = toArray(req.body.captions);

  const token = crypto.randomBytes(16).toString('hex');

  const insertPro = db.prepare(`
    INSERT INTO pros (name, trade, tagline, bio, location, phone, email, years_experience, license_number, avatar_path, dashboard_token)
    VALUES (@name, @trade, @tagline, @bio, @location, @phone, @email, @years_experience, @license_number, @avatar_path, @dashboard_token)
  `);
  const insertPhoto = db.prepare(`
    INSERT INTO portfolio_items (pro_id, image_path, caption, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const info = insertPro.run({
    name,
    trade,
    tagline: tagline || null,
    bio: bio || null,
    location,
    phone,
    email,
    years_experience: Number.parseInt(years_experience, 10) || 0,
    license_number: license_number || null,
    avatar_path: avatarFile ? `/uploads/${avatarFile.filename}` : null,
    dashboard_token: token,
  });

  const proId = info.lastInsertRowid;
  photoFiles.forEach((file, idx) => {
    insertPhoto.run(proId, `/uploads/${file.filename}`, captions[idx] || null, idx);
  });

  res.status(201).json({ id: proId, dashboard_token: token });
});

app.post('/api/bookings', (req, res) => {
  const { pro_id, client_name, client_email, client_phone, preferred_date, job_description } = req.body;

  if (!pro_id || !client_name || !client_email) {
    return res.status(400).json({ error: 'pro_id, client_name, and client_email are required.' });
  }
  const pro = db.prepare('SELECT id FROM pros WHERE id = ?').get(pro_id);
  if (!pro) return res.status(404).json({ error: 'That professional does not exist.' });

  const insert = db.prepare(`
    INSERT INTO bookings (pro_id, client_name, client_email, client_phone, preferred_date, job_description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(pro_id, client_name, client_email, client_phone || null, preferred_date || null, job_description || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get('/api/pros/:id/bookings', (req, res) => {
  const { token } = req.query;
  const pro = db.prepare('SELECT id, dashboard_token FROM pros WHERE id = ?').get(req.params.id);
  if (!pro || pro.dashboard_token !== token) {
    return res.status(403).json({ error: 'Invalid or missing dashboard token.' });
  }
  const bookings = db
    .prepare('SELECT * FROM bookings WHERE pro_id = ? ORDER BY created_at DESC')
    .all(pro.id);
  res.json(bookings);
});

app.patch('/api/bookings/:id', (req, res) => {
  const { token, status } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  const pro = db.prepare('SELECT dashboard_token FROM pros WHERE id = ?').get(booking.pro_id);
  if (!pro || pro.dashboard_token !== token) {
    return res.status(403).json({ error: 'Invalid or missing dashboard token.' });
  }
  if (!['new', 'contacted', 'booked', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image uploads are allowed') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`Trade portfolio site running at http://localhost:${PORT}`);
});
