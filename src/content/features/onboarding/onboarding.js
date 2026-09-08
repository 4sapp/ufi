import { createOverlay } from '../../core/ui/overlay.js';
import { createButton } from '../../core/ui/buttons.js';

export function init() {
    chrome.storage.local.get({ onboardingShown: false }, function(settings) {
        if (!settings.onboardingShown) {
            const bodyContent = document.createElement('div');
            bodyContent.style.maxHeight = 'calc(90vh - 150px)';
            bodyContent.style.overflowY = 'auto';
            bodyContent.style.padding = '4px 2px';

            bodyContent.innerHTML = `
                <div style="padding: 4px 0 10px 0; font-size: 14px; line-height: 1.6; color: var(--rovalra-main-text-color, #ffffff);">
                    <p style="margin-bottom: 12px;">
                        La extensión está lista. Puedes buscar servidores en Miami o con la menor latencia desde la pestaña <strong>Servidores</strong> de cualquier juego.
                    </p>
                    <p style="margin-bottom: 0; font-size: 13px; color: var(--rovalra-secondary-text-color, #9aa0a6);">
                        Para ajustar las opciones, abre el menú del engranaje en Roblox y selecciona <strong>ufi Settings</strong>.
                    </p>
                </div>
            `;

            const acknowledgeOnboarding = () => {
                chrome.storage.local.set({ onboardingShown: true }, function() {
                    console.log('ufi: Onboarding acknowledged.');
                });
            };

            const gotItButton = createButton('Entendido', 'primary');

            const { close } = createOverlay({
                title: 'ufi',
                bodyContent: bodyContent,
                actions: [gotItButton],
                maxWidth: '440px',
                showLogo: false,
                preventBackdropClose: false,
                onClose: acknowledgeOnboarding
            });

            gotItButton.addEventListener('click', () => {
                close();
            });
        }
    });
}