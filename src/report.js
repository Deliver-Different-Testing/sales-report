const { getPool, sql } = require('./db');

async function getSalesReport({ month, year, newBusinessMonths, staffId }) {
  const pool = await getPool();
  const req1 = pool.request().input('month', sql.Int, month).input('year', sql.Int, year);
  let clientSql = `SELECT ucclID as clientId, ucclName as clientName, ucclStaff as staffId, ucclDateJoined as dateJoined
                   FROM tucClient WHERE ucclStaff IS NOT NULL AND ucclActive = 1`;
  if (staffId) { clientSql += ' AND ucclStaff = @staffId'; req1.input('staffId', sql.Int, staffId); }
  const clients = (await req1.query(clientSql)).recordset;
  if (!clients.length) return { repSummaries: [], month, year, newBusinessMonths };

  const clientIds = clients.map(c => c.clientId).join(',');
  const staffIds = [...new Set(clients.map(c => c.staffId))].join(',');

  const turnovers = (await pool.request().input('month', sql.Int, month).input('year', sql.Int, year)
    .query(`SELECT ucctClientID as clientId, SUM(ucctAmount) as total FROM tucClientTurnover
            WHERE ucctMonth=@month AND ucctYear=@year AND ucctClientID IN (${clientIds}) GROUP BY ucctClientID`)).recordset;
  const turnoverMap = Object.fromEntries(turnovers.map(t => [t.clientId, t.total]));

  const staffRows = (await pool.request()
    .query(`SELECT ucstID as staffId, ucstFirstName as firstName, ucstLastName as lastName FROM tucStaff WHERE ucstID IN (${staffIds})`)).recordset;
  const staffMap = Object.fromEntries(staffRows.map(s => [s.staffId, `${s.firstName} ${s.lastName}`.trim()]));

  const ref = new Date(year, month - 1, 1);
  const repMap = {};
  clients.forEach(c => {
    const joined = c.dateJoined ? new Date(c.dateJoined) : ref;
    const monthsActive = Math.max(0, (ref.getFullYear() - joined.getFullYear()) * 12 + ref.getMonth() - joined.getMonth());
    const isNewBusiness = monthsActive <= newBusinessMonths;
    const spend = parseFloat(turnoverMap[c.clientId] || 0);
    if (!repMap[c.staffId]) repMap[c.staffId] = { staffId: c.staffId, staffName: staffMap[c.staffId] || `Staff #${c.staffId}`, accounts: [], totalSpend: 0, newBusinessSpend: 0 };
    repMap[c.staffId].accounts.push({ clientId: c.clientId, clientName: c.clientName, dateJoined: c.dateJoined ? new Date(c.dateJoined).toISOString().slice(0,10) : null, monthsActive, isNewBusiness, monthlySpend: spend });
    repMap[c.staffId].totalSpend += spend;
    if (isNewBusiness) repMap[c.staffId].newBusinessSpend += spend;
  });

  return {
    repSummaries: Object.values(repMap).map(r => ({ ...r, accounts: r.accounts.sort((a,b) => b.monthlySpend - a.monthlySpend) })).sort((a,b) => a.staffName.localeCompare(b.staffName)),
    month, year, newBusinessMonths
  };
}
module.exports = { getSalesReport };
