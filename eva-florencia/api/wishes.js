module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (req.method === 'GET') {
    let r = await fetch(`${supabaseUrl}/rest/v1/wishes?select=*,reactions(emoji,count)&order=created_at.desc`, {
      headers: authHeaders,
    });
    if (!r.ok) {
      r = await fetch(`${supabaseUrl}/rest/v1/wishes?select=*&order=created_at.desc`, { headers: authHeaders });
    }
    const wishes = await r.json();
    const storageBase = `${supabaseUrl}/storage/v1/object/public/wish-images`;
    return res.status(200).json(
      Array.isArray(wishes)
        ? wishes.map(w => {
            const reactionsMap = {};
            if (Array.isArray(w.reactions)) {
              w.reactions.forEach(rx => { reactionsMap[rx.emoji] = rx.count; });
            }
            return { ...w, image_url: w.image_path ? `${storageBase}/${w.image_path}` : null, reactions: reactionsMap };
          })
        : wishes
    );
  }

  if (req.method === 'POST') {
    const { name, email, message, invite_code, image_base64, image_type } = req.body || {};

    if (!name || !message) {
      return res.status(400).json({ error: 'Nombre y mensaje son obligatorios' });
    }
    if (invite_code !== process.env.INVITE_CODE) {
      return res.status(403).json({ error: 'Código de invitación incorrecto' });
    }

    let image_path = null;
    if (image_base64) {
      const ext = image_type === 'image/png' ? 'png' : image_type === 'image/webp' ? 'webp' : 'jpg';
      image_path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buf = Buffer.from(image_base64, 'base64');
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/wish-images/${image_path}`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': image_type || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: buf,
      });
      if (!uploadRes.ok) {
        const detail = await uploadRes.text();
        return res.status(500).json({ error: 'Error al subir la imagen', detail });
      }
    }

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/wishes`, {
      method: 'POST',
      headers: { ...authHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({ name, email, message, image_path }),
    });
    const inserted = await insertRes.json();
    if (!insertRes.ok) {
      return res.status(500).json({ error: inserted.message || inserted.error || 'Error al guardar el deseo' });
    }
    return res.status(201).json(inserted);
  }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};
