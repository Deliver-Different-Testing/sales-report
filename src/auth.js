const { getPool, sql } = require('./db');
const crypto = require('crypto');
const md5 = str => crypto.createHash('md5').update(str).digest('hex');

async function authenticate(username, password) {
  const pool = await getPool();
  const result = await pool.request()
    .input('username', sql.NVarChar, username)
    .query(`SELECT UserName, FullName, UserGroupId, StaffId, Password, Active, InternetAccess
            FROM TblUsers WHERE UserName = @username AND Active = 1 AND InternetAccess = 1`);
  if (!result.recordset.length) return null;
  const u = result.recordset[0];
  const ok = u.Password === md5(password) || u.Password === password || u.Password === md5(password.toLowerCase());
  if (!ok) return null;
  return { username: u.UserName, fullName: u.FullName, userGroupId: u.UserGroupId, staffId: u.StaffId, isManager: u.UserGroupId === 1 };
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

module.exports = { authenticate, requireAuth };
