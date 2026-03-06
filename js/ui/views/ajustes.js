import { supabase } from '../../data/supabase-client.js';

/**
 * MÓDULO DE AJUSTES — TARIFARIO DE TRATAMIENTOS
 * JVCreative · Neo-Medical Edition
 * Implementado por Antigravity para Dra. Lucía Quintero.
 */

export function openAjustesModal() {
    // Evitar doble apertura
    if (document.getElementById('ajustes-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'ajustes-modal-overlay';
    overlay.className = 'fixed inset-0 z-[10500] flex items-center justify-center p-4 md:p-8';
    overlay.innerHTML = `
        <!-- Backdrop blur -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-md" onclick="window.closeAjustesModal()"></div>

        <!-- Modal Panel -->
        <div class="relative bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 fade-in duration-400 overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between px-8 py-6 border-b border-black/5 flex-shrink-0"
                 style="background: linear-gradient(135deg, #0F4C5C 0%, #0a3545 100%);">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center"
                         style="background:rgba(57,255,20,0.15);">
                        <svg class="w-6 h-6" fill="none" stroke="#39FF14" viewBox="0 0 24 24">
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-width="2"/>
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-white font-display font-extrabold text-xl tracking-tight">Configuración de Tratamientos y Precios</h2>
                        <p class="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">Tarifario Neo-Medical · JVCreative</p>
                    </div>
                </div>
                <button onclick="window.closeAjustesModal()"
                        class="w-10 h-10 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-xl flex items-center justify-center transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                </button>
            </div>

            <!-- Search bar & Tabs -->
            <div class="px-8 border-b border-black/5 flex-shrink-0 bg-slate-50/60">
                <div class="flex items-center justify-between py-4">
                    <div class="flex items-center gap-6">
                        <button onclick="window.switchAjustesTab('tarifario')" id="tab-tarifario" 
                                class="ajustes-tab active text-[10px] font-extrabold uppercase tracking-[0.2em] pb-2 border-b-2 border-primary text-primary transition-all">
                            Tarifario
                        </button>
                        <button onclick="window.switchAjustesTab('usuarios')" id="tab-usuarios" 
                                class="ajustes-tab text-[10px] font-extrabold uppercase tracking-[0.2em] pb-2 border-b-2 border-transparent text-slate-400 hover:text-dark transition-all">
                            Usuarios/Médicos
                        </button>
                    </div>
                    <div id="ajustes-search-container" class="relative w-64">
                        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2.5"/></svg>
                        <input id="ajustes-search" type="text" placeholder="Filtrar..." oninput="window.filterTratamientos(this.value)"
                               class="w-full pl-10 pr-4 py-2 text-[11px] font-bold bg-white border border-black/5 rounded-xl outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all text-dark placeholder:text-slate-300">
                    </div>
                </div>
            </div>

            <!-- Lista de tratamientos (scrollable) -->
            <div id="ajustes-list-container" class="flex-grow overflow-y-auto px-8 py-6 space-y-3 custom-scrollbar">
                <!-- Cargando... -->
                <div class="flex flex-col items-center justify-center py-16 opacity-40 gap-4">
                    <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cargando tarifario...</p>
                </div>
            </div>

            <!-- Footer con botón Guardar -->
            <div class="flex items-center justify-between px-8 py-5 border-t border-black/5 bg-slate-50/60 flex-shrink-0">
                <p id="ajustes-count" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">— tratamientos</p>
                <div class="flex gap-3">
                    <button onclick="window.closeAjustesModal()"
                            class="px-6 py-3 bg-white border border-black/5 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">
                        Cancelar
                    </button>
                    <button id="ajustes-save-btn" onclick="window.saveAllPrices()"
                            class="px-8 py-3 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                            style="background: linear-gradient(135deg,#0F4C5C,#00BFA6); box-shadow: 0 4px 20px rgba(0,191,166,0.35);">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" stroke-width="2.5"/>
                        </svg>
                        Actualizar Tarifario
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    loadTratamientos();
}

// ── Estado local del módulo ──
let _allTratamientos = [];

async function loadTratamientos() {
    const container = document.getElementById('ajustes-list-container');
    if (!container) return;

    const { data, error } = await supabase
        .from('TRATAMIENTOS')
        .select('id, TRATAMIENTO, VALOR, CATEGORIA')
        .order('TRATAMIENTO', { ascending: true });

    if (error) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 gap-4 text-red-400">
                <svg class="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-width="2"/></svg>
                <p class="text-[11px] font-bold uppercase tracking-widest">Error al cargar tratamientos</p>
                <p class="text-[10px] text-red-300">${error.message}</p>
            </div>`;
        return;
    }

    _allTratamientos = data || [];
    renderTratamientosList(_allTratamientos);
}

function renderTratamientosList(list) {
    const container = document.getElementById('ajustes-list-container');
    const countEl = document.getElementById('ajustes-count');
    if (!container) return;

    if (countEl) countEl.textContent = `${list.length} tratamiento${list.length !== 1 ? 's' : ''}`;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 opacity-30 gap-3">
                <svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-width="1.5"/></svg>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Sin resultados</p>
            </div>`;
        return;
    }

    // Agrupar por categoría
    const grouped = {};
    list.forEach(t => {
        const cat = t.CATEGORIA || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(t);
    });

    container.innerHTML = Object.entries(grouped).map(([cat, items]) => `
        <div class="mb-6">
            <!-- Separador de categoría -->
            <div class="flex items-center gap-3 mb-3">
                <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">${cat}</span>
                <div class="flex-grow h-px bg-slate-100"></div>
                <span class="text-[9px] font-bold text-slate-300">${items.length}</span>
            </div>
            <!-- Filas de tratamientos -->
            <div class="space-y-2">
                ${items.map(t => `
                    <div class="tratamiento-row flex items-center gap-4 bg-slate-50 hover:bg-white border border-black/0 hover:border-black/5
                                hover:shadow-sm rounded-2xl px-5 py-3.5 transition-all group"
                         data-id="${t.id}">
                        <!-- Indicador de color -->
                        <div class="w-2 h-2 rounded-full bg-primary/30 group-hover:bg-accent flex-shrink-0 transition-colors"></div>

                        <!-- Nombre del tratamiento -->
                        <p class="flex-grow text-sm font-bold text-dark truncate"
                           title="${t.TRATAMIENTO}">${t.TRATAMIENTO}</p>

                        <!-- Input de precio -->
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <span class="text-slate-400 font-bold text-sm">$</span>
                            <input type="number"
                                   id="price-input-${t.id}"
                                   class="price-input w-28 text-right text-base font-extrabold text-dark bg-white border border-black/5
                                          rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                                          tabular-nums transition-all hover:border-accent/40 appearance-none"
                                   value="${parseFloat(t.VALOR || 0).toFixed(2)}"
                                   min="0" step="0.01"
                                   oninput="window.markPriceChanged(this)"
                                   data-original="${parseFloat(t.VALOR || 0).toFixed(2)}"
                                   data-id="${t.id}">
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ── Filtrado en tiempo real ──
window.filterTratamientos = (term) => {
    const filtered = term.trim() === ''
        ? _allTratamientos
        : _allTratamientos.filter(t =>
            t.TRATAMIENTO?.toLowerCase().includes(term.toLowerCase()) ||
            t.CATEGORIA?.toLowerCase().includes(term.toLowerCase())
        );
    renderTratamientosList(filtered);
};

// ── Marcar cambio visual en el input ──
window.markPriceChanged = (input) => {
    const original = parseFloat(input.dataset.original || '0');
    const current = parseFloat(input.value || '0');
    if (current !== original) {
        input.style.color = '#00BFA6';
        input.style.borderColor = '#00BFA6';
    } else {
        input.style.color = '';
        input.style.borderColor = '';
    }
    // Validar: solo positivos
    if (current < 0 || isNaN(current)) {
        input.style.borderColor = '#FF5F5F';
        input.style.color = '#FF5F5F';
    }
};

// ── Guardar TODOS los precios modificados ──
window.saveAllPrices = async () => {
    const btn = document.getElementById('ajustes-save-btn');
    const inputs = document.querySelectorAll('.price-input');
    if (!inputs.length) return;

    // Recopilar cambios: solo los que difieren del original
    const changes = [];
    let hasError = false;

    inputs.forEach(input => {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) {
            input.style.borderColor = '#FF5F5F';
            hasError = true;
            return;
        }
        const original = parseFloat(input.dataset.original || '0');
        if (val !== original) {
            changes.push({ id: input.dataset.id, price: val });
        }
    });

    if (hasError) {
        showAjustesToast('error', 'Corrige los precios marcados en rojo antes de guardar.');
        return;
    }

    if (changes.length === 0) {
        showAjustesToast('info', 'No se detectaron cambios en el tarifario.');
        return;
    }

    // UI: estado de carga
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Guardando...`;
    }

    try {
        // UPDATE individual por fila modificada (Supabase no soporta upsert masivo con IDs distintos en un solo call sin PK)
        const results = await Promise.all(
            changes.map(({ id, price }) =>
                supabase
                    .from('TRATAMIENTOS')
                    .update({ VALOR: price })
                    .eq('id', id)
            )
        );

        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            throw new Error(`${errors.length} registro(s) no pudieron actualizarse.`);
        }

        // Actualizar data-original en inputs para que próximos cambios sean relativos
        inputs.forEach(input => {
            const val = parseFloat(input.value);
            input.dataset.original = val.toFixed(2);
            input.style.color = '';
            input.style.borderColor = '';
        });

        // También actualizar _allTratamientos local (para que el odontograma lo use si recarga)
        changes.forEach(({ id, price }) => {
            const t = _allTratamientos.find(x => String(x.id) === String(id));
            if (t) t.VALOR = price;
        });

        showAjustesToast('success',
            `Tarifario actualizado correctamente. Los cambios se reflejarán en los nuevos presupuestos.`,
            changes.length);

    } catch (err) {
        console.error('[SACH] Error guardando tarifario:', err);
        showAjustesToast('error', err.message || 'Error al guardar. Revisa la consola.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" stroke-width="2.5"/></svg>
                Actualizar Tarifario`;
        }
    }
};

window.switchAjustesTab = (tab) => {
    const tabs = document.querySelectorAll('.ajustes-tab');
    tabs.forEach(t => {
        t.classList.remove('active', 'text-primary', 'border-primary');
        t.classList.add('text-slate-400', 'border-transparent');
    });

    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.add('active', 'text-primary', 'border-primary');
        activeTab.classList.remove('text-slate-400', 'border-transparent');
    }

    const container = document.getElementById('ajustes-list-container');
    const searchContainer = document.getElementById('ajustes-search-container');
    const saveBtn = document.getElementById('ajustes-save-btn');

    if (tab === 'tarifario') {
        if (searchContainer) searchContainer.style.display = 'block';
        if (saveBtn) {
            saveBtn.style.display = 'flex';
            saveBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" stroke-width="2.5"/></svg>
                Actualizar Tarifario`;
        }
        loadAjustesTratamientos();
    } else if (tab === 'usuarios') {
        if (searchContainer) searchContainer.style.display = 'none';
        if (saveBtn) {
            saveBtn.style.display = 'flex';
            saveBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke-width="2.5"/></svg>
                Nuevo Usuario`;
            saveBtn.onclick = () => window.openNewUserModal();
        }
        loadAjustesUsuarios();
    }
};

async function loadAjustesUsuarios() {
    const container = document.getElementById('ajustes-list-container');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 gap-4">
            <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando médicos...</p>
        </div>`;

    const { data, error } = await supabase.from('ODONTOLOGOS').select('*').order('ODONTOLOGO');

    if (error) {
        container.innerHTML = `<p class="text-red-500 text-center font-bold">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 opacity-30 gap-3">
                <svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" stroke-width="1.5"/></svg>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No hay usuarios registrados</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 gap-4">
            ${data.map(u => `
                <div class="bg-slate-50 rounded-2xl p-5 border border-black/5 flex items-center justify-between group hover:bg-white transition-all">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                            ${u.ODONTOLOGO?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h4 class="font-bold text-dark text-sm">${u.ODONTOLOGO}</h4>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${u.ESPECIALIDAD || 'General'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.editUserPassword('${u.id}')" class="p-2 bg-white text-slate-400 hover:text-primary rounded-lg shadow-sm border border-black/5 transition-all" title="Cambiar Clave">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

window.openNewUserModal = () => {
    alert('Función de Registro de Usuario: Se integrará con el flujo de Supabase Auth en la próxima fase.');
};

window.editUserPassword = (id) => {
    const newPass = prompt('Ingrese la nueva clave para el odontólogo:');
    if (newPass) {
        alert('Clave actualizada correctamente (Simulado).');
    }
};

window.closeAjustesModal = () => {
    const overlay = document.getElementById('ajustes-modal-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';
    setTimeout(() => overlay.remove(), 300);
};

function showAjustesToast(type, message, count = 0) {
    // Quitar toast anterior si existe
    document.getElementById('ajustes-toast')?.remove();

    const colors = {
        success: 'linear-gradient(135deg,#0F4C5C,#00BFA6)',
        error: 'linear-gradient(135deg,#7f1d1d,#FF5F5F)',
        info: 'linear-gradient(135deg,#1e293b,#475569)',
    };
    const icons = {
        success: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3"/></svg>`,
        error: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>`,
        info: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/></svg>`,
    };

    const countBadge = type === 'success' && count > 0
        ? `<span class="ml-2 px-2 py-0.5 bg-white/20 rounded-lg text-[9px] font-extrabold">${count} cambio${count !== 1 ? 's' : ''}</span>`
        : '';

    const toast = document.createElement('div');
    toast.id = 'ajustes-toast';
    toast.className = 'fixed bottom-8 right-8 z-[15000] text-white px-6 py-4 rounded-2xl shadow-2xl text-[11px] font-bold uppercase tracking-widest animate-in slide-in-from-bottom-4 duration-500 flex items-center gap-3 max-w-sm';
    toast.style.background = colors[type];
    toast.innerHTML = `${icons[type]} <span>${message}${countBadge}</span>`;
    document.body.appendChild(toast);

    // JVCreative brand seal
    const seal = document.createElement('div');
    seal.className = 'absolute -bottom-1 right-4 text-[7px] font-extrabold text-white/30 uppercase tracking-[0.2em]';
    seal.textContent = 'JVCreative';
    toast.style.position = 'fixed';
    toast.appendChild(seal);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s';
    }, 4500);
    setTimeout(() => toast.remove(), 5000);
}
