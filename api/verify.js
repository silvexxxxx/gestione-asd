export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ valid: false, error: 'Metodo non consentito' }); }

    const { license_key } = req.body;
    if (!license_key) { return res.status(400).json({ valid: false, error: 'Nessuna chiave fornita.' }); }

    // Chiavi nostre per test e sblocco manuale
    const MASTER_KEY = 'SILVERIO-PRO-77X9-2026';
    const TEST_KEY = 'TEST-1234';

    if (license_key === MASTER_KEY || license_key === TEST_KEY) {
        return res.status(200).json({ valid: true, message: 'Licenza speciale attivata con successo.' });
    }

    // Integrazione Lemon Squeezy
    try {
        const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ license_key: license_key })
        });
        
        const data = await lsResponse.json();
        
        if (data.valid) {
            return res.status(200).json({ valid: true, message: 'Abbonamento valido!' });
        } else {
            return res.status(401).json({ valid: false, error: data.error || 'Licenza non valida o scaduta.' });
        }
    } catch (e) {
        return res.status(500).json({ valid: false, error: 'Errore di connessione al provider di pagamento.' });
    }
}
