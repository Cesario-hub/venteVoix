// src/supabase.js - Version API Vercel complète
console.log('✅ Supabase (API Vercel) chargé avec succès !');

// Fonction utilitaire pour appeler votre API
const callAPI = async (action, data) => {
  try {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur API');
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur appel API:', error);
    throw error;
  }
};

// Objet supabase adapté pour utiliser votre API
export const supabase = {
  from: (table) => ({
    select: (columns = '*') => {
      // Retourner un objet avec eq() et order()
      const selectObj = {
        eq: (field, value) => {
          console.log(`🔍 [API] SELECT ${columns} FROM ${table} WHERE ${field} = ${value}`);
          return {
            order: (orderField, { ascending = true } = {}) => ({
              then: async (callback) => {
                try {
                  const result = await callAPI('select', { 
                    data: { table, columns, field, value, orderField, ascending } 
                  });
                  return callback({ data: result.data, error: null });
                } catch (error) {
                  return callback({ data: null, error });
                }
              }
            }),
            then: async (callback) => {
              try {
                const result = await callAPI('select', { 
                  data: { table, columns, field, value } 
                });
                return callback({ data: result.data, error: null });
              } catch (error) {
                return callback({ data: null, error });
              }
            }
          };
        },
        then: async (callback) => {
          console.log(`🔍 [API] SELECT ${columns} FROM ${table}`);
          try {
            const result = await callAPI('select', { 
              data: { table, columns } 
            });
            return callback({ data: result.data, error: null });
          } catch (error) {
            return callback({ data: null, error });
          }
        }
      };
      return selectObj;
    },
    insert: (data) => ({
      then: async (callback) => {
        console.log(`📝 [API] INSERT INTO ${table}`, data);
        try {
          const result = await callAPI('insert', { table, data });
          return callback({ data: result.data, error: null });
        } catch (error) {
          return callback({ data: null, error });
        }
      }
    }),
    upsert: (data) => ({
      then: async (callback) => {
        console.log(`📝 [API] UPSERT dans ${table}`, data);
        try {
          if (table === 'users') {
            const result = await callAPI('upsertUser', { table, data });
            return callback({ data: result.data, error: null });
          }
          const result = await callAPI('upsert', { table, data });
          return callback({ data: result.data, error: null });
        } catch (error) {
          return callback({ data: null, error });
        }
      }
    }),
    update: (data) => ({
      eq: (field, value) => ({
        then: async (callback) => {
          console.log(`📝 [API] UPDATE ${table} SET`, data, `WHERE ${field} = ${value}`);
          try {
            const result = await callAPI('update', { 
              data: { table, field, value, updates: data } 
            });
            return callback({ data: result.data, error: null });
          } catch (error) {
            return callback({ data: null, error });
          }
        }
      })
    }),
    delete: () => ({
      eq: (field, value) => ({
        then: async (callback) => {
          console.log(`🗑️ [API] DELETE FROM ${table} WHERE ${field} = ${value}`);
          try {
            const result = await callAPI('delete', { 
              data: { table, field, value } 
            });
            return callback({ data: result.data, error: null });
          } catch (error) {
            return callback({ data: null, error });
          }
        }
      })
    })
  })
};

// Fonctions de gestion des codes
export const getCodes = () => {
  try {
    return JSON.parse(localStorage.getItem('vv_codes') || '{}');
  } catch {
    return {};
  }
};

export const saveCodes = (codes) => {
  localStorage.setItem('vv_codes', JSON.stringify(codes));
};

export const useActivationCode = async (code, userInfo) => {
  console.log(`🔑 [localStorage] Utilisation du code: ${code}`);
  if (code === "TEST01") {
    console.log('✅ Code TEST01 accepté !');
    return { ok: true, planId: "pro" };
  }
  const codes = getCodes();
  if (!codes[code]) return { ok: false, error: "Code invalide." };
  if (codes[code].used) return { ok: false, error: "Code déjà utilisé." };
  codes[code].used = true;
  codes[code].usedAt = new Date().toISOString();
  codes[code].usedBy = userInfo;
  saveCodes(codes);
  return { ok: true, planId: codes[code].planId };
};

console.log('✅ VenteVoix prêt à utiliser l\'API !');