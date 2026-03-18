import { renderAgendaView } from './ui/views/agenda.js';
import { renderPacientesView } from './ui/views/pacientes_v2.js';
import { renderAbonosView } from './ui/views/abonos_v2.js';
import { renderDashboardView } from './ui/views/dashboard.js';
import { openAjustesModal } from './ui/views/ajustes.js';
import { supabase, getSupabase } from './data/supabase-client.js';

export { supabase };

const appContainer = document.getElementById('app');

document.addEventListener('DOMContentLoaded', async () => {
    try {

        getSupabase();
        await initializeUser(); // Cargar perfil y permisos
        setupNavigation();
        setupGlobalSearch();
        setupNetworkMonitor();
        checkAutosaveRecovery();

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

function setupGlobalSearch() {
    const globalSearch = document.getElementById('global-search');
    if (!globalSearch) return;

    globalSearch.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length > 0) {
            // If we are not in patients view, switch to it
            const currentView = document.querySelector('h2')?.innerText.toLowerCase() || '';
            if (!currentView.includes('pacientes')) {
                switchView('pacientes');
            }

            // Wait for DOM update and set the value in the patients view search bar
            setTimeout(() => {
                const patientSearch = document.getElementById('patient-search');
                if (patientSearch) {
                    patientSearch.value = term;
                    // Focus the search bar to show the user where it is
                    patientSearch.focus();
                    // Trigger the search logic in patients_v2
                    patientSearch.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, 100);
        }
    });
}

// Global dispatcher for easy access from components
window.dispatchView = (view) => switchView(view);
window.openAjustesModal = () => {
    if (window.checkAdminAccess()) {
        openAjustesModal();
    } else {
        alert('Acceso restringido: Solo el Administrador puede editar el tarifario.');
    }
};

/**
 * ── LÓGICA DE PERMISOS (MULTI-LOCK SUPER-ADMIN) ──
 * Implementado por Antigravity para Dra. Lucía Quintero.
 */
async function initializeUser() {
    try {
        // 1. Prioridad: Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();

        let userName = "Invitado";
        let userRole = "ODONTOLOGO"; // Default role

        if (user) {
            userName = user.user_metadata?.full_name || user.email;
        } else {
            // 2. Persistencia en sessionStorage (como pidió DANTE)
            const storedUser = sessionStorage.getItem('sach_logged_user');
            if (storedUser) {
                userName = storedUser;
            } else {
                // Si no hay usuario, mostrar el Selector de Perfil (Login Neo-Medical)
                return showLoginOverlay();
            }
        }

        // 3. Validación de Rango "ADMINISTRADOR" (Super-Admin)
        // Se asigna Full Access si es Lucía o ADMINISTRADORSACH
        const superAdmins = ["DRA. LUCIA QUINTERO", "ADMINISTRADORSACH", "LUCIA QUINTERO"];
        if (superAdmins.includes(userName.toUpperCase())) {
            userRole = "ADMINISTRADOR";
        }

        // 4. Actualizar UI
        const nameEl = document.getElementById('sidebar-user-name');
        if (nameEl) nameEl.textContent = userName;

        const roleEl = document.getElementById('sidebar-user-role');
        if (roleEl) roleEl.textContent = (userRole === "ADMINISTRADOR") ? "Super-Admin" : "Especialista";

        const avatarEl = document.getElementById('sidebar-user-avatar');
        if (avatarEl) {
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=00BFA6&color=fff`;
        }

        // 5. Guardar en session para herencia en otros módulos
        sessionStorage.setItem('sach_user_role', userRole);
        console.log(`[SACH] Sesión iniciada: ${userName} (${userRole})`);

    } catch (err) {
        console.error('[SACH] Error inicializando usuario:', err);
    }
}

window.checkAdminAccess = () => {
    const role = sessionStorage.getItem('sach_user_role');
    const user = sessionStorage.getItem('sach_logged_user');
    const superAdmins = ["DRA. LUCIA QUINTERO", "ADMINISTRADORSACH", "LUCIA QUINTERO"];

    return role === "ADMINISTRADOR" || superAdmins.includes(user?.toUpperCase());
};

window.setSachUser = (name) => {
    sessionStorage.setItem('sach_logged_user', name);
    location.reload();
};

window.loginUserPrompt = (name, pass) => {
    const input = prompt(`Contraseña para ${name}:`);
    if (input === pass) {
        window.setSachUser(name);
    } else if (input !== null) {
        alert('Contraseña incorrecta.');
    }
};

window.openNewUserModal = () => {
    alert('Función de Registro de Usuario: Se configurará en Supabase Auth próximamente.');
};

window.logout = async () => {
    const confirmed = confirm('¿Desea cerrar su sesión en S.A.C.H?');
    if (!confirmed) return;

    sessionStorage.removeItem('sach_logged_user');
    sessionStorage.removeItem('sach_user_role');

    // Si hay sesión de Supabase, cerrarla también
    await supabase.auth.signOut();

    location.reload();
};

/**
 * ── LOGIN OVERLAY (NEO-MEDICAL UX) ──
 * Selector de perfiles dinámico basado en la tabla ODONTOLOGOS.
 */
async function showLoginOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.className = 'fixed inset-0 z-[20000] bg-[#0f172a] flex items-center justify-center p-6';

    // UI Inicial de carga
    overlay.innerHTML = `
        <div class="text-center animate-pulse">
            <img src="./img/jvcreative.png" class="h-14 mx-auto mb-6 brightness-0 invert opacity-50">
            <p class="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Iniciando Protocolo Neo-Medical...</p>
        </div>`;
    document.body.innerHTML = '';
    document.body.appendChild(overlay);

    // 1. Obtener colaboradores reales de la BD
    const { data: colaboradores, error } = await supabase.from('ODONTOLOGOS').select('*').order('ODONTOLOGO');

    if (error || !colaboradores) {
        overlay.innerHTML = `<p class="text-red-500 font-bold">Error de conexión: ${error?.message || 'No se pudieron cargar los perfiles'}</p>`;
        return;
    }

    // 2. Renderizar el selector dinámico
    overlay.innerHTML = `
        <div class="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-700">
            <div class="text-center mb-10">
                <img src="./img/jvcreative.png" class="h-12 mx-auto mb-6 brightness-0 invert opacity-90 transition-all hover:scale-105">
                <h1 class="text-white font-display font-extrabold text-2xl tracking-tight mb-2">S.A.C.H <span class="text-accent underline decoration-primary/30 decoration-4 underline-offset-8">Neo-Medical</span></h1>
                <p class="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">Sistema de Administración Clínica Híbrida</p>
            </div>

            <div class="bg-white rounded-[40px] shadow-2xl p-10 border border-white/10 relative overflow-hidden">
                <div class="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
                <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>

                <div class="relative">
                    <h2 class="text-dark font-display font-extrabold text-lg text-center mb-6 tracking-tight">Acceso de Colaboradores</h2>
                    
                    <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        ${colaboradores.map(u => {
        const isAdmin = ["DRA. LUCIA QUINTERO", "ADMINISTRADORSACH"].includes(u.ODONTOLOGO?.toUpperCase());
        const colorClass = isAdmin ? 'bg-primary' : 'bg-slate-200';
        const roleLabel = isAdmin ? 'Control Total (Admin)' : 'Especialista / Staff';

        return `
                                <button onclick="window.loginUserPrompt('${u.ODONTOLOGO}', '${u.CLAVE}')" 
                                        class="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-white hover:shadow-xl rounded-2xl border border-black/0 hover:border-black/5 transition-all group text-left">
                                    <div class="w-12 h-12 rounded-xl ${colorClass} text-white flex items-center justify-center text-lg font-display font-bold shadow-soft group-hover:scale-110 transition-transform">
                                        ${u.ODONTOLOGO?.charAt(5) === '.' ? u.ODONTOLOGO.charAt(5) : u.ODONTOLOGO?.charAt(0)}
                                    </div>
                                    <div class="overflow-hidden">
                                        <p class="text-dark font-bold text-sm leading-tight truncate">${u.ODONTOLOGO}</p>
                                        <p class="${isAdmin ? 'text-accent' : 'text-slate-400'} text-[9px] font-black uppercase tracking-widest mt-0.5">${roleLabel}</p>
                                    </div>
                                </button>
                            `;
    }).join('')}
                    </div>

                    <p class="text-center text-slate-400 text-[8px] font-medium mt-8 uppercase tracking-widest">
                        Acceso Blindado por <span class="text-dark font-bold">JVCreative</span>
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.style.overflow = 'hidden';
}

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

// ════════════════════════════════════════════════
// BLINDAJE 1: AUTOSAVE — Prevención de pérdida de datos
// ════════════════════════════════════════════════

const AUTOSAVE_KEY = 'sach_autosave_draft';
const AUTOSAVE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 horas

function triggerAutosave() {
    const fields = [
        'nombre-paciente', 'cedula-paciente', 'fecha-nacimiento',
        'sexo-paciente', 'telefono-paciente', 'direccion-paciente',
        'celular-rep', 'resp-01', 'resp-02', 'resp-03', 'resp-04', 'resp-05'
    ];
    const draft = {};
    let hasData = false;
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value && el.value.trim()) {
            draft[id] = el.value;
            hasData = true;
        }
    });
    if (!hasData) return;
    draft._savedAt = Date.now();
    draft._patientName = document.getElementById('nombre-paciente')?.value || 'Paciente sin nombre';
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
}

function checkAutosaveRecovery() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        const age = Date.now() - (draft._savedAt || 0);
        if (age > AUTOSAVE_MAX_AGE_MS) { localStorage.removeItem(AUTOSAVE_KEY); return; }
        const savedTime = new Date(draft._savedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

        const banner = document.createElement('div');
        banner.id = 'sach-recovery-banner';
        banner.className = 'fixed top-0 inset-x-0 z-[20000] flex items-center justify-between gap-4 px-6 py-4 shadow-2xl';
        banner.style.background = 'linear-gradient(135deg, #0F4C5C, #0a3545)';
        banner.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-2xl">💾</span>
                <div>
                    <p class="text-white font-bold text-sm">Borrador sin guardar detectado</p>
                    <p class="text-white/60 text-[10px] font-medium">
                        Paciente: <strong class="text-accent">${draft._patientName}</strong>
                        &nbsp;·&nbsp; Guardado a las ${savedTime}
                    </p>
                </div>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button id="recovery-discard"
                        class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">
                    Descartar
                </button>
                <button id="recovery-restore"
                        class="px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg"
                        style="background:#39FF14; color:#0a1a00;">
                    ✓ Recuperar Datos
                </button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('recovery-discard').onclick = () => {
            localStorage.removeItem(AUTOSAVE_KEY);
            banner.style.opacity = '0'; banner.style.transition = 'opacity 0.3s';
            setTimeout(() => banner.remove(), 300);
        };
        document.getElementById('recovery-restore').onclick = () => {
            Object.entries(draft).forEach(([id, val]) => {
                if (id.startsWith('_')) return;
                const el = document.getElementById(id);
                if (el) el.value = val;
            });
            banner.style.opacity = '0'; banner.style.transition = 'opacity 0.3s';
            setTimeout(() => banner.remove(), 300);
            switchView('pacientes');
        };
    } catch (e) { localStorage.removeItem(AUTOSAVE_KEY); }
}

let _autosaveTimer = null;
document.addEventListener('input', (e) => {
    const watchIds = ['nombre-paciente', 'cedula-paciente', 'telefono-paciente',
        'resp-01', 'resp-02', 'resp-03', 'resp-04', 'resp-05'];
    if (watchIds.includes(e.target.id)) {
        clearTimeout(_autosaveTimer);
        _autosaveTimer = setTimeout(triggerAutosave, 8000);
    }
});
window.addEventListener('beforeunload', () => triggerAutosave());
window.clearAutosave = () => localStorage.removeItem(AUTOSAVE_KEY);

// ════════════════════════════════════════════════
// BLINDAJE 2: MONITOR DE RED — Modo Offline
// ════════════════════════════════════════════════

function setupNetworkMonitor() {
    const update = (isOnline) => {
        const statusEl = document.getElementById('online-status');
        document.getElementById('sach-offline-banner')?.remove();

        if (!isOnline) {
            if (statusEl) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"></span>Sin conexión`;
                statusEl.className = 'flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-soft text-xs font-bold text-red-500';
            }
            const banner = document.createElement('div');
            banner.id = 'sach-offline-banner';
            banner.className = 'fixed bottom-0 inset-x-0 z-[19000] px-6 py-4 flex items-center justify-between gap-4 shadow-2xl';
            banner.style.background = 'linear-gradient(135deg,#7f1d1d,#FF5F5F)';
            banner.innerHTML = `
                <div class="flex items-center gap-4">
                    <svg class="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M3 3l18 18" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <div>
                        <p class="text-white font-extrabold text-sm">Sin conexión a Internet</p>
                        <p class="text-white/80 text-[11px] font-medium">
                            Por favor, no cierres la ventana para no perder los cambios. El sistema recuperará la conexión automáticamente.
                        </p>
                    </div>
                </div>
                <div class="w-3 h-3 rounded-full bg-white/40 animate-pulse flex-shrink-0"></div>
            `;
            document.body.appendChild(banner);
            _setSaveButtonsDisabled(true);
        } else {
            if (statusEl) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-accent animate-pulse shadow-glow"></span>Connected`;
                statusEl.className = 'flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-soft text-xs font-bold text-accent';
            }
            _setSaveButtonsDisabled(false);
            _showReconnectToast();
        }
    };
    window.addEventListener('online', () => update(true));
    window.addEventListener('offline', () => update(false));
    if (!navigator.onLine) update(false);
}

function _setSaveButtonsDisabled(disabled) {
    ['button[onclick*="save"]', 'button[onclick*="Save"]', 'button[onclick*="guardar"]',
        'button[onclick*="update"]', '#ajustes-save-btn'].forEach(sel => {
            document.querySelectorAll(sel).forEach(btn => {
                btn.disabled = disabled;
                btn.style.opacity = disabled ? '0.4' : '';
                btn.title = disabled ? 'Sin conexión — espera...' : '';
            });
        });
}

function _showReconnectToast() {
    document.getElementById('sach-net-toast')?.remove();
    const t = document.createElement('div');
    t.id = 'sach-net-toast';
    t.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[20000] px-6 py-3 rounded-2xl shadow-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 text-white';
    t.style.background = 'linear-gradient(135deg,#0F4C5C,#00BFA6)';
    t.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" stroke-width="2" stroke-linecap="round"/></svg> Conexión restablecida`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; }, 3000);
    setTimeout(() => t.remove(), 3500);
}
