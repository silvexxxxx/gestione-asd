export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ valid: false, error: 'Metodo non consentito' }); }

    const { license_key } = req.body;
    if (!license_key) { return res.status(400).json({ valid: false, error: 'Nessuna chiave fornita.' }); }

    const MASTER_KEY = 'SILVERIO-PRO-77X9-2026';
    const TEST_KEY = 'TEST-1234';

    if (license_key === MASTER_KEY || license_key === TEST_KEY) {
        return res.status(200).json({ valid: true, message: 'Licenza attivata con successo.' });
    }

    return res.status(401).json({ valid: false, error: 'Chiave di licenza non valida o scaduta.' });
}
