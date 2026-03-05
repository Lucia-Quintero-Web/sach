import { renderAgendaView } from './ui/views/agenda.js';
import { renderPacientesView } from './ui/views/pacientes_v2.js';
import { renderAbonosView } from './ui/views/abonos.js';
import { renderDashboardView } from './ui/views/dashboard.js';
import { supabase, getSupabase } from './data/supabase-client.js';

export { supabase };

const appContainer = document.getElementById('app');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('S.A.C.H. App Initialized - ONLINE CLOUD MODE');

        getSupabase();

        setupNavigation();

        // Indicador de conexión: verificar Supabase con un ping liviano
        const statusEl = document.getElementById('online-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></span>
                Verificando...
            `;

            // Ping real: leer 1 fila
            const { error: pingError } = await supabase.from('PACIENTES').select('id').limit(1);

            if (pingError) {
                statusEl.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
                    Sin conexión
                `;
                statusEl.classList.remove('text-accent');
                statusEl.classList.add('text-red-500');
            } else {
                statusEl.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-accent animate-pulse shadow-glow"></span>
                    Connected
                `;
                statusEl.classList.remove('text-danger', 'text-red-500');
                statusEl.classList.add('text-accent');
            }
        }

        switchView('dashboard');
    } catch (err) {
        console.error('CRITICAL STARTUP ERROR:', err);
        appContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
                <div class="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-6 shadow-soft">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-width="2"/></svg>
                </div>
                <h1 class="text-2xl font-display font-extrabold text-dark tracking-tight">Error de Inicialización</h1>
                <p class="text-secondary text-sm mt-3 max-w-md">${err.message}. Verifique su conexión o credenciales.</p>
                <button onclick="location.reload()" class="mt-8 sach-button variant-set">Reintentar</button>
            </div>
        `;
    }
});


// Global dispatcher for easy access from components
window.dispatchView = (view) => switchView(view);

function setupNavigation() {
    const navLinks = document.querySelectorAll('#desktop-nav .nav-item, div.fixed.bottom-4 button');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = link.innerText.trim().toLowerCase();
            switchView(viewName);
        });
    });
}

function switchView(view) {
    appContainer.innerHTML = '';
    switch (view) {
        case 'dashboard':
        case 'principal':
            renderDashboardView(appContainer);
            break;
        case 'agenda':
            renderAgendaView(appContainer);
            break;
        case 'pacientes':
            renderPacientesView(appContainer);
            break;
        case 'abonos':
        case 'finanzas':
            renderAbonosView(appContainer);
            break;
        default:
            console.warn('View not implemented:', view);
    }
}

