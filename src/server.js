require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { authenticate, requireAuth } = require('./auth');
const { getSalesReport } = require('./report');
const { getStaff, getClients, updateClient, updateStaff, bulkUpdateClients } = require('./admin');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));

// Login
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
  try {
    const user = await authenticate(req.body.username, req.body.password);
    if (!user) return res.render('login', { error: 'Invalid username or password.' });
    req.session.user = user;
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.render('login', { error: 'Database error. Please try again.' });
  }
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// Report page
app.get('/', requireAuth, (req, res) => {
  const now = new Date();
  res.render('report', { user: req.session.user, month: now.getMonth() + 1, year: now.getFullYear() });
});

// Report API
app.get('/api/report', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const newBusinessMonths = parseInt(req.query.newBusinessMonths) || 6;
    const user = req.session.user;

    let staffId = null;
    if (!user.isManager) {
      if (!user.staffId) return res.status(403).json({ error: 'No staff record linked to your account.' });
      staffId = user.staffId;
    } else if (req.query.staffId) {
      staffId = parseInt(req.query.staffId);
    }

    const data = await getSalesReport({ month, year, newBusinessMonths, staffId });
    res.json({ success: true, ...data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/admin', requireAuth, (req, res) => {
  if (!req.session.user.isManager) return res.status(403).send('Access denied');
  res.render('admin', { user: req.session.user });
});

// Admin API — Staff
app.get('/api/admin/staff', requireAuth, async (req, res) => {
  if (!req.session.user.isManager) return res.status(403).json({ error: 'Access denied' });
  try {
    const staff = await getStaff();
    res.json(staff);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/staff/:id', requireAuth, async (req, res) => {
  if (!req.session.user.isManager) return res.status(403).json({ error: 'Access denied' });
  try {
    const result = await updateStaff(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Admin API — Clients
app.get('/api/admin/clients', requireAuth, async (req, res) => {
  if (!req.session.user.isManager) return res.status(403).json({ error: 'Access denied' });
  try {
    const { search, staffId, active, page, pageSize } = req.query;
    const result = await getClients({ search, staffId, active, page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 100 });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/clients/bulk', requireAuth, async (req, res) => {
  if (!req.session.user.isManager) return res.status(403).json({ error: 'Access denied' });
  try {
    const results = await bulkUpdateClients(req.body.updates || []);
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/clients/:id', requireAuth, async (req, res) => {
  if (!req.session.user.isManager) return res.status(403).json({ error: 'Access denied' });
  try {
    const result = await updateClient(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sales Report running on port ${PORT}`));
