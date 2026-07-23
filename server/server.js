require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
const TRADES = require('./trades');
const { sendBookingNotification } = require('./mailer');
const SqliteStore = require('better-sqlite3-session-store')(session);

const MAX_PORTFOLIO_ITEMS = 12;

const app = express();
const PORT = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === 'production';
const publicDir = path.join(__dirname, '..', 'public');
const uploadsDir = process.env.UPLOADS_DIR || path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set — using an insecure dev default. Set it in .env for production.');
}

// Railway (and most PaaS providers) terminate TLS at a proxy in front of the app,
// so Express needs to trust the X-Forwarded-* headers to know the request was HTTPS.
if (isProduction) app.set('trust proxy', 1);

app.use(express.json());
app.use(
  session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));

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
  const { dashboard_token, password_hash, ...rest } = row;
  return rest;
}

// Accepts either a logged-in session for this pro or the legacy dashboard token.
function resolvePro(req, id, token) {
  const pro = db.prepare('SELECT * FROM pros WHERE id = ?').get(id);
  if (!pro) return null;
  if (req.session && req.session.proId === pro.id) return pro;
  if (token && pro.dashboard_token === token) return pro;
  return null;
}

function unlinkUpload(imagePath) {
  if (!imagePath || imagePath.startsWith('placeholder:')) return;
  fs.unlink(path.join(publicDir, imagePath), () => {});
}

app.get('/api/trades', (req, res) => {
  res.json(TRADES);
});

app.get('/api/pros', (req, res) => {
  const { trade, q } = req.query;
  let sql = `
    SELECT pros.*,
      (SELECT image_path FROM portfolio_items WHERE pro_id = pros.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS cover_photo
    FROM pros WHERE profile_complete = 1
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
  const { name, trade, tagline, bio, location, phone, email, years_experience, license_number, password } = req.body;

  if (!name || !trade || !location || !phone || !email) {
    return res.status(400).json({ error: 'Name, trade, location, phone, and email are required.' });
  }
  if (!TRADES.includes(trade)) {
    return res.status(400).json({ error: 'Unknown trade category.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Choose a password with at least 8 characters.' });
  }
  const existing = db.prepare('SELECT id FROM pros WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with that email already exists. Log in instead.' });
  }

  const avatarFile = req.files?.avatar?.[0];
  const photoFiles = req.files?.photos || [];
  const captions = toArray(req.body.captions);

  const token = crypto.randomBytes(16).toString('hex');
  const passwordHash = bcrypt.hashSync(password, 10);

  const insertPro = db.prepare(`
    INSERT INTO pros (name, trade, tagline, bio, location, phone, email, years_experience, license_number, avatar_path, dashboard_token, password_hash)
    VALUES (@name, @trade, @tagline, @bio, @location, @phone, @email, @years_experience, @license_number, @avatar_path, @dashboard_token, @password_hash)
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
    password_hash: passwordHash,
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
  const pro = db.prepare('SELECT id, name, email, dashboard_token FROM pros WHERE id = ?').get(pro_id);
  if (!pro) return res.status(404).json({ error: 'That professional does not exist.' });

  const insert = db.prepare(`
    INSERT INTO bookings (pro_id, client_name, client_email, client_phone, preferred_date, job_description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(pro_id, client_name, client_email, client_phone || null, preferred_date || null, job_description || null);

  const dashboardUrl = `${req.protocol}://${req.get('host')}/dashboard.html?id=${pro.id}&token=${pro.dashboard_token}`;
  sendBookingNotification({
    pro,
    booking: { client_name, client_email, client_phone, preferred_date, job_description },
    dashboardUrl,
  });

  res.status(201).json({ id: info.lastInsertRowid });
});

app.patch('/api/pros/:id', upload.fields([{ name: 'avatar', maxCount: 1 }]), (req, res) => {
  const pro = resolvePro(req, req.params.id, req.body.token);
  if (!pro) {
    const avatarFile = req.files?.avatar?.[0];
    if (avatarFile) fs.unlink(avatarFile.path, () => {});
    return res.status(403).json({ error: 'Not authorized.' });
  }

  const { name, trade, tagline, bio, location, phone, email, years_experience, license_number } = req.body;
  if (!name || !trade || !location || !phone || !email) {
    return res.status(400).json({ error: 'Name, trade, location, phone, and email are required.' });
  }
  if (!TRADES.includes(trade)) {
    return res.status(400).json({ error: 'Unknown trade category.' });
  }

  const avatarFile = req.files?.avatar?.[0];
  const params = {
    id: pro.id,
    name,
    trade,
    tagline: tagline || null,
    bio: bio || null,
    location,
    phone,
    email,
    years_experience: Number.parseInt(years_experience, 10) || 0,
    license_number: license_number || null,
  };

  if (avatarFile) {
    params.avatar_path = `/uploads/${avatarFile.filename}`;
    db.prepare(`
      UPDATE pros SET name=@name, trade=@trade, tagline=@tagline, bio=@bio, location=@location,
        phone=@phone, email=@email, years_experience=@years_experience, license_number=@license_number,
        avatar_path=@avatar_path, profile_complete=1
      WHERE id=@id
    `).run(params);
    unlinkUpload(pro.avatar_path);
  } else {
    db.prepare(`
      UPDATE pros SET name=@name, trade=@trade, tagline=@tagline, bio=@bio, location=@location,
        phone=@phone, email=@email, years_experience=@years_experience, license_number=@license_number,
        profile_complete=1
      WHERE id=@id
    `).run(params);
  }

  res.json(proPublic(db.prepare('SELECT * FROM pros WHERE id = ?').get(pro.id)));
});

app.post('/api/pros/:id/photos', upload.fields([{ name: 'photos', maxCount: 10 }]), (req, res) => {
  const photoFiles = req.files?.photos || [];
  const pro = resolvePro(req, req.params.id, req.body.token);
  if (!pro) {
    photoFiles.forEach((file) => fs.unlink(file.path, () => {}));
    return res.status(403).json({ error: 'Not authorized.' });
  }
  if (!photoFiles.length) {
    return res.status(400).json({ error: 'No photos were uploaded.' });
  }

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM portfolio_items WHERE pro_id = ?').get(pro.id);
  if (count + photoFiles.length > MAX_PORTFOLIO_ITEMS) {
    photoFiles.forEach((file) => fs.unlink(file.path, () => {}));
    return res.status(400).json({ error: `You can have at most ${MAX_PORTFOLIO_ITEMS} photos.` });
  }

  const captions = toArray(req.body.captions);
  const { next } = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM portfolio_items WHERE pro_id = ?')
    .get(pro.id);
  const insertPhoto = db.prepare(`
    INSERT INTO portfolio_items (pro_id, image_path, caption, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  photoFiles.forEach((file, idx) => {
    insertPhoto.run(pro.id, `/uploads/${file.filename}`, captions[idx] || null, next + idx);
  });

  const photos = db
    .prepare('SELECT id, image_path, caption FROM portfolio_items WHERE pro_id = ? ORDER BY sort_order ASC, id ASC')
    .all(pro.id);
  res.status(201).json(photos);
});

app.delete('/api/pros/:id/photos/:photoId', (req, res) => {
  const pro = resolvePro(req, req.params.id, req.body.token);
  if (!pro) return res.status(403).json({ error: 'Not authorized.' });

  const photo = db
    .prepare('SELECT * FROM portfolio_items WHERE id = ? AND pro_id = ?')
    .get(req.params.photoId, pro.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(photo.id);
  unlinkUpload(photo.image_path);
  res.json({ ok: true });
});

app.get('/api/pros/:id/bookings', (req, res) => {
  const pro = resolvePro(req, req.params.id, req.query.token);
  if (!pro) return res.status(403).json({ error: 'Not authorized.' });
  const bookings = db
    .prepare('SELECT * FROM bookings WHERE pro_id = ? ORDER BY created_at DESC')
    .all(pro.id);
  res.json(bookings);
});

app.patch('/api/bookings/:id', (req, res) => {
  const { token, status } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  const pro = resolvePro(req, booking.pro_id, token);
  if (!pro) {
    return res.status(403).json({ error: 'Not authorized.' });
  }
  if (!['new', 'contacted', 'booked', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Choose a password with at least 8 characters.' });
  }
  const existing = db.prepare('SELECT id FROM pros WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with that email already exists. Log in instead.' });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const passwordHash = bcrypt.hashSync(password, 10);

  const info = db.prepare(`
    INSERT INTO pros (name, trade, location, email, dashboard_token, password_hash, profile_complete)
    VALUES ('', '', '', @email, @dashboard_token, @password_hash, 0)
  `).run({ email, dashboard_token: token, password_hash: passwordHash });

  req.session.proId = info.lastInsertRowid;
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const pro = db.prepare('SELECT * FROM pros WHERE email = ? COLLATE NOCASE').get(email);
  if (!pro || !pro.password_hash || !bcrypt.compareSync(password, pro.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  req.session.proId = pro.id;
  res.json({ id: pro.id, name: pro.name });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.proId) return res.status(401).json({ error: 'Not logged in.' });
  const pro = db.prepare('SELECT id, name FROM pros WHERE id = ?').get(req.session.proId);
  if (!pro) return res.status(401).json({ error: 'Not logged in.' });
  res.json(pro);
});

app.post('/api/auth/set-password', (req, res) => {
  const { id, token, password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Choose a password with at least 8 characters.' });
  }
  const pro = resolvePro(req, id, token);
  if (!pro) return res.status(403).json({ error: 'Not authorized.' });
  db.prepare('UPDATE pros SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), pro.id);
  req.session.proId = pro.id;
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
