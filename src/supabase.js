// src/supabase.js - Version Neon
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL non définie !');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export const query = async (text, params) => {
  console.log('🔍 SQL:', text);
  console.log('📦 Params:', params);
  try {
    const res = await pool.query(text, params);
    console.log('✅ Résultat:', res.rows);
    return res.rows;
  } catch (error) {
    console.error('❌ Erreur SQL:', error);
    throw error;
  }
};

export const supabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (field, value) => ({
        order: (orderField, { ascending = true } = {}) => ({
          then: async (callback) => {
            const sql = `SELECT ${columns} FROM ${table} WHERE ${field} = $1 ORDER BY ${orderField} ${ascending ? 'ASC' : 'DESC'}`;
            const rows = await query(sql, [value]);
            return callback({ data: rows, error: null });
          }
        }),
        then: async (callback) => {
          const sql = `SELECT ${columns} FROM ${table} WHERE ${field} = $1`;
          const rows = await query(sql, [value]);
          return callback({ data: rows, error: null });
        }
      }),
      then: async (callback) => {
        const sql = `SELECT ${columns} FROM ${table}`;
        const rows = await query(sql);
        return callback({ data: rows, error: null });
      }
    }),
    insert: (data) => ({
      then: async (callback) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const rows = await query(sql, values);
        return callback({ data: rows[0] || null, error: null });
      }
    }),
    upsert: (data) => ({
      then: async (callback) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
        const updateSet = keys.map((key) => `${key} = EXCLUDED.${key}`).join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (tel) DO UPDATE SET ${updateSet} RETURNING *`;
        const rows = await query(sql, values);
        return callback({ data: rows[0] || null, error: null });
      }
    }),
    update: (data) => ({
      eq: (field, value) => ({
        then: async (callback) => {
          const sets = Object.keys(data).map((key, i) => `${key} = $${i+1}`).join(', ');
          const values = [...Object.values(data), value];
          const sql = `UPDATE ${table} SET ${sets} WHERE ${field} = $${values.length}`;
          await query(sql, values);
          return callback({ data: 'Updated', error: null });
        }
      })
    }),
    delete: () => ({
      eq: (field, value) => ({
        then: async (callback) => {
          const sql = `DELETE FROM ${table} WHERE ${field} = $1`;
          await query(sql, [value]);
          return callback({ data: 'Deleted', error: null });
        }
      })
    })
  })
};

console.log('✅ Supabase (Neon) chargé avec succès !');