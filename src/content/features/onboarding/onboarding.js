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
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #ff6b8b 0%, #ff8e53 50%, #4facfe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;">
                        ufi
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--rovalra-main-text-color, #ffffff); margin-top: 4px;">
                        Miami Server Finder & Optimizador de Conexión
                    </div>
                    <div style="font-size: 12px; color: var(--rovalra-secondary-text-color, #9aa0a6); margin-top: 2px;">
                        ¡Gracias por instalar ufi! Ya está todo listo para que juegues con el menor ping.
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 12px 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: #ff6b8b; margin-bottom: 4px;">
                            <span>🌴</span> Modo Miami
                        </div>
                        <div style="font-size: 12px; color: var(--rovalra-secondary-text-color, #c0c0c0); line-height: 1.4;">
                            Ve a la pestaña <strong>Servidores</strong> de cualquier juego para encontrar datacenters verificados en Miami y Florida con ping bajo.
                        </div>
                    </div>

                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 12px 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: #00e5ff; margin-bottom: 4px;">
                            <span>⚡</span> Mejor Conexión
                        </div>
                        <div style="font-size: 12px; color: var(--rovalra-secondary-text-color, #c0c0c0); line-height: 1.4;">
                            ¿No buscas Miami? Este modo analiza los servidores disponibles y te conecta automáticamente al más rápido para tu conexión.
                        </div>
                    </div>

                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 12px 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: #00e588; margin-bottom: 4px;">
                            <span>⚙️</span> Ajustes de la Extensión
                        </div>
                        <div style="font-size: 12px; color: var(--rovalra-secondary-text-color, #c0c0c0); line-height: 1.4;">
                            Puedes personalizar las opciones en cualquier momento haciendo clic en el engranaje de la barra superior de Roblox y seleccionando <strong>"ufi Settings"</strong>.
                        </div>
                    </div>
                </div>
            `;

            const acknowledgeOnboarding = () => {
                chrome.storage.local.set({ onboardingShown: true }, function() {
                    console.log('ufi: Onboarding acknowledged.');
                });
            };

            const gotItButton = createButton('¡Entendido, a jugar!', 'primary');

            const { close } = createOverlay({
                title: '¡Bienvenido a ufi!',
                bodyContent: bodyContent,
                actions: [gotItButton],
                maxWidth: 'min(500px, 92vw)',
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