module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { wish_id, emoji } = req.body || {};
    if (!wish_id || !emoji) return res.status(400).json({ error: 'Faltan parámetros' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_reaction`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_wish_id: wish_id, p_emoji: emoji }),
    });

    const count = await r.json();
    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
};
