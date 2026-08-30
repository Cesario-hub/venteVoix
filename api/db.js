// api/db.js
// Ce code s'exécute sur le serveur Vercel, PAS dans votre navigateur.
import { Pool } from 'pg';

// La clé DATABASE_URL est sécurisée côté serveur
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Gérer les erreurs de méthode (uniquement POST pour cet exemple)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { action, table, data } = req.body;

    // --- 1. Action pour ajouter un utilisateur ---
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
      const result = await pool.query(sql, values);
      return res.status(200).json({ data: result.rows[0] });
    }

    // --- 2. Action pour récupérer des données (exemple générique) ---
    if (action === 'select') {
      const { table: tableName, columns = '*', field, value } = data;
      let sql = `SELECT ${columns} FROM ${tableName}`;
      let values = [];
      if (field && value) {
        sql += ` WHERE ${field} = $1`;
        values = [value];
      }
      const result = await pool.query(sql, values);
      return res.status(200).json({ data: result.rows });
    }

    // Si l'action n'est pas reconnue
    return res.status(400).json({ error: 'Action inconnue' });

  } catch (error) {
    console.error('❌ Erreur API:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}