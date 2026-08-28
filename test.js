
                // Show close button only if trial is active and no license saved
                (function() {
                    let id = localStorage.getItem('asd_install_date');
                    if(id) {
                        const days = (Date.now() - parseInt(id)) / (1000 * 60 * 60 * 24);
                        if(days <= 15 && !localStorage.getItem('asd_license_key')) {
                            document.getElementById('paywall-close-btn').style.display = 'flex';
                        }
                    }
                })();
            