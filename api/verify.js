export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ valid: false, error: 'Metodo non consentito' }); }

    const { license_key, instance_name, instance_id, action } = req.body || {};
    if (!license_key) { return res.status(400).json({ valid: false, error: 'Nessuna chiave fornita.' }); }

    // Chiavi nostre per test e sblocco manuale illimitato
    const MASTER_KEY = 'SILVERIO-PRO-77X9-2026';
    const TEST_KEY = 'TEST-1234';

    if (license_key === MASTER_KEY || license_key === TEST_KEY) {
        if (action === 'deactivate') {
            return res.status(200).json({ deactivated: true, message: 'Licenza speciale disattivata da questa postazione.' });
        }
        return res.status(200).json({
            valid: true,
            message: 'Licenza speciale attivata con successo (dispositivi illimitati).',
            expires_at: null,
            instance_id: 'master-unlimited',
            activation_usage: 1,
            activation_limit: 999
        });
    }

    // Integrazione Lemon Squeezy
    try {
        // 1. Azione: DISATTIVA (Deactivate) -> libera lo slot del dispositivo su Lemon Squeezy
        if (action === 'deactivate') {
            if (!instance_id) {
                return res.status(200).json({ deactivated: true, message: 'Dispositivo scollegato localmente con successo.' });
            }
            const lsDeactivateRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    license_key: license_key,
                    instance_id: instance_id
                })
            });

            const deactData = await lsDeactivateRes.json();
            if (deactData.deactivated) {
                return res.status(200).json({
                    deactivated: true,
                    message: 'Dispositivo disattivato con successo. Slot postazione liberato.'
                });
            } else {
                return res.status(400).json({
                    deactivated: false,
                    error: deactData.error || 'Impossibile disattivare il dispositivo da Lemon Squeezy.'
                });
            }
        }

        // 2. Azione: ATTIVA (Activate) -> usato quando si inserisce la licenza o se il dispositivo non è ancora registrato
        if (action === 'activate' || (!instance_id && instance_name)) {
            const lsActivateRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    license_key: license_key,
                    instance_name: instance_name || 'Dispositivo ASD'
                })
            });

            const actData = await lsActivateRes.json();

            if (actData.activated) {
                return res.status(200).json({
                    valid: true,
                    activated: true,
                    message: 'Licenza attivata con successo su questo dispositivo!',
                    instance_id: actData.instance ? actData.instance.id : null,
                    expires_at: actData.license_key ? actData.license_key.expires_at : null,
                    activation_usage: actData.license_key ? actData.license_key.activation_usage : null,
                    activation_limit: actData.license_key ? actData.license_key.activation_limit : null
                });
            } else {
                let errorMsg = actData.error || 'Licenza non valida o non attivabile.';
                if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('activation limit')) {
                    const limit = (actData.license_key && actData.license_key.activation_limit) || 5;
                    errorMsg = `Limite massimo di ${limit} dispositivi raggiunto per questa licenza. Per attivare questo computer, disattiva prima una postazione precedente dalla gestione licenze.`;
                }
                return res.status(401).json({
                    valid: false,
                    activated: false,
                    error: errorMsg
                });
            }
        }

        // 3. Azione: VALIDA (Validate) -> controllo periodico con o senza instance_id
        const validateParams = { license_key: license_key };
        if (instance_id) {
            validateParams.instance_id = instance_id;
        }

        const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(validateParams)
        });

        const data = await lsResponse.json();

        if (data.valid) {
            return res.status(200).json({
                valid: true,
                message: 'Abbonamento valido!',
                instance_id: data.instance ? data.instance.id : (instance_id || null),
                expires_at: data.license_key ? data.license_key.expires_at : null,
                activation_usage: data.license_key ? data.license_key.activation_usage : null,
                activation_limit: data.license_key ? data.license_key.activation_limit : null
            });
        } else {
            return res.status(401).json({
                valid: false,
                error: data.error || 'Licenza non valida, scaduta o revocata su questo dispositivo.'
            });
        }
    } catch (e) {
        return res.status(500).json({
            valid: false,
            error: 'Errore di connessione al provider di licenze Lemon Squeezy: ' + e.message
        });
    }
}
