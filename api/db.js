// api/db.js - Version complète pour VenteVoix
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Autoriser les requêtes GET et POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Récupérer les données (GET pour les requêtes simples, POST pour les complexes)
    const body = req.method === 'POST' ? req.body : req.query;
    const { action, table, data } = body;

    console.log('📥 Requête API:', { action, table, data });

    // --- ACTION: select (récupérer des données) ---
    if (action === 'select') {
      const { table: tableName, columns = '*', field, value, orderField, ascending } = data || {};
      let sql = `SELECT ${columns} FROM ${tableName}`;
      let values = [];
      
      if (field && value) {
        sql += ` WHERE ${field} = $1`;
        values = [value];
      }
      
      if (orderField) {
        sql += ` ORDER BY ${orderField} ${ascending !== false ? 'ASC' : 'DESC'}`;
      }
      
      console.log('🔍 SQL:', sql, values);
      const result = await pool.query(sql, values);
      return res.status(200).json({ data: result.rows });
    }

    // --- ACTION: insert (ajouter une ligne) ---
    if (action === 'insert') {
      const { table: tableName, data: insertData } = body;
      const keys = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
      const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      
      console.log('📝 SQL INSERT:', sql, values);
      const result = await pool.query(sql, values);
      return res.status(200).json({ data: result.rows[0] });
    }

    // --- ACTION: upsert (ajouter ou mettre à jour) ---
    if (action === 'upsert') {
      const { table: tableName, data: upsertData } = body;
      const keys = Object.keys(upsertData);
      const values = Object.values(upsertData);
      const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
      const updateSet = keys.map((key) => `${key} = EXCLUDED.${key}`).join(', ');
      const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet} RETURNING *`;
      
      console.log('📝 SQL UPSERT:', sql, values);
      const result = await pool.query(sql, values);
      return res.status(200).json({ data: result.rows[0] });
    }

    // --- ACTION: upsertUser (spécial pour les utilisateurs avec conflit sur tel) ---
    if (action === 'upsertUser') {
      const { id, nom, tel, email, plan, pin, created_at, trial_end, is_trial } = data;
      const sql = `
        INSERT INTO users (id, nom, tel, email, plan, pin, created_at, trial_end, is_trial)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tel) DO UPDATE SET
          nom = EXCLUDED.nom,
          email = EXCLUDED.email,
          plan = EXCLUDED.plan,
          pin = EXCLUDED.pin
        RETURNING *;
      `;
      const values = [id, nom, tel, email, plan, pin, created_at, trial_end, is_trial];
      
      console.log('📝 SQL UPSERT USER:', sql, values);
      const result = await pool.query(sql, values);
      return res.status(200).json({ data: result.rows[0] });
    }

    // --- ACTION: update (mettre à jour) ---
    if (action === 'update') {
      const { table: tableName, field, value, updates } = data;
      const keys = Object.keys(updates);
      const values = [...Object.values(updates), value];
      const setClause = keys.map((key, i) => `${key} = $${i+1}`).join(', ');
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${field} = $${keys.length + 1}`;
      
      console.log('📝 SQL UPDATE:', sql, values);
      await pool.query(sql, values);
      return res.status(200).json({ data: 'Updated' });
    }

    // --- ACTION: delete (supprimer) ---
    if (action === 'delete') {
      const { table: tableName, field, value } = data;
      const sql = `DELETE FROM ${tableName} WHERE ${field} = $1`;
      
      console.log('🗑️ SQL DELETE:', sql, [value]);
      await pool.query(sql, [value]);
      return res.status(200).json({ data: 'Deleted' });
    }

    // --- ACTION: codes (gestion des codes d'activation) ---
    if (action === 'codes') {
      const { code, plan_id, note } = data || {};
      if (code) {
        // Vérifier un code existant
        const sql = `SELECT * FROM codes WHERE code = $1`;
        const result = await pool.query(sql, [code]);
        return res.status(200).json({ data: result.rows[0] || null });
      } else {
        // Créer un nouveau code
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const sql = `INSERT INTO codes (code, plan_id, note) VALUES ($1, $2, $3) RETURNING *`;
        const result = await pool.query(sql, [newCode, plan_id || 'pro', note || '']);
        return res.status(200).json({ data: result.rows[0] });
      }
    }

    // Si l'action n'est pas reconnue
    console.log('❌ Action inconnue:', action);
    return res.status(400).json({ error: `Action inconnue: ${action}` });

  } catch (error) {
    console.error('❌ Erreur API:', error);
    res.status(500).json({ error: error.message || 'Erreur interne du serveur' });
  }
}