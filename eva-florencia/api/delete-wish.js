module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, admin_token } = req.body || {};
  if (!id || admin_token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const wishRes = await fetch(`${supabaseUrl}/rest/v1/wishes?id=eq.${id}&select=image_path`, {
    headers: authHeaders,
  });
  const [wish] = await wishRes.json();

  if (wish?.image_path) {
    await fetch(`${supabaseUrl}/storage/v1/object/wish-images/${wish.image_path}`, {
      method: 'DELETE',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
  }

  await fetch(`${supabaseUrl}/rest/v1/wishes?id=eq.${id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  return res.status(200).json({ success: true });
};
