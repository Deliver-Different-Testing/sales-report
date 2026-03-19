const { getPool, sql } = require('./db');

async function getStaff() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT ucstID as id, ucstFirstName as firstName, ucstLastName as lastName,
           ucstStartDate as startDate, ucstActive as active
    FROM tucStaff
    ORDER BY ucstLastName, ucstFirstName
  `);
  return result.recordset;
}

async function getClients({ search, staffId, page = 1, pageSize = 100 }) {
  const pool = await getPool();
  const req = pool.request()
    .input('offset', sql.Int, (page - 1) * pageSize)
    .input('pageSize', sql.Int, pageSize);

  let where = 'WHERE 1=1';
  if (search) {
    req.input('search', sql.NVarChar, `%${search}%`);
    where += ' AND ucclName LIKE @search';
  }
  if (staffId) {
    req.input('staffId', sql.Int, parseInt(staffId));
    where += ' AND ucclStaff = @staffId';
  }

  const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM tucClient ${where.replace('@search', `'%'`).replace('@staffId', staffId || 0)}`);

  // Re-run with proper params for count
  const countReq = pool.request();
  let countWhere = 'WHERE 1=1';
  if (search) { countReq.input('search', sql.NVarChar, `%${search}%`); countWhere += ' AND ucclName LIKE @search'; }
  if (staffId) { countReq.input('staffId', sql.Int, parseInt(staffId)); countWhere += ' AND ucclStaff = @staffId'; }
  const countRes = await countReq.query(`SELECT COUNT(*) as total FROM tucClient ${countWhere}`);
  const total = countRes.recordset[0].total;

  const result = await req.query(`
    SELECT c.ucclID as id, c.ucclName as name, c.ucclStaff as staffId,
           c.ucclDateJoined as dateJoined, c.ucclActive as active,
           s.ucstFirstName as staffFirstName, s.ucstLastName as staffLastName
    FROM tucClient c
    LEFT JOIN tucStaff s ON s.ucstID = c.ucclStaff
    ${where}
    ORDER BY c.ucclName
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return { clients: result.recordset, total, page, pageSize };
}

async function updateClient(id, { staffId, dateJoined, name }) {
  const pool = await getPool();
  const req = pool.request().input('id', sql.Int, id);
  const updates = [];

  if (staffId !== undefined) {
    req.input('staffId', sql.Int, staffId ? parseInt(staffId) : null);
    updates.push('ucclStaff = @staffId');
  }
  if (dateJoined !== undefined) {
    req.input('dateJoined', sql.Date, dateJoined ? new Date(dateJoined) : null);
    updates.push('ucclDateJoined = @dateJoined');
  }
  if (name !== undefined) {
    req.input('name', sql.NVarChar, name);
    updates.push('ucclName = @name');
  }

  if (!updates.length) return { success: false, error: 'Nothing to update' };

  await req.query(`UPDATE tucClient SET ${updates.join(', ')} WHERE ucclID = @id`);
  return { success: true };
}

async function updateStaff(id, { firstName, lastName, startDate }) {
  const pool = await getPool();
  const req = pool.request().input('id', sql.Int, id);
  const updates = [];

  if (firstName !== undefined) { req.input('firstName', sql.NVarChar, firstName); updates.push('ucstFirstName = @firstName'); }
  if (lastName !== undefined) { req.input('lastName', sql.NVarChar, lastName); updates.push('ucstLastName = @lastName'); }
  if (startDate !== undefined) {
    req.input('startDate', sql.Date, startDate ? new Date(startDate) : null);
    updates.push('ucstStartDate = @startDate');
  }

  if (!updates.length) return { success: false, error: 'Nothing to update' };
  await req.query(`UPDATE tucStaff SET ${updates.join(', ')} WHERE ucstID = @id`);
  return { success: true };
}

async function bulkUpdateClients(updates) {
  // updates: [{ id, staffId, dateJoined }]
  const results = [];
  for (const u of updates) {
    try {
      const r = await updateClient(u.id, { staffId: u.staffId, dateJoined: u.dateJoined });
      results.push({ id: u.id, ...r });
    } catch (e) {
      results.push({ id: u.id, success: false, error: e.message });
    }
  }
  return results;
}

module.exports = { getStaff, getClients, updateClient, updateStaff, bulkUpdateClients };
