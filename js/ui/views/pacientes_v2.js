/**
 * Pacientes Module
 * Neo-Medical Style Implementation
 */
import { Odontogram } from '../components/odontogram.js';
import { supabase } from '../../data/supabase-client.js';
import { sanitizarCelularEcuador, generarMensajeBienvenidaPremium } from '../components/recordatorios.js';

let currentPatients = [];
let currentFilter = 'all';
let currentPage = 1;
const PATIENTS_PER_PAGE = 15;

export async function renderPacientesView(container) {
    if (!window._pacientesSubscription) {
        window._pacientesSubscription = supabase.channel('custom-pacientes-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'PACIENTES' }, () => {
                if (document.getElementById('patients-list-body')) {
                    const termo = document.getElementById('patient-search')?.value || '';
                    if (termo === '') {
                        currentPatients = []; // force reload
                    }
                    loadPatients(termo);
                }
            }).subscribe();
    }

    container.innerHTML = `
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl md:text-3xl font-display font-extrabold text-dark tracking-tight">Gestión de Pacientes</h2>
                    <p class="text-secondary text-sm font-medium mt-1">Directorio médico centralizado</p>
                </div>
                <button id="btn-nuevo-paciente" onclick="window.openNewPatientModal()" class="sach-button variant-set bg-accent shadow-glow flex items-center gap-2 group">
                    <div class="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="3" stroke-linecap="round"/></svg>
                    </div>
                    Registrar
                </button>
            </div>

            <!-- Filtros rápidos y Search -->
            <div class="flex flex-col lg:flex-row gap-4">
                <!-- Filtros -->
                <div class="flex bg-white rounded-xl shadow-soft p-1 gap-1 overflow-x-auto">
                    <button onclick="window.setPatientFilter('all')" class="filter-btn px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap" data-filter="all">Todos</button>
                    <button onclick="window.setPatientFilter('child')" class="filter-btn px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap" data-filter="child">Niños</button>
                    <button onclick="window.setPatientFilter('adult')" class="filter-btn px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap" data-filter="adult">Adultos</button>
                    <button onclick="window.setPatientFilter('new')" class="filter-btn px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap" data-filter="new">Nuevos</button>
                </div>
                
                <!-- Search Bar -->
                <div class="bg-white p-4 rounded-xl shadow-soft flex items-center gap-3 flex-grow">
                    <div class="relative flex-grow">
                        <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2.5"/></svg>
                        </span>
                        <input type="text" id="patient-search" placeholder="Buscar por nombre o cédula..." class="sach-input !bg-slate-50 border-none !pl-12 !h-10 text-sm focus:!bg-white focus:!ring-0">
                    </div>
                    <span id="patient-count" class="text-xs font-bold text-slate-400 whitespace-nowrap bg-slate-50 px-3 py-1.5 rounded-lg">0 pacientes</span>
                </div>
            </div>

            <!-- Patient List Table -->
            <div class="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                                <th class="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Paciente</th>
                                <th class="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Edad</th>
                                <th class="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                                <th class="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                                <th class="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="patients-list-body" class="divide-y divide-slate-50">
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
                </div>
                
                <!-- Paginación -->
                <div id="patients-pagination" class="px-4 py-3 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                    <button id="prev-page" onclick="window.changePage(-1)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-sm text-slate-500 hover:text-primary disabled:opacity-50" disabled>Anterior</button>
                    <span id="page-info" class="text-xs font-bold text-slate-400">Página 1</span>
                    <button id="next-page" onclick="window.changePage(1)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-sm text-slate-500 hover:text-primary disabled:opacity-50" disabled>Siguiente</button>
                </div>
            </div>
        </div>

        <!-- Global Patient Modal (Used for Detail and Form) -->
        <div id="patient-modal" class="sach-modal-backdrop opacity-0 pointer-events-none transition-all duration-300">
            <div class="sach-modal w-full max-w-2xl transform scale-95 transition-all duration-300" id="patient-modal-container">
                <!-- Content -->
            </div>
        </div>
    `;

    loadPatients();
    
    window.setPatientFilter = (filter) => {
        currentFilter = filter;
        currentPage = 1;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('text-slate-500', 'hover:bg-slate-100');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('bg-primary', 'text-white');
        document.querySelector(`[data-filter="${filter}"]`).classList.remove('text-slate-500', 'hover:bg-slate-100');
        loadPatients(document.getElementById('patient-search')?.value || '');
    };
    
    window.changePage = (delta) => {
        currentPage += delta;
        loadPatients(document.getElementById('patient-search')?.value || '');
    };
    
    document.querySelector('[data-filter="all"]').classList.add('bg-primary', 'text-white');
    document.querySelector('[data-filter="all"]').classList.remove('text-slate-500', 'hover:bg-slate-100');
}

async function loadPatients(query = '') {
    const listBody = document.getElementById('patients-list-body');
    if (!listBody) return;
    
    listBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center"><span class="text-slate-400 font-medium animate-pulse">Cargando pacientes...</span></td></tr>`;

    if (!currentPatients.length) {
        const { data, error } = await supabase.from('PACIENTES').select('*').order('created_at', { ascending: false });
        if (error) {
            listBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-400 font-medium">Error: ${error.message}</td></tr>`;
            return;
        }
        currentPatients = data || [];
    }

    let filtered = currentPatients.filter(p =>
        p['NOMBRE DEL PACIENTE']?.toLowerCase().includes(query.toLowerCase()) ||
        p['ID DEL PACIENTE']?.toString().includes(query)
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    filtered = filtered.filter(p => {
        const edad = parseInt(p['EDAD']) || 0;
        const created = new Date(p.created_at);
        
        if (currentFilter === 'child') return edad > 0 && edad < 18;
        if (currentFilter === 'adult') return edad >= 18;
        if (currentFilter === 'new') return created >= thirtyDaysAgo;
        return true;
    });

    const countEl = document.getElementById('patient-count');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    const totalPages = Math.ceil(filtered.length / PATIENTS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) currentPage = 1;
    const start = (currentPage - 1) * PATIENTS_PER_PAGE;
    const paginated = filtered.slice(start, start + PATIENTS_PER_PAGE);

    if (countEl) countEl.textContent = `${filtered.length} pacientes`;
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => window.changePage(-1);
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = () => window.changePage(1);
    }
    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;

    if (paginated.length === 0) {
        listBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 font-medium">No se encontraron pacientes.</td></tr>`;
        return;
    }

    const rows = await Promise.all(paginated.map(async p => {
        const edad = parseInt(p['EDAD']) || 0;
        const isChild = edad > 0 && edad < 18;
        const isAdult = edad >= 18;
        
        const bgClass = isChild ? 'bg-purple-50/50 hover:bg-purple-50' : isAdult ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50';
        const badgeClass = isChild ? 'bg-purple-100 text-purple-700' : isAdult ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';
        const label = isChild ? 'Niño' : isAdult ? 'Adulto' : 'Sin edad';

        return `
        <tr class="${bgClass} transition-colors border-l-2 ${isChild ? 'border-purple-300' : isAdult ? 'border-blue-300' : 'border-slate-200'}">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${isChild ? 'bg-purple-100 text-purple-600' : 'bg-primary/10 text-primary'} flex items-center justify-center text-xs font-bold flex-shrink-0">
                        ${p['NOMBRE DEL PACIENTE']?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div class="font-bold text-dark text-sm">${p['NOMBRE DEL PACIENTE']}</div>
                        <div class="text-[9px] font-medium text-slate-400">${p['ID DEL PACIENTE']}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3">
                <span class="text-sm font-semibold ${isChild ? 'text-purple-600' : 'text-slate-600'}">${p['EDAD'] || '-'} <span class="text-xs font-normal">años</span></span>
            </td>
            <td class="px-4 py-3">
                <div class="text-sm font-medium text-slate-600">${p['CELULAR DEL PACIENTE'] || '-'}</div>
                <div class="text-[10px] text-slate-400">${p['CORREO'] || 'Sin correo'}</div>
            </td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide ${badgeClass}">${label}</span>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="window.openAptFromPatient('${p.id}')" class="sach-button variant-set bg-primary !h-8 !px-3 text-[9px] font-bold shadow-sm">
                        Agendar
                    </button>
                    <button onclick="window.viewPatientDetail('${p.id}')" class="sach-button variant-unset !h-8 !px-3 text-[9px] font-bold hover:!text-primary">
                        Expediente
                    </button>
                    ${p['CELULAR DEL PACIENTE'] ? `
                    <button onclick="window.open('https://wa.me/${sanitizarCelularEcuador(p['CELULAR DEL PACIENTE'])}', '_blank')" class="sach-button !h-8 !px-2 bg-[#25D366] hover:bg-[#1DA851] flex items-center justify-center text-white shadow-sm" title="WhatsApp">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 737.509 740.824">
                            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"/>
                        </svg>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }));
    
    listBody.innerHTML = rows.join('');
}

window.viewPatientDetail = async (id) => {
    sessionStorage.setItem('last_selected_patient_id', id);
    const p = currentPatients.find(patient => patient.id == id);
    if (!p) { console.error('Paciente no encontrado:', id); return; }

    const modal = document.getElementById('patient-modal');
    const content = document.getElementById('patient-modal-container');

    modal.classList.replace('opacity-0', 'opacity-100');
    modal.classList.remove('pointer-events-none');
    content.classList.replace('scale-95', 'scale-100');
    content.classList.replace('max-w-2xl', 'max-w-4xl'); // Wider for clinical view

    const nombre = p['NOMBRE DEL PACIENTE'] || 'Paciente';
    const celular = p['CELULAR DEL PACIENTE'] || '';
    const celularLimpio = sanitizarCelularEcuador(celular);

    // Mapping conceptual Dante names to physical Supabase names for safety
    const currentOdont = p['odontograma_json'] || {};

    content.innerHTML = `
        <div class="flex justify-between items-start mb-5 border-b border-black/5 pb-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-display font-bold shadow-soft">
                    ${nombre.charAt(0)}
                </div>
                <div>
                    <h3 class="text-xl font-display font-extrabold text-dark tracking-tight leading-tight">${nombre}</h3>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        ID: ${p['ID DEL PACIENTE'] || '-'} <span class="mx-1">|</span> 
                        ${p['EDAD'] || '?'} Años <span class="mx-1">|</span> 
                        ${p['SEXO'] || ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                 ${celular ? `
                    <a href="https://wa.me/${celularLimpio}" target="_blank" class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-200 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-width="2"/></svg>
                    </a>` : ''}
                <button onclick="window.closePatientModal()" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                </button>
            </div>
        </div>

        <div class="flex items-center justify-between border-b border-black/5 mb-5">
            <div class="flex items-center gap-2">
                <button onclick="window.switchPatientTab('odontograma')" class="tab-btn active px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-primary border-b-2 border-primary transition-all">Odontograma</button>
                <button onclick="window.switchPatientTab('presupuesto')" class="tab-btn px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b-2 border-transparent hover:text-primary transition-all">Presupuesto</button>
                <button onclick="window.switchPatientTab('historia')" class="tab-btn px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b-2 border-transparent hover:text-primary transition-all">Historia</button>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.printClinicalRecord('${p.id}')" class="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" stroke-width="2"/></svg>
                    Imprimir 
                </button>
            </div>
        </div>

        <!-- Tabs Content -->
        <div id="patient-tabs-root" class="min-h-[300px] max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
            <!-- Content loaded dynamically -->
        </div>

        <!-- Footer Actions -->
        <div class="flex gap-3 pt-6 border-t border-black/5 mt-6">
            <button onclick="window.openNewPatientModal('${p.id}')" class="sach-button variant-set bg-primary w-full !h-10 shadow-soft">Editar Datos</button>
            ${window.checkAdminAccess() ? `
                <button onclick="window.eliminarPaciente('${p.id}')" class="sach-button variant-unset w-full !h-10 border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">Eliminar</button>
            ` : ''}
            <button onclick="window.closePatientModal()" class="sach-button variant-unset w-full !h-10 border-none bg-slate-50 text-slate-500">Cerrar</button>
        </div>
    `;

    // ── STATE MANAGER: FUNCIÓN GLOBAL DE ACTUALIZACIÓN ────────────────────
    window.renderizarModuloClinico = (pId, tab = window._currentTab || 'odontograma') => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        window._currentTab = tab;
        const btns = document.querySelectorAll('.tab-btn');
        btns.forEach(btn => {
            btn.classList.remove('active', 'text-primary', 'border-primary');
            btn.classList.add('text-slate-400', 'border-transparent');
            if (btn.innerText.toLowerCase().includes(tab.charAt(0))) {
                btn.classList.add('active', 'text-primary', 'border-primary');
                btn.classList.remove('text-slate-400', 'border-transparent');
            }
        });

        const root = document.getElementById('patient-tabs-root');
        if (!root) return;

        // Garantizar que presupuesto_json sea un objeto con la estructura correcta (MULTI-PRESUPUESTO)
        let budgetData = p['presupuesto_json'];
        
        // Compatible con formato antiguo: { items: [], abonos: [] }
        if (!budgetData || typeof budgetData !== 'object') {
            budgetData = { presupuestos: [], presupuesto_activo: null };
        }
        
        // Si tiene formato antiguo (items y abonos sueltos), migrar a nuevo formato
        if (budgetData.items && !budgetData.presupuestos) {
            const presupuesto1 = {
                id: 'presupuesto_1',
                nombre: 'Plan de Tratamiento inicial',
                fecha_creacion: new Date().toISOString(),
                items: budgetData.items || [],
                abonos: budgetData.abonos || []
            };
            budgetData = {
                presupuestos: [presupuesto1],
                presupuesto_activo: 'presupuesto_1'
            };
        }
        
        // Si no hay presupuestos, crear el primero
        if (!budgetData.presupuestos || budgetData.presupuestos.length === 0) {
            const presupuesto1 = {
                id: 'presupuesto_1',
                nombre: 'Plan de Tratamiento inicial',
                fecha_creacion: new Date().toISOString(),
                items: [],
                abonos: []
            };
            budgetData = {
                presupuestos: [presupuesto1],
                presupuesto_activo: 'presupuesto_1'
            };
        }
        
        // Asegurar que presupuesto_activo existe
        if (!budgetData.presupuesto_activo && budgetData.presupuestos.length > 0) {
            budgetData.presupuesto_activo = budgetData.presupuestos[0].id;
        }

        const odontData = p['odontograma_json'] || {};
        const historyData = p['plan_tratamiento_json'] || [];

        if (tab === 'odontograma') {
            root.innerHTML = `
                <div id="odont-clinical-root"></div>
                <!-- Módulo de Archivo Visual (Rx/Panorámicas) -->
                <div id="visual-archive-root" class="mt-4 pt-4 border-t border-black/5"></div>
            `;
            const odont = new Odontogram('odont-clinical-root', odontData, async (data) => {
                p.odontograma_json = data;
                // PERSIST: We don't wait for DB to update UI
                supabase.from('PACIENTES').update({ 'odontograma_json': data }).eq('id', p.id).then(() => { });
            }, p);

            // Inyectar objeto para sincronización (Reflejo Clínico Dante)
            window._odontInstance = odont;

            odont.render();

            // Renderizar el Archivo Visual debajo del odontograma
            renderVisualArchive(document.getElementById('visual-archive-root'), p);
        } else if (tab === 'presupuesto') {
            renderBudgetTab(root, p, budgetData);
        } else if (tab === 'historia') {
            renderHistoryTab(root, p, historyData);
        }
    };

    window.refreshPatientTab = (tab) => window.renderizarModuloClinico(id, tab);
    window.switchPatientTab = (tab) => window.renderizarModuloClinico(id, tab);

    // Initial tab render
    window.renderizarModuloClinico(id, 'odontograma');
};

// Helper compartido para recalcular totales (Requerimiento Dante)
function calcularTotalesPresupuesto(budgetObj) {
    const items = budgetObj.items || [];
    const abonos = budgetObj.abonos || [];

    const totalTratamiento = items.reduce((acc, item) => acc + (parseFloat(item.costo) || 0), 0);
    const totalAbonado = abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);
    const saldoPendiente = totalTratamiento - totalAbonado;

    return { totalTratamiento, totalAbonado, saldoPendiente };
}

async function renderBudgetTab(root, p, budgetData) {
    // Obtener presupuesto activo
    const presupuestoActivo = budgetData.presupuestos?.find(bp => bp.id === budgetData.presupuesto_activo) || budgetData.presupuestos?.[0];
    
    const items = presupuestoActivo?.items || [];
    const abonos = presupuestoActivo?.abonos || [];

    // Guardar referencia global para funciones auxiliares
    window._currentBudgetData = budgetData;
    window._currentPresupuestoId = presupuestoActivo?.id;
    
    let { data: rawCatalog } = await supabase.from('TRATAMIENTOS').select('*');

    let catalog = (rawCatalog || []).map(item => ({
        nombre: item.TRATAMIENTO || item.tratamiento || item.nombre || 'Sin Nombre',
        costo: parseFloat(item.VALOR || item.valor || item.costo || 0),
        categoria: item.CATEGORIA || item.categoria || 'AMBOS'
    }));

    const fallbackCatalog = [
        { nombre: 'Profilaxis Dental Adulto', costo: 35.0, categoria: 'ADULTO' },
        { nombre: 'Profilaxis Dental Niño', costo: 25.0, categoria: 'NIÑO' },
        { nombre: 'Consultoría Especializada', costo: 40.0, categoria: 'AMBOS' },
        { nombre: 'Resina Estética Simple', costo: 45.0, categoria: 'ADULTO' }
    ];

    if (catalog.length === 0) catalog = fallbackCatalog;

    const categoriaFiltro = (parseInt(p['EDAD']) < 17) ? 'NIÑO' : 'ADULTO';
    const filteredCatalog = catalog.filter(c => c.categoria === categoriaFiltro || c.categoria === 'AMBOS');

    const { totalTratamiento, totalAbonado, saldoPendiente } = calcularTotalesPresupuesto(presupuestoActivo || {});

    // Generar opciones del selector de presupuestos
    const presupuestoOptions = (budgetData.presupuestos || []).map((bp, idx) => {
        const fechaFormateada = bp.fecha_creacion ? new Date(bp.fecha_creacion).toLocaleDateString('es-EC') : 'Sin fecha';
        const nombreMostrar = bp.nombre || `Presupuesto ${idx + 1}`;
        const isActive = bp.id === budgetData.presupuesto_activo;
        return `<option value="${bp.id}" ${isActive ? 'selected' : ''}>${nombreMostrar} - ${fechaFormateada}</option>`;
    }).join('');

    root.innerHTML = `
        <!-- Selector de Presupuestos -->
        <div class="bg-white rounded-card border border-black/5 p-3 mb-4">
            <div class="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div class="flex items-center gap-3 flex-grow">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2"/></svg>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plan:</span>
                    </div>
                    <select id="presupuesto-selector" onchange="window.cambiarPresupuesto('${p.id}', this.value)" class="sach-input bg-slate-50 border-none font-bold text-xs max-w-xs">
                        ${presupuestoOptions}
                    </select>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.crearNuevoPresupuesto('${p.id}')" class="px-3 py-1.5 bg-accent text-white rounded-lg text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 hover:bg-accent/90 transition-all shadow-soft">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="2"/></svg>
                        Nuevo
                    </button>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 space-y-4">
                <!-- Resumen Financiero -->
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-slate-50 p-3 rounded-xl border border-black/5">
                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                        <p class="text-lg font-display font-bold text-primary" id="total-presupuesto-val">$${totalTratamiento.toFixed(2)}</p>
                    </div>
                    <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <p class="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Abonado</p>
                        <p class="text-lg font-display font-bold text-emerald-600" id="total-abonado-val">$${totalAbonado.toFixed(2)}</p>
                    </div>
                    <div class="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <p class="text-[8px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Pendiente</p>
                        <p class="text-lg font-display font-bold text-orange-600" id="saldo-pendiente-val">$${saldoPendiente.toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-card border border-black/5 overflow-hidden">
                    <div class="px-4 py-3 bg-slate-50/50 border-b border-black/5 flex justify-between items-center gap-3 flex-wrap">
                        <h4 class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Procedimientos</h4>
                        <div class="flex gap-2">
                            <button onclick="window.mostrarCatalogoServicios('${p.id}')" id="btn-add-manual" class="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 hover:bg-amber-200 transition-all shadow-soft">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="2"/></svg>
                                Añadir
                            </button>
                            <button onclick="window.saveCurrentBudget('${p.id}')" id="btn-save-budget" class="px-3 py-1.5 bg-primary text-white rounded-lg text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-soft group">
                                <span class="w-5 h-5 bg-white/20 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round"/></svg>
                                </span>
                                Guardar
                            </button>
                        </div>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50">
                            <tr>
                                <th class="px-4 py-2.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Diente</th>
                                <th class="px-4 py-2.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Procedimiento</th>
                                <th class="px-4 py-2.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">Costo</th>
                                <th class="px-4 py-2.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right"></th>
                            </tr>
                        </thead>
                        <tbody id="budget-body" class="divide-y divide-slate-50">
                            ${items.length === 0 ? `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sin procedimientos</td></tr>` :
            items.map((item, idx) => `
                                <tr>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 bg-primary/5 text-primary rounded text-[10px] font-bold">${item.diente || '--'}</span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-dark text-sm">${item.nombre}</div>
                                        <div class="text-[9px] font-bold text-emerald-500 uppercase">${item.estado || 'Pendiente'}</div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <span class="text-[10px] font-bold text-slate-400">$</span>
                                            <input type="number" step="0.01" value="${item.costo}" 
                                                oninput="window.updateBudgetPrice(${idx}, this.value, '${p.id}')"
                                                class="w-20 bg-slate-50 border border-black/5 rounded-lg px-2 py-1 text-right font-bold text-slate-600 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                                            >
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <button type="button" onclick="window.removeFromBudget(${idx}, '${p.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Sección de Abonos / Historial de Pagos -->
                <div class="bg-white rounded-card border border-black/5 overflow-hidden">
                    <div class="px-4 py-3 bg-slate-50/50 border-b border-black/5 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                             <h4 class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pagos</h4>
                        </div>
                        <button onclick="window.promptAddAbono('${p.id}')" class="px-3 py-1.5 bg-[#40E0D0]/20 text-[#008080] rounded-lg text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 hover:bg-[#40E0D0]/40 transition-all group shadow-sm border border-[#40E0D0]/30 border-dashed">
                            <span class="w-5 h-5 bg-white rounded flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke-width="3" stroke-linecap="round"/></svg>
                            </span>
                            Abonar
                        </button>
                    </div>
                    <div class="p-0">
                        ${abonos.length === 0 ? `
                            <div class="px-4 py-6 text-center text-slate-300 font-bold text-[9px] uppercase tracking-widest">Sin pagos registrados</div>
                        ` : `
                            <table class="w-full text-left">
                                <thead class="bg-slate-50/30">
                                    <tr>
                                        <th class="px-4 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                                        <th class="px-4 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                                        <th class="px-4 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                                        <th class="px-4 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right"></th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${abonos.map((a, idx) => `
                                        <tr>
                                            <td class="px-4 py-2">
                                                <p class="text-[10px] font-bold text-dark leading-tight">${new Date(a.fecha).toLocaleDateString()}</p>
                                            </td>
                                            <td class="px-4 py-2">
                                                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase">${a.metodo || 'Efectivo'}</span>
                                            </td>
                                            <td class="px-6 py-3 text-sm font-bold text-emerald-600 text-right">$${parseFloat(a.monto).toFixed(2)}</td>
                                            <td class="px-6 py-3 text-right">
                                                <button type="button" onclick="window.removeAbono(${idx}, '${p.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-2">
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>

            <div class="bg-slate-50/50 p-6 rounded-card border border-black/5">
                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Catálogo de Tratamientos (${categoriaFiltro})</h4>
                <div class="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    ${filteredCatalog.map(c => `
                        <button onclick="window.addToBudget('${c.nombre}', ${c.costo}, '${p.id}')" 
                                class="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-black/5 hover:border-primary transition-all group">
                            <div class="text-left">
                                <p class="text-[11px] font-bold text-dark group-hover:text-primary">${c.nombre}</p>
                                <p class="text-[9px] font-bold text-slate-400">$${c.costo.toFixed(2)}</p>
                            </div>
                            <svg class="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="3"/></svg>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // ── OPTIMISTIC UI: ADD TO BUDGET (MULTI-PRESUPUESTO) ────────────────────
    window.addToBudget = async (nombre, costo, pId, diente = null, tipoOrigen = 'manual') => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
        if (!presupuestoActivo) {
            alert('No hay presupuesto activo');
            return;
        }

        if (!presupuestoActivo.items) presupuestoActivo.items = [];

        const tipoItem = (diente && tipoOrigen === 'odontograma') ? 'odontograma' : 'manual';
        
        // OPTIMISTIC UPDATE
        const newItem = {
            nombre,
            costo: parseFloat(costo),
            diente: diente,
            estado: 'PENDIENTE',
            fecha: new Date().toISOString(),
            tipo: tipoItem
        };
        presupuestoActivo.items.push(newItem);
        p.presupuesto_json = budgetData;

        // Visual feedback immediately
        window.renderizarModuloClinico(pId, 'presupuesto');

        // BACKGROUND PERSIST
        supabase.from('PACIENTES').update({ presupuesto_json: budgetData }).eq('id', pId).then(({ error }) => {
            if (error) console.error('Error persistiendo presupuesto:', error);
        });
    };

    // ── CAMBIAR PRESUPUESTO ACTIVO ────────────────────────────────────────────
    window.cambiarPresupuesto = (pId, presupuestoId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;
        
        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        budgetData.presupuesto_activo = presupuestoId;
        p.presupuesto_json = budgetData;
        
        window.renderizarModuloClinico(pId, 'presupuesto');
    };

    // ── CREAR NUEVO PRESUPUESTO ────────────────────────────────────────────────
    window.crearNuevoPresupuesto = async (pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        const nombre = prompt('Ingrese nombre para el nuevo plan de tratamiento:', 'Nuevo Plan de Tratamiento');
        if (!nombre) return;

        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];

        const nuevoId = 'presupuesto_' + Date.now();
        const nuevoPresupuesto = {
            id: nuevoId,
            nombre: nombre,
            fecha_creacion: new Date().toISOString(),
            items: [],
            abonos: []
        };

        budgetData.presupuestos.push(nuevoPresupuesto);
        budgetData.presupuesto_activo = nuevoId;
        p.presupuesto_json = budgetData;

        // Persist
        await supabase.from('PACIENTES').update({ presupuesto_json: budgetData }).eq('id', pId);

        window.renderizarModuloClinico(pId, 'presupuesto');
    };

    // ── MOSTRAR CATÁLOGO DE SERVICIOS PARA AÑADIR MANUAL ─────────────────────
    window.mostrarCatalogoServicios = async (pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let { data: rawCatalog } = await supabase.from('TRATAMIENTOS').select('*');
        
        let catalog = (rawCatalog || []).map(item => ({
            nombre: item.TRATAMIENTO || item.tratamiento || item.nombre || 'Sin Nombre',
            costo: parseFloat(item.VALOR || item.valor || item.costo || 0),
            categoria: item.CATEGORIA || item.categoria || 'AMBOS'
        }));

        const fallbackCatalog = [
            { nombre: 'Profilaxis Dental Adulto', costo: 35.0, categoria: 'ADULTO' },
            { nombre: 'Profilaxis Dental Niño', costo: 25.0, categoria: 'NIÑO' },
            { nombre: 'Consultoría Especializada', costo: 40.0, categoria: 'AMBOS' },
            { nombre: 'Resina Estética Simple', costo: 45.0, categoria: 'ADULTO' },
            { nombre: 'Ortodoncia Fija', costo: 1200.0, categoria: 'AMBOS' },
            { nombre: 'Blanqueamiento Dental', costo: 250.0, categoria: 'ADULTO' },
            { nombre: 'Extracción Dental', costo: 50.0, categoria: 'AMBOS' },
            { nombre: 'Tratamiento de Conducto', costo: 150.0, categoria: 'AMBOS' }
        ];

        if (catalog.length === 0) catalog = fallbackCatalog;

        const categoriaFiltro = (parseInt(p['EDAD']) < 17) ? 'NIÑO' : 'ADULTO';
        const filteredCatalog = catalog.filter(c => c.categoria === categoriaFiltro || c.categoria === 'AMBOS');

        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[30000] bg-black/50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-card shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <div class="p-6 border-b border-black/5 flex justify-between items-center">
                    <h3 class="text-xl font-display font-extrabold text-dark">Añadir Servicio Manual</h3>
                    <button onclick="this.closest('.fixed').remove()" class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2"/></svg>
                    </button>
                </div>
                <div class="p-4 border-b border-black/5">
                    <input type="text" id="buscador-servicios" placeholder="Buscar servicio..." class="sach-input w-full" oninput="window.filtrarServicios(this.value)">
                </div>
                <div class="overflow-y-auto flex-grow p-4 space-y-2" id="catalogo-servicios">
                    ${filteredCatalog.map(s => `
                        <button onclick="window.agregarItemManual('${pId}', '${s.nombre}', ${s.costo}); this.closest('.fixed').remove();" 
                                class="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-black/5 hover:border-primary hover:bg-white transition-all text-left">
                            <div>
                                <p class="font-bold text-dark text-sm">${s.nombre}</p>
                                <p class="text-[10px] text-slate-400">${s.categoria}</p>
                            </div>
                            <span class="font-bold text-primary">$${s.costo.toFixed(2)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    // ── FILTRAR SERVICIOS EN MODAL ────────────────────────────────────────────
    window.filtrarServicios = (termino) => {
        const items = document.querySelectorAll('#catalogo-servicios button');
        const term = termino.toLowerCase();
        items.forEach(item => {
            const texto = item.textContent.toLowerCase();
            item.style.display = texto.includes(term) ? 'flex' : 'none';
        });
    };

    // ── AGREGAR ITEM MANUAL AL PRESUPUESTO ACTIVO ───────────────────────────
    window.agregarItemManual = async (pId, nombre, costo) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
        if (!presupuestoActivo) {
            alert('No hay presupuesto activo');
            return;
        }

        if (!presupuestoActivo.items) presupuestoActivo.items = [];

        const newItem = {
            nombre: nombre,
            costo: parseFloat(costo),
            diente: 'MANUAL',
            tipo: 'manual',
            _origen: 'manual',
            estado: 'PENDIENTE',
            fecha: new Date().toISOString()
        };

        presupuestoActivo.items.push(newItem);
        p.presupuesto_json = budgetData;

        // Persist
        await supabase.from('PACIENTES').update({ presupuesto_json: budgetData }).eq('id', pId);

        window.renderizarModuloClinico(pId, 'presupuesto');
    };

    // ── REFLEJO CLÍNICO: SYNC FROM BUDGET TO ODONTOGRAM (MULTI-PRESUPUESTO) ────────────────────
    window.syncBudgetToOdontogram = (pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
        if (!presupuestoActivo) return;

        const items = presupuestoActivo.items || [];

        let odont = p.odontograma_json || { permanentes: {}, temporales: {} };
        if (!odont.permanentes) {
            odont = { permanentes: { ...odont }, temporales: {} };
        }

        items.forEach(item => {
            if (item.diente) {
                if (String(item.diente).includes('Arco')) {
                    const zone = String(item.diente).toLowerCase().includes('superior') ? 'superior' : 'inferior';
                    if (!odont.arcos) odont.arcos = { superior: null, inferior: null };

                    const cleanName = item.nombre.split(' - ')[0];
                    odont.arcos[zone] = {
                        tipo: cleanName.toLowerCase().includes('ortodoncia') ? 'ortodoncia' : 'ortopedia',
                        procedimiento: { TRATAMIENTO: cleanName, VALOR: item.costo },
                        status: (item.estado === 'EXISTENTE') ? 'realizado' : 'propuesto'
                    };
                } else if (!isNaN(item.diente)) {
                    const dId = parseInt(item.diente);
                    const isTemp = dId >= 51;
                    const target = isTemp ? odont.temporales : odont.permanentes;

                    if (!target[dId]) {
                        target[dId] = { faces: { O: true }, status: 'caries' };
                    }

                    target[dId].status = (item.estado === 'EXISTENTE') ? 'realizado' : 'propuesto';

                    if (!target[dId].procedimiento) {
                        target[dId].procedimiento = { TRATAMIENTO: item.nombre.replace('[TEMPORAL] ', ''), VALOR: item.costo };
                    }
                }
            }
        });

        p.odontograma_json = odont;
        supabase.from('PACIENTES').update({ odontograma_json: odont }).eq('id', pId).then(() => { });
    };

    // ── OPTIMISTIC UI: ABONOS (MULTI-PRESUPUESTO) ────────────────────────────
    window.promptAddAbono = async (pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
        if (!presupuestoActivo) {
            alert('No hay presupuesto activo');
            return;
        }

        const { totalTratamiento, totalAbonado } = calcularTotalesPresupuesto(presupuestoActivo);
        const maxPermitido = totalTratamiento - totalAbonado;

        if (maxPermitido <= 0) {
            alert('Este presupuesto ya está saldado completamente.');
            return;
        }

        const montoStr = prompt(`Ingrese el monto del abono ($):\n(Saldo Pendiente: $${maxPermitido.toFixed(2)})`);
        if (!montoStr || isNaN(montoStr)) return;

        const monto = parseFloat(montoStr);
        if (monto <= 0) {
            alert('El monto debe ser un valor positivo.');
            return;
        }

        if (monto > maxPermitido + 0.01) {
            alert(`No puede abonar más del saldo pendiente ($${maxPermitido.toFixed(2)}).`);
            return;
        }

        const metodo = prompt('Ingrese método de pago:\n(Efectivo, Transferencia, Tarjeta u Otros)', 'Efectivo') || 'Efectivo';
        const nota = prompt('¿Alguna nota adicional? (Opcional):') || '';
        const responsable = "Dra. Lucía Quintero";

        const nuevoAbonoJSON = {
            fecha: new Date().toISOString(),
            monto: monto,
            metodo: metodo,
            nota: nota,
            presupuesto_id: presupuestoActivo.id
        };

        if (!presupuestoActivo.abonos) presupuestoActivo.abonos = [];
        presupuestoActivo.abonos.push(nuevoAbonoJSON);
        presupuestoActivo.total_abonado = presupuestoActivo.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);

        const nuevoSaldo = totalTratamiento - presupuestoActivo.total_abonado;

        // 1. Insertar en tabla maestra ABONO (Finanzas)
        const { error: errorAbono } = await supabase.from('ABONO').insert([{
            'FECHA': new Date().toISOString(),
            'ABONO': monto,
            'SALDO': nuevoSaldo,
            'TIPODEPAGO': metodo.toUpperCase(),
            'RESPONSABLE': responsable,
            'ID_PACIENTE': p['ID DEL PACIENTE'],
            'PRESUPUESTO_ID': presupuestoActivo.id
        }]);

        if (errorAbono) {
            console.error('Error insertando en tabla ABONO:', errorAbono);
            alert('Se guardó en el expediente pero hubo un error registrándolo en Finanzas.');
        }

        // 2. Actualizar JSON en PACIENTES
        p.presupuesto_json = budgetData;
        window.renderizarModuloClinico(pId, 'presupuesto');

        await supabase.from('PACIENTES').update({ presupuesto_json: budgetData }).eq('id', pId);

    };

    window.removeAbono = async (idx, pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
        if (!presupuestoActivo) return;

        if (!presupuestoActivo.abonos) presupuestoActivo.abonos = [];

        presupuestoActivo.abonos.splice(idx, 1);
        presupuestoActivo.total_abonado = presupuestoActivo.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);

        p.presupuesto_json = budgetData;
        window.renderizarModuloClinico(pId, 'presupuesto');
        supabase.from('PACIENTES').update({ presupuesto_json: budgetData }).eq('id', pId).then(() => { });
    };

    window.removeFromBudget = async (idx, pId) => {
        try {
            const p = currentPatients.find(patient => patient.id == pId);
            if (!p) {
                console.warn('El paciente no existe en el array local de carga rápida.');
                return;
            }

            let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
            if (!budgetData.presupuestos) budgetData.presupuestos = [];
            
            const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
            if (!presupuestoActivo) return;

            if (!presupuestoActivo.items) presupuestoActivo.items = [];

            const item = presupuestoActivo.items[idx];
            if (!item) return;

            // 1. Limpiar Odontograma si tiene dientes asociados
            if (item.diente && String(item.diente).trim() !== '' && item.diente !== 'MANUAL') {
                let odontData = p.odontograma_json || { permanentes: {}, temporales: {} };
                if (!odontData.permanentes) odontData = { permanentes: { ...odontData }, temporales: {} };

                if (String(item.diente) === 'Dentadura Completa') {
                    odontData.permanentes = {};
                    odontData.temporales = {};
                } else if (String(item.diente).includes('Arco')) {
                    const zone = String(item.diente).toLowerCase().includes('superior') ? 'superior' : 'inferior';
                    if (odontData.arcos) odontData.arcos[zone] = null;
                } else {
                    const teethIds = String(item.diente).split(',').map(d => d.trim());
                    teethIds.forEach(tId => {
                        if (tId) {
                            const dId = parseInt(tId);
                            if (dId >= 51) {
                                if (odontData.temporales?.[dId]) delete odontData.temporales[dId];
                            } else {
                                if (odontData.permanentes?.[dId]) delete odontData.permanentes[dId];
                            }
                        }
                    });
                }
                p.odontograma_json = odontData;
                supabase.from('PACIENTES').update({ odontograma_json: odontData }).eq('id', pId).then(() => { });
            }

            // 2. Eliminar del presupuesto activo
            presupuestoActivo.items.splice(idx, 1);
            p.presupuesto_json = budgetData;

            // Reflejo Clínico: Si eliminamos del presupuesto, debemos limpiar si era automático
            window.syncBudgetToOdontogram(pId);

            window.renderizarModuloClinico(pId, 'presupuesto');
            await supabase.from('PACIENTES').update({
                presupuesto_json: budgetData,
                odontograma_json: p.odontograma_json
            }).eq('id', pId);

        } catch (error) {
            console.error('Error procesando eliminación del presupuesto:', error);
            alert('Hubo un error al eliminar el procedimiento. Por favor intente de nuevo.');
        }
    };
}

// ── MANUAL PRICE UPDATES (MULTI-PRESUPUESTO) ────────────────────
window.updateBudgetPrice = (idx, val, pId) => {
    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
    if (!budgetData.presupuestos) budgetData.presupuestos = [];
    
    const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
    if (!presupuestoActivo) return;

    if (!presupuestoActivo.items) presupuestoActivo.items = [];

    const nuevoCosto = parseFloat(val) || 0;
    if (presupuestoActivo.items[idx]) {
        presupuestoActivo.items[idx].costo = nuevoCosto;
    }
    p.presupuesto_json = budgetData;

    // Recalcular instantáneo en UI
    const { totalTratamiento, saldoPendiente } = calcularTotalesPresupuesto(presupuestoActivo);

    const totalEl = document.getElementById('total-presupuesto-val');
    const saldoEl = document.getElementById('saldo-pendiente-val');

    if (totalEl) totalEl.innerText = `$${totalTratamiento.toFixed(2)}`;
    if (saldoEl) saldoEl.innerText = `$${saldoPendiente.toFixed(2)}`;
};

window.saveCurrentBudget = async (pId) => {
    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    const btn = document.getElementById('btn-save-budget');
    const originalContent = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <span class="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center animate-spin">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            </span>
            Guardando...
        `;
    }

    // Reflejo Clínico: Garantizar sinc antes de persistir
    window.syncBudgetToOdontogram(pId);

    const { error } = await supabase.from('PACIENTES').update({
        presupuesto_json: p.presupuesto_json,
        odontograma_json: p.odontograma_json
    }).eq('id', pId);

    if (error) {
        console.error('Error guardando presupuesto:', error);
        alert('Error al guardar el presupuesto.');
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    } else {
        if (btn) {
            btn.classList.replace('bg-primary', 'bg-emerald-500');
            btn.innerHTML = `
                <span class="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round"/></svg>
                </span>
                ¡Guardado!
            `;
            setTimeout(() => {
                btn.classList.replace('bg-emerald-500', 'bg-primary');
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }, 2000);
        }
    }
};


async function renderHistoryTab(root, p, history) {
    // MULTI-PRESUPUESTO: Obtener el presupuesto activo
    let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
    if (!budgetData.presupuestos) budgetData.presupuestos = [];
    
    const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo) || budgetData.presupuestos[0];
    const items = presupuestoActivo?.items || [];
    const abonos = presupuestoActivo?.abonos || [];
    
    // Calcular totales del presupuesto activo
    const totalTratamiento = items.reduce((acc, item) => acc + (parseFloat(item.costo) || 0), 0);
    const totalAbonado = abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);
    const saldoPendiente = totalTratamiento - totalAbonado;
    
    // Filtrar history para mostrar solo notas del presupuesto activo
    const historyFiltrado = (history || []).filter(h => !h.presupuesto_id || h.presupuesto_id === presupuestoActivo?.id);

    root.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Timeline View -->
            <div class="space-y-4">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Línea de Tiempo</h4>
                    <button onclick="document.getElementById('evo-note').focus();" class="text-[9px] font-extrabold text-accent uppercase tracking-wider flex items-center gap-1 hover:scale-105 transition-all">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="3" stroke-linecap="round"/></svg>
                        Añadir
                    </button>
                </div>
                <div class="relative border-l-2 border-slate-100 pl-4 space-y-6 py-1">
                    ${historyFiltrado.length === 0 ? `
                        <div class="text-slate-300 font-bold text-[9px] uppercase tracking-widest text-center py-6">Sin historias registradas</div>
                    ` : historyFiltrado.map((h, idx) => `
                        <div class="relative group">
                            <span class="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-white border-3 ${h.tipo === 'manual' ? 'border-accent' : 'border-primary'} shadow-sm z-10 transition-colors"></span>
                            <div class="bg-white p-3 rounded-card border ${h.tipo === 'manual' ? 'border-accent/20' : 'border-black/5'} shadow-soft transition-all hover:scale-[1.01] relative overflow-hidden">
                                ${h.tipo === 'manual' ? `<div class="absolute top-0 right-0 w-8 h-8 bg-accent/5 rounded-bl-2xl flex items-center justify-center text-accent/40"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2"/></svg></div>` : ''}
                                
                                <div class="flex justify-between items-start mb-1.5">
                                    <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${new Date(h.fecha).toLocaleString()}</p>
                                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onclick="window.editHistoryEntry(${idx}, '${p.id}')" class="text-slate-400 hover:text-primary transition-colors text-[10px]">📝</button>
                                        <button onclick="window.deleteHistoryEntry(${idx}, '${p.id}')" class="text-slate-400 hover:text-red-500 transition-colors text-[10px]">🗑️</button>
                                    </div>
                                </div>
                                
                                <p class="text-xs font-bold text-dark mb-1">${h.doctor || 'Dra. Lucía Quintero'}</p>
                                ${h.presupuesto_nombre ? `<span class="inline-block px-1.5 py-0.5 bg-primary/10 text-primary text-[7px] font-bold rounded-full mb-1.5">${h.presupuesto_nombre}</span>` : ''}
                                <div id="history-entry-${idx}" class="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">${h.nota}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Suggested Treatment Plan -->
            <div class="space-y-4">
                <!-- Financial Status Summary Stick-on-Clinical -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center">
                        <p class="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Pagado</p>
                        <p class="text-xl font-display font-extrabold text-emerald-600">$${totalAbonado.toFixed(2)}</p>
                        <div class="mt-1 w-full h-0.5 bg-emerald-100 rounded-full overflow-hidden">
                             <div class="h-full bg-emerald-400" style="width: ${Math.min(totalAbonado / (totalTratamiento || 1) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <div class="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex flex-col items-center">
                        <p class="text-[8px] font-bold text-primary/60 uppercase tracking-widest mb-1">Pendiente</p>
                        <p class="text-xl font-display font-extrabold text-primary">$${saldoPendiente.toFixed(2)}</p>
                        <p class="text-[8px] font-bold text-primary/40 uppercase mt-auto">S.A.C.H.</p>
                    </div>
                </div>

                <div class="bg-slate-50 p-4 rounded-card border border-black/5">
                    <h4 class="text-xs font-display font-extrabold text-primary mb-4 flex items-center gap-2">
                        <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-width="2"/></svg>
                        Plan Sugerido
                    </h4>
                    
                    <div class="space-y-3">
                        ${items.filter(i => (i.estado || 'PENDIENTE') !== 'EXISTENTE').length === 0 ? `
                            <p class="text-xs font-bold text-slate-400 uppercase text-center py-6">No hay procedimientos pendientes</p>
                        ` : items.filter(i => (i.estado || 'PENDIENTE') !== 'EXISTENTE').map((i, idx) => `
                            <div class="flex items-center justify-between p-4 bg-white rounded-xl border border-black/5 hover:border-accent/30 transition-all group">
                                <div class="flex items-center gap-3">
                                    <span class="w-8 h-8 flex items-center justify-center bg-primary/5 text-primary rounded-lg text-[10px] font-bold">${i.diente || '--'}</span>
                                    <div>
                                        <p class="text-sm font-bold text-dark leading-tight">${i.nombre}</p>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Pendiente</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-4">
                                     <p class="text-sm font-bold text-primary">$${parseFloat(i.costo).toFixed(2)}</p>
                                     <button onclick="window.completeTreatment(${items.indexOf(i)}, '${p.id}')" class="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                                        Completar
                                     </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mt-8 pt-6 border-t border-slate-200">
                        <div class="flex justify-between items-center text-dark">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Pendiente</span>
                            <span class="text-xl font-display font-bold text-primary">$${items.filter(i => (i.estado || 'PENDIENTE') !== 'EXISTENTE').reduce((acc, i) => acc + (parseFloat(i.costo) || 0), 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Evolution Form (Moved or kept) -->
                <div class="bg-white p-8 rounded-card border border-black/5 shadow-soft">
                    <h4 class="text-sm font-display font-extrabold text-primary mb-6 flex items-center gap-2">
                        <span class="w-1.5 h-4 bg-accent rounded-full"></span>
                        Nueva Evolución Clínica
                    </h4>
                    <form id="evolution-form" class="space-y-6">
                        <div class="sach-input-container !mb-0">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Médico Tratante</p>
                            <select id="evo-doctor" class="sach-input bg-slate-50 h-12 font-bold" required>
                                <option value="Dra. Lucía Quintero">Dra. Lucía Quintero</option>
                                <option value="Dr. Sergio Arboleda">Dr. Sergio Arboleda</option>
                            </select>
                        </div>
                        <div class="sach-input-container !mb-0 text-left">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2 text-left">Notas de Evolución</p>
                            <textarea id="evo-note" class="sach-input bg-slate-50 !h-32 pt-4 resize-none focus:ring-accent/20" placeholder="Escriba aquí los hallazgos o novedades del día..." required></textarea>
                        </div>
                        <button type="submit" class="sach-button variant-set bg-accent w-full !h-14 font-bold text-sm shadow-[0_8px_20px_rgba(0,191,166,0.25)] hover:scale-[1.01] active:scale-95 transition-all">Guardar en Historial</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('evolution-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const note = document.getElementById('evo-note').value;
            const doctor = document.getElementById('evo-doctor').value;
            const newEntry = {
                fecha: new Date().toISOString(),
                doctor: doctor,
                nota: note,
                tipo: 'manual'
            };

            let budgetData = p.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
            if (!budgetData.presupuestos) budgetData.presupuestos = [];
            const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
            
            const { data: patient } = await supabase.from('PACIENTES').select('plan_tratamiento_json').eq('id', p.id).single();
            const currentHistory = patient.plan_tratamiento_json || [];
            
            newEntry.presupuesto_id = presupuestoActivo ? presupuestoActivo.id : null;
            newEntry.presupuesto_nombre = presupuestoActivo ? presupuestoActivo.nombre : null;
            currentHistory.unshift(newEntry);

            await supabase.from('PACIENTES').update({ 'plan_tratamiento_json': currentHistory }).eq('id', p.id);
            p.plan_tratamiento_json = currentHistory;
            window.renderizarModuloClinico(p.id, 'historia');
        });
    }
}

// ── CRUD HISTORIAL CLÍNICO (DANTE REQ) ────────────────────
window.deleteHistoryEntry = async (idx, pId) => {
    if (!confirm('¿Seguro que desea eliminar esta entrada de la historia clínica? Esta acción no se puede deshacer.')) return;

    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    let history = p.plan_tratamiento_json || [];
    history.splice(idx, 1);
    p.plan_tratamiento_json = history;

    await supabase.from('PACIENTES').update({ plan_tratamiento_json: history }).eq('id', pId);
    window.renderizarModuloClinico(pId, 'historia');
};

window.editHistoryEntry = (idx, pId) => {
    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    const entry = p.plan_tratamiento_json[idx];
    const container = document.getElementById(`history-entry-${idx}`);
    if (!container) return;

    // Transform content to editable area
    const originalText = entry.nota;
    container.innerHTML = `
        <div class="mt-4 space-y-4">
            <textarea id="edit-area-${idx}" class="w-full p-4 border-2 border-primary/20 bg-slate-50 rounded-xl text-sm font-medium focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] outline-none">${originalText}</textarea>
            <div class="flex gap-2 justify-end">
                <button onclick="window.renderizarModuloClinico('${pId}', 'historia')" class="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold uppercase transition-all">Cancelar</button>
                <button onclick="window.saveHistoryEntry(${idx}, '${pId}')" class="px-4 py-2 bg-primary text-white rounded-lg text-[11px] font-bold uppercase shadow-sm transition-all hover:scale-105">Guardar Cambios</button>
            </div>
        </div>
    `;
    document.getElementById(`edit-area-${idx}`).focus();
};

window.saveHistoryEntry = async (idx, pId) => {
    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    const newText = document.getElementById(`edit-area-${idx}`).value;
    if (!newText.trim()) return;

    let history = p.plan_tratamiento_json || [];
    if (history[idx]) {
        history[idx].nota = newText;
        history[idx].fecha_edicion = new Date().toISOString();
        if (history[idx].tipo !== 'manual') history[idx].tipo = 'editado';
    }

    p.plan_tratamiento_json = history;
    window.renderizarModuloClinico(pId, 'historia');

    await supabase.from('PACIENTES').update({ plan_tratamiento_json: history }).eq('id', pId);
};

// ── OPTIMIZED COMPLETAR BUTTON (CORRECCIÓN DEFINITIVA) ────────────────────
window.completeTreatment = async (itemIdx, pId) => {
    console.log('[SACH] completeTreatment triggered:', { itemIdx, pId });

    // Custom JVCreative Modal Confirm
    const confirmed = await new Promise((resolve) => {
        const dlg = document.createElement('div');
        dlg.id = 'complete-confirm-overlay';
        dlg.className = 'fixed inset-0 z-[12000] flex items-center justify-center p-6';
        dlg.innerHTML = `
            <div class="absolute inset-0 bg-dark/60 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
                <div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3"/></svg>
                </div>
                <h3 class="text-center font-display font-extrabold text-dark text-lg mb-2">Completar Tratamiento</h3>
                <p class="text-center text-slate-500 text-sm mb-8">
                    ¿Desea marcar este procedimiento como <strong>Realizado</strong>?<br>Se actualizará el historial y el odontograma.
                </p>
                <div class="flex gap-3">
                    <button id="cmp-cancel-btn" class="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button id="cmp-confirm-btn" class="flex-1 h-12 bg-emerald-500 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-all">Si, Completar</button>
                </div>
            </div>
        `;
        document.body.appendChild(dlg);
        document.getElementById('cmp-cancel-btn').onclick = () => { dlg.remove(); resolve(false); };
        document.getElementById('cmp-confirm-btn').onclick = () => { dlg.remove(); resolve(true); };
    });

    if (!confirmed) return;

    const p = currentPatients.find(patient => String(patient.id) === String(pId));
    if (!p) {
        console.error('[SACH] completeTreatment: Paciente no encontrado', pId);
        return;
    }

    // Refresh overlay
    const loading = document.createElement('div');
    loading.className = 'fixed inset-0 z-[13000] bg-white/40 backdrop-blur-md flex items-center justify-center';
    loading.innerHTML = `<div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>`;
    document.body.appendChild(loading);

    try {
        const { data: patient } = await supabase.from('PACIENTES').select('*').eq('id', pId).single();
        if (!patient) throw new Error('No se pudo obtener el paciente de la DB');

        // MULTI-PRESUPUESTO: Estructura con array de presupuestos
        let budgetData = patient.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
        if (!budgetData.presupuestos) budgetData.presupuestos = [];
        
        const presupuestoActivo = budgetData.presupuestos.find(bp => bp.id === budgetData.presupuesto_activo);
        if (!presupuestoActivo) throw new Error('No hay presupuesto activo');
        
        if (!presupuestoActivo.items) presupuestoActivo.items = [];
        const item = presupuestoActivo.items[itemIdx];
        if (!item) throw new Error('Tratamiento no encontrado en el índice: ' + itemIdx);

        // 1. Mark as Existente
        item.estado = 'EXISTENTE';
        item.fecha_completado = new Date().toISOString();

        // 2. Update Odontogram
        let odont = patient.odontograma_json || { permanentes: {}, temporales: {} };
        if (!odont.permanentes) odont.permanentes = {};
        if (!odont.temporales) odont.temporales = {};
        
        if (item.diente) {
            const teethIds = String(item.diente).split(',').map(d => d.trim());
            teethIds.forEach(tId => {
                if (tId && tId !== 'Dentadura Completa' && !String(tId).includes('Arco')) {
                    const dId = parseInt(tId);
                    if (!isNaN(dId)) {
                        if (dId >= 51 && odont.temporales?.[dId]) {
                            odont.temporales[dId].status = 'realizado';
                        } else if (dId < 51 && odont.permanentes?.[dId]) {
                            odont.permanentes[dId].status = 'realizado';
                        }
                    }
                }
            });
        }

        // 3. Clinical History - vincular al presupuesto activo
        let history = patient.plan_tratamiento_json || [];
        history.unshift({
            fecha: new Date().toISOString(),
            doctor: 'Dra. Lucía Quintero',
            nota: `✅ Procedimiento Realizado: ${item.nombre}${item.diente ? ` en pieza ${item.diente}` : ''}.`,
            tipo: 'automatica',
            presupuesto_id: presupuestoActivo.id,
            presupuesto_nombre: presupuestoActivo.nombre
        });

        // 4. Update
        await supabase.from('PACIENTES').update({
            presupuesto_json: budgetData,
            odontograma_json: odont,
            plan_tratamiento_json: history
        }).eq('id', pId);

        // Sync local
        p.presupuesto_json = budgetData;
        p.odontograma_json = odont;
        p.plan_tratamiento_json = history;

        window.renderizarModuloClinico(pId, 'historia');
    } catch (err) {
        console.error('[SACH] Error en completeTreatment:', err);
        alert('Ocurrió un error al completar el tratamiento: ' + err.message);
    } finally {
        loading.remove();
    }
};

// Import handled at top of file

// GENERADOR DE ID TEMPORAL (ID-AUTO) - SACH Neo-Medical
window.generarIdTemporal = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = 'SACH-';
    for (let i = 0; i < 5; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    const inputCedula = document.getElementById('p-cedula');
    if (inputCedula) {
        inputCedula.value = resultado;
        inputCedula.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50');
        
        const badge = document.getElementById('id-temporal-badge');
        if (badge) {
            badge.classList.remove('hidden');
        }
        
        setTimeout(() => {
            inputCedula.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50');
        }, 2000);
    }
};

// CÁLCULO DE EDAD Y DETECCIÓN DE DENTICIÓN - SACH Neo-Medical
window.calcularEdadYDenticion = () => {
    const fechaInput = document.getElementById('p-fecha-nac');
    const edadDisplay = document.getElementById('edad-display');
    const denticionDisplay = document.getElementById('denticion-display');
    
    if (!fechaInput || !fechaInput.value) {
        if (edadDisplay) edadDisplay.classList.add('hidden');
        if (denticionDisplay) denticionDisplay.classList.add('hidden');
        return null;
    }
    
    const fechaNac = new Date(fechaInput.value + 'T00:00:00');
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }
    
    // Determinar tipo de dentición
    let denticion = '';
    let denticionClase = '';
    
    if (edad >= 0 && edad <= 5) {
        denticion = 'INFANTIL (Dientes de Leche)';
        denticionClase = 'bg-purple-100 text-purple-700';
    } else if (edad >= 6 && edad <= 12) {
        denticion = 'MIXTO (Dentición Mixta)';
        denticionClase = 'bg-amber-100 text-amber-700';
    } else {
        denticion = 'ADULTO (Dentición Permanente)';
        denticionClase = 'bg-emerald-100 text-emerald-700';
    }
    
    // Mostrar edad
    if (edadDisplay) {
        edadDisplay.textContent = `${edad} años`;
        edadDisplay.classList.remove('hidden');
        
        // Color según edad
        if (edad < 6) {
            edadDisplay.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-100 text-purple-700';
        } else if (edad < 13) {
            edadDisplay.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700';
        } else {
            edadDisplay.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700';
        }
    }
    
    // Mostrar tipo de dentición
    if (denticionDisplay) {
        denticionDisplay.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/></svg> ${denticion}`;
        denticionDisplay.className = `mt-2 text-[9px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 ${denticionClase}`;
    }
    
    return { edad, denticion };
};

// Función auxiliar para calcular edad (usada en el guardado)
function calcularEdad(fechaISO) {
    if (!fechaISO) return null;
    const fechaNac = new Date(fechaISO + 'T00:00:00');
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }
    return edad >= 0 ? edad : 0;
}

window.openNewPatientModal = async (id = null) => {
    let p = null;
    if (id) {
        p = currentPatients.find(patient => patient.id == id);
    }

    const modal = document.getElementById('patient-modal');
    const content = document.getElementById('patient-modal-container');

    modal.classList.replace('opacity-0', 'opacity-100');
    modal.classList.remove('pointer-events-none');
    content.classList.replace('scale-95', 'scale-100');
    content.classList.replace('max-w-2xl', 'max-w-4xl'); // Wider for the form

    content.innerHTML = `
        <div class="flex justify-between items-start mb-8 border-b border-black/5 pb-4">
            <div>
                <h3 class="text-3xl font-display font-extrabold text-dark tracking-tight leading-tight">${p ? 'Editar Paciente' : 'Alta de Paciente'}</h3>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Expediente Clínico S.A.C.H.</p>
            </div>
            <button onclick="window.closePatientModal()" class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
            </button>
        </div>

        <form id="new-patient-form" class="space-y-8 max-h-[70vh] overflow-y-auto pr-2 pb-20 custom-scrollbar">
            
            <!-- SEC A: Datos del Paciente -->
            <div class="bg-slate-50/50 p-6 rounded-card border border-black/5">
                <h4 class="text-sm font-display font-extrabold text-primary mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-accent"></span> Sección A: Datos Personales
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Nombre Completo *</p>
                        <input type="text" id="p-nombre" class="sach-input bg-white font-bold" required>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Cédula / DNI *</p>
                        <div class="flex gap-2">
                            <input type="text" id="p-cedula" class="sach-input bg-white font-bold text-primary flex-grow" placeholder="Ingrese número de cédula" required>
                            <button type="button" onclick="window.generarIdTemporal()" class="sach-button variant-set bg-amber-400 !h-12 !px-4 text-[10px] font-bold shadow-soft hover:bg-amber-500 transition-all" title="Generar ID Temporal">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-width="2"/></svg>
                                ID TEMPORAL
                            </button>
                        </div>
                        <p id="id-temporal-badge" class="hidden mt-2 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/></svg>
                            ID Temporal generado - Requiere actualización posterior
                        </p>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Fecha de Nacimiento *</p>
                        <div class="relative">
                            <input type="date" id="p-fecha-nac" class="sach-input bg-white font-bold cursor-pointer" required onchange="window.calcularEdadYDenticion()">
                            <span id="edad-display" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg"></span>
                        </div>
                        <p id="denticion-display" class="hidden mt-2 text-[9px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1"></p>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Teléfono Celular *</p>
                        <input type="tel" id="p-telefono" class="sach-input bg-white font-bold" placeholder="Ej: 097 880 5374" required>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Correo Electrónico</p>
                        <input type="email" id="p-correo" class="sach-input bg-white font-bold">
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Dirección de Residencia</p>
                        <input type="text" id="p-direccion" class="sach-input bg-white font-bold">
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Sexo</p>
                        <select id="p-sexo" class="sach-input bg-white font-bold cursor-pointer">
                            <option value="">Seleccionar...</option>
                            <option value="MASCULINO">MASCULINO</option>
                            <option value="FEMENINO">FEMENINO</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- SEC B & C: Responsable y Facturador -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- SEC B -->
                <div class="bg-slate-50/50 p-6 rounded-card border border-black/5">
                    <h4 class="text-sm font-display font-extrabold text-primary mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-secondary/50"></span> Sección B: Representante
                    </h4>
                    <div class="space-y-4">
                        <div class="sach-input-container">
                            <input type="text" id="r-nombre" placeholder="Nombre del Representante" class="sach-input bg-white font-bold text-sm">
                        </div>
                        <div class="flex gap-4">
                            <input type="text" id="r-cedula" placeholder="Cédula" class="sach-input bg-white font-bold text-sm w-1/2">
                            <input type="tel" id="r-telefono" placeholder="Teléfono" class="sach-input bg-white font-bold text-sm w-1/2">
                        </div>
                        <div class="sach-input-container">
                            <input type="email" id="r-correo" placeholder="Correo del Representante" class="sach-input bg-white font-bold text-sm">
                        </div>
                    </div>
                </div>

                <!-- SEC C -->
                <div class="bg-slate-50/50 p-6 rounded-card border border-black/5">
                    <h4 class="text-sm font-display font-extrabold text-primary mb-4 flex justify-between items-center">
                        <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-secondary/50"></span> Sección C: Facturador</span>
                        <label class="flex items-center gap-2 cursor-pointer text-[10px] uppercase font-bold text-slate-400">
                            <input type="checkbox" id="copy-rep" class="w-3 h-3 accent-primary" onchange="window.copyRepresentante()">
                            Mismo que Rep.
                        </label>
                    </h4>
                    <div class="space-y-4">
                        <div class="sach-input-container">
                            <input type="text" id="f-nombre" placeholder="Nombre / Razón Social" class="sach-input bg-white font-bold text-sm">
                        </div>
                        <div class="sach-input-container">
                            <input type="text" id="f-cedula" placeholder="RUC / Cédula" class="sach-input bg-white font-bold text-sm">
                        </div>
                        <div class="flex gap-4">
                            <input type="tel" id="f-telefono" placeholder="Celular Facturación" class="sach-input bg-white font-bold text-sm w-1/2">
                            <input type="email" id="f-correo" placeholder="Correo Facturación" class="sach-input bg-white font-bold text-sm w-1/2">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SEC D: Anamnesis estructurada -->
            <div class="bg-danger/5 p-6 rounded-card border border-danger/10">
                <h4 class="text-sm font-display font-extrabold text-danger mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-danger animate-pulse"></span> Sección D: Historico Médico (APP / APF)
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-danger uppercase tracking-widest mb-1 ml-2">1. ¿Padece enfermedad grave?</p>
                        <select id="resp-01" class="sach-input bg-white font-bold text-sm cursor-pointer">
                            <option value="No">No</option>
                            <option value="Si">Sí</option>
                            <option value="No Sabe">No Sabe</option>
                        </select>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-danger uppercase tracking-widest mb-1 ml-2">2. ¿Bajo tratamiento médico?</p>
                        <select id="resp-02" class="sach-input bg-white font-bold text-sm cursor-pointer">
                            <option value="No">No</option>
                            <option value="Si">Sí</option>
                            <option value="No Sabe">No Sabe</option>
                        </select>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-danger uppercase tracking-widest mb-1 ml-2">3. ¿Complicaciones con anestesia?</p>
                        <select id="resp-03" class="sach-input bg-white font-bold text-sm cursor-pointer">
                            <option value="No">No</option>
                            <option value="Si">Sí</option>
                            <option value="No Sabe">No Sabe</option>
                        </select>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-danger uppercase tracking-widest mb-1 ml-2">4. ¿Propenso a hemorragias?</p>
                        <select id="resp-04" class="sach-input bg-white font-bold text-sm cursor-pointer">
                            <option value="No">No</option>
                            <option value="Si">Sí</option>
                            <option value="No Sabe">No Sabe</option>
                        </select>
                    </div>
                    <div class="sach-input-container md:col-span-2">
                        <p class="text-[10px] font-bold text-danger uppercase tracking-widest mb-1 ml-2">5. Presión Arterial</p>
                        <select id="resp-05" class="sach-input bg-white font-bold text-sm cursor-pointer w-full">
                            <option value="Normal">Normal</option>
                            <option value="Alta">Alta</option>
                            <option value="Baja">Baja</option>
                            <option value="No Sabe">No Sabe</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- SEC E: Observaciones -->
            <div class="sach-input-container">
                 <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Sección E: Observaciones Generales</p>
                 <input type="text" id="p-obs" class="sach-input bg-white font-bold text-sm" placeholder="Notas libres sobre el paciente...">
            </div>

            <!-- Floating Save Button -->
            <div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent flex justify-end gap-4 rounded-b-[24px]">
                <button type="button" onclick="window.closePatientModal()" class="sach-button variant-unset bg-white !h-12 border-none hover:bg-slate-100">Cancelar</button>
                <button type="submit" class="sach-button variant-set bg-primary shadow-glow !h-12 px-10">${p ? 'Actualizar Expediente' : 'Guardar Expediente'}</button>
            </div>
        </form>
    `;

    document.getElementById('new-patient-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        // VALIDACIÓN: Fecha de nacimiento obligatoria
        const fechaNacInput = document.getElementById('p-fecha-nac');
        if (!fechaNacInput || !fechaNacInput.value) {
            alert('⚠️ La Fecha de Nacimiento es obligatorio. Por favor ingrese la fecha del paciente.');
            fechaNacInput?.focus();
            return;
        }

        // VALIDACIÓN: Cédula o ID obligatorio
        const cedulaInput = document.getElementById('p-cedula');
        if (!cedulaInput || !cedulaInput.value.trim()) {
            alert('⚠️ La Cédula o ID es obligatorio. Use el botón "ID Temporal" si no tiene cédula.');
            cedulaInput?.focus();
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;

        // Helper: convierte string vacío a null para Supabase
        const strOrNull = (v) => (v && v.trim() !== '') ? v.trim() : null;

        // Payload con las columnas exactas de Supabase
        // IMPORTANTE: campos opcionales se envían como null (no "") para evitar errores de tipo bigint
        const edadCalculada = calcularEdad(document.getElementById('p-fecha-nac').value);
        const payload = {
            'NOMBRE DEL PACIENTE': document.getElementById('p-nombre').value.trim(),
            'ID DEL PACIENTE': document.getElementById('p-cedula').value.trim(),
            'CELULAR DEL PACIENTE': strOrNull(document.getElementById('p-telefono').value),
            'CORREO': strOrNull(document.getElementById('p-correo').value),
            'DIRECCION': strOrNull(document.getElementById('p-direccion').value),
            'FECHA DE NACIMIENTO': strOrNull(formatDateToDMY(document.getElementById('p-fecha-nac').value)),
            'SEXO': strOrNull(document.getElementById('p-sexo').value),
            'EDAD': edadCalculada ? parseInt(edadCalculada) : null,
            'OBSERVACIONES': strOrNull(document.getElementById('p-obs').value) || 'Sin observaciones',

            // Sección B: Representante
            'NOMBRE REPRESENTANTE': strOrNull(document.getElementById('r-nombre').value),
            'CEDULA REPRESENTANTE': strOrNull(document.getElementById('r-cedula').value),
            'CELULAR DEL REPRESENTANTE': strOrNull(document.getElementById('r-telefono').value),
            'CORREO REPRESENTANTE': strOrNull(document.getElementById('r-correo').value),

            // Sección C: Facturador
            'NOMBRE FACTURACION': strOrNull(document.getElementById('f-nombre').value),
            'CEDULA FACTURACION': strOrNull(document.getElementById('f-cedula').value),
            'CELULAR FACTURACION': strOrNull(document.getElementById('f-telefono').value),
            'CORREO FACTURACION': strOrNull(document.getElementById('f-correo').value),

            // Anamnesis
            'RESPUESTA 01': document.getElementById('resp-01').value,
            'RESPUESTA 02': document.getElementById('resp-02').value,
            'RESPUESTA 03': document.getElementById('resp-03').value,
            'RESPUESTA 04': document.getElementById('resp-04').value,
            'RESPUESTA 05': document.getElementById('resp-05').value,

            // Timestamp de creación (requerido por Supabase)
            'created_at': new Date().toISOString(),
        };

        // ── Estrategia SUPABASE FIRST ──────────────────────────────────────────
        // Usamos el módulo supabase-client.js (sin ciclo de importacion)
        let supabaseError = null;

        if (p) {
            // MODO EDICIÓN: UPDATE en Supabase usando la cédula como clave única
            // Se excluye created_at para no sobrescribir la fecha de creación original
            const idPaciente = p['ID DEL PACIENTE'];
            const { created_at: _skipCreatedAt, ...updatePayload } = payload;
            const { error } = await supabase
                .from('PACIENTES')
                .update(updatePayload)
                .eq('ID DEL PACIENTE', idPaciente);
            supabaseError = error;

            if (!error) {
            }
        } else {
            // MODO INSERCIÓN: INSERT directo en Supabase
            const { data, error } = await supabase
                .from('PACIENTES')
                .insert([payload])
                .select()
                .single();
            supabaseError = error;

            if (!error && data) {

                // Disparador de WhatsApp para pacientes nuevos
                const celularRaw = payload['CELULAR DEL PACIENTE'];
                if (celularRaw) {
                    const cleanPhone = sanitizarCelularEcuador(celularRaw);
                    const mensaje = generarMensajeBienvenidaPremium({ nombre: payload['NOMBRE DEL PACIENTE'] });
                    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(mensaje)}`;
                    window.open(url, '_blank');
                }
            }
        }

        if (supabaseError) {
            alert('Error conectando a la base de datos: ' + supabaseError.message);
        }

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        // Cerrar y refrescar la vista
        window.closePatientModal();
        if (window.dispatchView) window.dispatchView('pacientes');
    });

    if (p) {
        // Rellenar datos en formulario
        document.getElementById('p-nombre').value = p['NOMBRE DEL PACIENTE'] || '';
        document.getElementById('p-cedula').value = p['ID DEL PACIENTE'] || '';
        document.getElementById('p-telefono').value = p['CELULAR DEL PACIENTE'] || '';
        document.getElementById('p-correo').value = p['CORREO'] || '';
        document.getElementById('p-direccion').value = p['DIRECCION'] || '';
        document.getElementById('p-fecha-nac').value = formatDateToYMD(p['FECHA DE NACIMIENTO']) || '';
        document.getElementById('p-sexo').value = p['SEXO'] || '';
        document.getElementById('p-obs').value = p['OBSERVACIONES'] || '';

        // Seccion B
        document.getElementById('r-nombre').value = p['NOMBRE REPRESENTANTE'] || '';
        document.getElementById('r-cedula').value = p['CEDULA REPRESENTANTE'] || '';
        document.getElementById('r-telefono').value = p['CELULAR DEL REPRESENTANTE'] || '';
        document.getElementById('r-correo').value = p['CORREO REPRESENTANTE'] || '';

        // Seccion C
        document.getElementById('f-nombre').value = p['NOMBRE FACTURACION'] || '';
        document.getElementById('f-cedula').value = p['CEDULA FACTURACION'] || '';
        document.getElementById('f-telefono').value = p['CELULAR FACTURACION'] || '';
        document.getElementById('f-correo').value = p['CORREO FACTURACION'] || '';

        if (p['RESPUESTA 01']) document.getElementById('resp-01').value = p['RESPUESTA 01'];
        if (p['RESPUESTA 02']) document.getElementById('resp-02').value = p['RESPUESTA 02'];
        if (p['RESPUESTA 03']) document.getElementById('resp-03').value = p['RESPUESTA 03'];
        if (p['RESPUESTA 04']) document.getElementById('resp-04').value = p['RESPUESTA 04'];
        if (p['RESPUESTA 05']) document.getElementById('resp-05').value = p['RESPUESTA 05'];
    }
};

window.deletePatient = async (id) => {
    if (confirm('¿Está seguro que desea eliminar este expediente de forma permanente?')) {
        const p = currentPatients.find(patient => patient.id == id);
        if (p) {
            // SUPABASE FIRST: intentar eliminar en la nube
            const cedula = p['ID DEL PACIENTE'];
            const { error } = await supabase
                .from('PACIENTES')
                .delete()
                .eq('ID DEL PACIENTE', cedula);

            if (error) {
                alert('⚠️ No se pudo eliminar en Supabase: ' + error.message);
            } else {
            }

            window.closePatientModal();
            if (window.dispatchView) window.dispatchView('pacientes');
        }
    }

};

function formatDateToDMY(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function formatDateToYMD(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

window.copyRepresentante = () => {
    const isChecked = document.getElementById('copy-rep').checked;
    if (isChecked) {
        document.getElementById('f-nombre').value = document.getElementById('r-nombre').value;
        document.getElementById('f-cedula').value = document.getElementById('r-cedula').value;
        document.getElementById('f-telefono').value = document.getElementById('r-telefono').value;
        document.getElementById('f-correo').value = document.getElementById('r-correo').value;
    } else {
        document.getElementById('f-nombre').value = '';
        document.getElementById('f-cedula').value = '';
        document.getElementById('f-telefono').value = '';
        document.getElementById('f-correo').value = '';
    }
};

// ... existing close modal ...
window.closePatientModal = () => {
    const modal = document.getElementById('patient-modal');
    const content = document.getElementById('patient-modal-container');
    modal.classList.replace('opacity-100', 'opacity-0');
    modal.classList.add('pointer-events-none');
    content.classList.replace('scale-100', 'scale-95');
    setTimeout(() => {
        content.classList.replace('max-w-4xl', 'max-w-2xl'); // Retornar a tamaño original para la vista del detalle
    }, 300);
};

window.printClinicalRecord = async (pId) => {
    const { data: patientDoc } = await supabase.from('PACIENTES').select('*').eq('id', pId).single();
    if (!patientDoc) return;

    // Overlay de Carga para impresión
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'print-loading-overlay';
    loadingOverlay.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-white';
    loadingOverlay.innerHTML = `
        <svg class="animate-spin h-12 w-12 text-accent mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 class="text-2xl font-bold tracking-tight">Preparando Reporte Clínico</h3>
        <p class="text-sm text-slate-400 mt-2 font-medium italic">Generando vista de alta gama Neo-Medical...</p>
    `;
    document.body.appendChild(loadingOverlay);

    // Preparar datos financieros - Soporte multi-presupuesto
    let budgetData = patientDoc.presupuesto_json || { presupuestos: [], presupuesto_activo: null };
    
    // Formato antiguo de compatibilidad
    if (budgetData.items && !budgetData.presupuestos) {
        budgetData = {
            presupuestos: [{
                id: 'presupuesto_1',
                nombre: 'Plan de Tratamiento Inicial',
                fecha_creacion: new Date().toISOString(),
                items: budgetData.items || [],
                abonos: budgetData.abonos || []
            }],
            presupuesto_activo: 'presupuesto_1'
        };
    }

    const presupuestos = budgetData.presupuestos || [];
    const presupuestoActivo = presupuestos.find(p => p.id === budgetData.presupuesto_activo) || presupuestos[0];
    
    // Calcular totales generales
    let totalGeneral = 0;
    let totalAbonadoGeneral = 0;
    presupuestos.forEach(pres => {
        const items = pres.items || [];
        const abonos = pres.abonos || [];
        totalGeneral += items.reduce((acc, i) => acc + (parseFloat(i.costo) || 0), 0);
        totalAbonadoGeneral += abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);
    });
    const saldoGeneral = totalGeneral - totalAbonadoGeneral;
    
    // Items del presupuesto activo para mostrar en la tabla principal
    const activeItems = presupuestoActivo?.items || [];

    // Capturar Odontograma
    let odontImg = '';
    const hiddenContainer = document.createElement('div');
    hiddenContainer.id = `print-odont-tmp-${pId}`;
    hiddenContainer.style.width = '800px';
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '0';
    document.body.appendChild(hiddenContainer);

    try {
        const tmpOdont = new Odontogram(hiddenContainer.id, patientDoc.odontograma_json, null, patientDoc, true);
        tmpOdont.render();

        // CRITICAL: Delay for SVG graphics/browser layout to settle
        await new Promise(r => setTimeout(r, 600));

        const odontNode = hiddenContainer.querySelector('.odontogram-wrapper');
        if (odontNode) {
            odontNode.style.boxShadow = 'none';
            odontNode.style.border = 'none';
            // Eliminar modales o elementos extra que puedan salir en la captura
            const extra = odontNode.querySelectorAll('#odont-face-modal, .odont-actions, .loading-state');
            extra.forEach(el => el.remove());

            // Verificar que html2canvas esté disponible
            if (typeof html2canvas === 'undefined') {
                console.error('html2canvas no está cargado. Verifique la conexión a internet o la CDN.');
                alert('Error: html2canvas no está disponible. Verifique su conexión a internet.');
            } else {
                try {
                    const canvas = await html2canvas(odontNode, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        logging: false,
                        allowTaint: false
                    });
                    odontImg = canvas.toDataURL('image/png');
                } catch (canvasError) {
                    console.error('Error en html2canvas:', canvasError);
                    alert('Error al generar la imagen del odontograma: ' + canvasError.message);
                }
            }
        }
    } catch (e) {
        console.error('Error capturando odontograma para impresión:', e);
        alert('Error al preparar el odontograma para impresión: ' + e.message);
    } finally {
        if (hiddenContainer && hiddenContainer.parentNode) {
            document.body.removeChild(hiddenContainer);
        }
    }

    // Generar nombre de archivo seguro basado en el nombre del paciente
    const pacienteNombre = patientDoc['NOMBRE DEL PACIENTE'] || 'Paciente';
    const safeFileName = pacienteNombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '_').replace(/\s+/g, '_');
    const fileName = `Reporte_Clinico_${safeFileName}.html`;

    const printWin = window.open(fileName, '_blank');
    if (!printWin) {
        alert("El navegador bloqueó la ventana de impresión. Por favor, permita las ventanas emergentes.");
        document.body.removeChild(loadingOverlay);
        return;
    }

    // Generar HTML de todos los presupuestos
    let presupuestosHTML = '';
    presupuestos.forEach((pres, idx) => {
        const items = pres.items || [];
        const abonos = pres.abonos || [];
        const totalPres = items.reduce((acc, i) => acc + (parseFloat(i.costo) || 0), 0);
        const totalAbonadoPres = abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);
        const saldoPres = totalPres - totalAbonadoPres;
        const fechaCreacion = pres.fecha_creacion ? new Date(pres.fecha_creacion).toLocaleDateString() : 'Sin fecha';
        
        presupuestosHTML += `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h5 style="font-size: 12px; font-weight: 800; color: #0F4C5C; margin-bottom: 10px; padding: 8px 12px; background: #f0fdfa; border-radius: 8px; border-left: 3px solid #00BFA6;">
                    ${pres.nombre || 'Plan de Tratamiento'} - Creado: ${fechaCreacion}
                </h5>
                <table>
                    <thead>
                        <tr>
                            <th>Tratamiento / Procedimiento</th>
                            <th>Pieza</th>
                            <th style="text-align: right;">Inversión (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Sin procedimientos registrados</td></tr>' :
            items.map(i => `
                            <tr>
                                <td>${i.nombre}</td>
                                <td>${i.diente === 'MANUAL' ? 'Manual' : (i.diente || 'General')}</td>
                                <td style="text-align: right;">$${parseFloat(i.costo).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc;">
                            <td colspan="2" style="font-weight: 700;">Subtotal:</td>
                            <td style="text-align: right; font-weight: 700;">$${totalPres.toFixed(2)}</td>
                        </tr>
                        <tr style="background: #ecfdf5;">
                            <td colspan="2" style="color: #059669; font-weight: 700;">Abonado:</td>
                            <td style="text-align: right; color: #059669; font-weight: 700;">-$${totalAbonadoPres.toFixed(2)}</td>
                        </tr>
                        <tr style="background: #fff7ed;">
                            <td colspan="2" style="color: #ea580c; font-weight: 800;">Saldo Pendiente:</td>
                            <td style="text-align: right; color: #ea580c; font-weight: 800;">$${saldoPres.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    });

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>REPORTE CLÍNICO - ${patientDoc['NOMBRE DEL PACIENTE']}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 0; background: white; -webkit-print-color-adjust: exact; }
                    .page { padding: 40px; max-width: 800px; margin: 0 auto; }
                    
                    /* Header Estilo Neo-Medical */
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00BFA6; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo-box { background-color: #0F4C5C; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px; }
                    .clinic-info { text-align: right; }
                    .clinic-name { font-size: 18px; font-weight: 800; color: #0F4C5C; }
                    .report-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }

                    /* Tarjeta Paciente */
                    .patient-card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; margin-bottom: 30px; }
                    .info-group .label { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
                    .info-group .value { font-size: 14px; font-weight: 700; color: #1e293b; }

                    /* Sección Título Interno */
                    .section-title { font-size: 11px; font-weight: 800; color: #0F4C5C; text-transform: uppercase; border-left: 3px solid #00BFA6; padding-left: 10px; margin-bottom: 15px; margin-top: 30px; }

                    /* Odontograma */
                    .odont-snapshot { text-align: center; margin-bottom: 30px; background: white; padding: 10px; border-radius: 12px; }
                    .odont-snapshot img { max-width: 100%; height: auto; }

                    /* Tabla de Tratamientos */
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; padding: 12px; background: #0F4C5C; color: white; font-size: 10px; text-transform: uppercase; }
                    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #334155; }
                    tr:nth-child(even) { background-color: #fbfcfd; }

                    /* Resumen Financiero */
                    .summary-container { display: flex; justify-content: flex-end; margin-top: 30px; }
                    .summary-box { width: 280px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; font-weight: 700; }
                    .total-label { color: #475569; }
                    .abono-label { color: #059669; }
                    .saldo-row { border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 10px; color: #0F4C5C; font-size: 16px; font-weight: 800; }

                    /* Firmas */
                    .signatures { margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; }
                    .signature-line { border-top: 1px solid #cbd5e1; padding-top: 10px; }
                    .signature-label { font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin-top: 8px; }
                    .signature-sub { font-size: 9px; color: #94a3b8; font-weight: 600; }

                    /* Footer */
                    .footer { margin-top: 60px; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                        @page { size: portrait; margin: 1cm; }
                        .page { padding: 0; max-width: 100%; }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <!-- Encabezado -->
                    <div class="header">
                        <img src="logo-lucia.png" alt="Logo Dra. Lucía Quintero" style="max-height: 60px; max-width: 200px;">
                        <div class="clinic-info">
                            <h1 class="clinic-name">Dra. Lucía Quintero</h1>
                            <p class="report-title">Reporte Clínico y Plan de Tratamiento</p>
                            <p style="font-size: 10px; color: #64748b; font-weight: 600; margin-top: 4px;">Cuenca, Ecuador | S.A.C.H. Neo-Medical Edition</p>
                        </div>
                    </div>

                    <!-- Datos Paciente -->
                    <div class="patient-card">
                        <div class="info-group">
                            <p class="label">Paciente</p>
                            <p class="value">${patientDoc['NOMBRE DEL PACIENTE']}</p>
                        </div>
                        <div class="info-group">
                            <p class="label">Cédula / ID</p>
                            <p class="value">${patientDoc['ID DEL PACIENTE']}</p>
                        </div>
                        <div class="info-group">
                            <p class="label">Fecha Emisión</p>
                            <p class="value">${new Date().toLocaleDateString()}</p>
                        </div>
                        <div class="info-group">
                            <p class="label">Edad</p>
                            <p class="value">${patientDoc['EDAD']} años</p>
                        </div>
                        <div class="info-group">
                            <p class="label">Género</p>
                            <p class="value">${patientDoc['SEXO']}</p>
                        </div>
                        <div class="info-group">
                            <p class="label">Estado</p>
                            <p class="value" style="color: #00BFA6;">Activo</p>
                        </div>
                    </div>

                    <!-- Odontograma Snapshot -->
                    <h4 class="section-title">Representación Visual Odontólogo</h4>
                    <div class="odont-snapshot">
                        ${odontImg ? `<img src="${odontImg}">` : '<div style="padding: 40px; border: 2px dashed #f1f5f9; color: #94a3b8; font-size: 12px; font-weight: 600;">Odontograma en proceso de actualización clínica</div>'}
                    </div>

                    <!-- Detalle de Plan de Tratamiento -->
                    <h4 class="section-title">Detalle Técnico e Inversión Seleccionada</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Tratamiento / Procedimiento</th>
                                <th>Pieza/Cara</th>
                                <th style="text-align: right;">Inversión (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeItems.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No se registran procedimientos en el plan sugerido</td></tr>' :
                activeItems.map(i => `
                                <tr>
                                    <td>${i.nombre}</td>
                                    <td>${i.diente || 'General'}</td>
                                    <td style="text-align: right;">$${parseFloat(i.costo).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Resumen Financiero -->
                    <div class="summary-container">
                        <div class="summary-box">
                            <div class="summary-row">
                                <span class="total-label">Total Presupuestado:</span>
                                <span>$${totalGeneral.toFixed(2)}</span>
                            </div>
                            <div class="summary-row" style="color: #059669;">
                                <span class="abono-label">Total Abonado:</span>
                                <span>-$${totalAbonadoGeneral.toFixed(2)}</span>
                            </div>
                            <div class="summary-row saldo-row">
                                <span>Saldo Pendiente:</span>
                                <span>$${saldoGeneral.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Planes de Tratamiento Adicionales (si hay más de 1 presupuesto) -->
                    ${presupuestos.length > 1 ? `
                    <h4 class="section-title">Planes de Tratamiento Adicionales</h4>
                    ${presupuestosHTML}
                    ` : ''}

                    <!-- EVOLUCIÓN CLÍNICA (Timeline para Reporte) -->
                    <h4 class="section-title">Evolución Clínica y Notas del Especialista</h4>
                    <div style="margin-top: 15px;">
                        ${(patientDoc['plan_tratamiento_json'] && patientDoc['plan_tratamiento_json'].length > 0) ?
                patientDoc['plan_tratamiento_json'].map(h => `
                                <div style="margin-bottom: 20px; border-left: 2px solid #00BFA6; padding-left: 15px; page-break-inside: avoid;">
                                    <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">
                                        ${new Date(h.fecha).toLocaleString()} - ${h.doctor || 'Dra. Lucía Quintero'}
                                    </p>
                                    <p style="font-size: 11px; color: #334155; line-height: 1.5; font-weight: 500;">
                                        ${h.nota}
                                    </p>
                                </div>
                            `).join('') :
                '<p style="font-size: 10px; color: #94a3b8; font-style: italic;">No se registran procedimientos previos realizados o notas de evolución.</p>'
            }
                    </div>

                    <!-- Firmas -->
                    <div class="signatures">
                        <div class="signature-line">
                            <p class="signature-label">Dra. Lucía Quintero</p>
                            <p class="signature-sub">Odontopediatría / Especialista</p>
                        </div>
                        <div class="signature-line">
                            <p class="signature-label">Paciente / Representante</p>
                            <p class="signature-sub">Confirmación de Aceptación</p>
                        </div>
                    </div>

                    <!-- Footer Legal con QR -->
                    <div class="footer" style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="margin-bottom: 10px;">
                                <img src="jvcreative.png" alt="JVCreative" style="max-height: 25px; opacity: 0.6;">
                            </div>
                            <div style="font-size: 7px; color: #94a3b8; margin-top: 5px;">Documento verificado</div>
                            Este documento es un reporte médico informativo con validez de 15 días tras su emisión.<br>
                            S.A.C.H. - Sistema de Administración Clínica Holográfica | Neo-Medical Style | Powered by JVCreative
                        </div>
                        <div style="text-align: right;">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Dra%20Lucía%20Quintero%20-%20Paciente:%20${encodeURIComponent(patientDoc['NOMBRE DEL PACIENTE'])}%20-%20Fecha:${encodeURIComponent(new Date().toLocaleDateString())}%20Hora:${encodeURIComponent(new Date().toLocaleTimeString())}" alt="Código de Verificación" style="width: 80px; height: 80px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <div style="font-size: 7px; color: #94a3b8; margin-top: 5px;">Verificación</div>
                        </div>
                    </div>
                </div>

                <div class="no-print" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);">
                    <button onclick="window.print()" style="padding: 12px 30px; background: #0F4C5C; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">LANZAR IMPRESIÓN OFICIAL</button>
                </div>
            </body>
        </html>
    `);
    printWin.document.close();

    // Limpieza de overlay después de abrir la ventana
    setTimeout(() => {
        if (loadingOverlay.parentNode) document.body.removeChild(loadingOverlay);
    }, 1000);
};



/**
 * Abre la vista de Agenda con el paciente preseleccionado.
 * Al cambiar a la vista de Agenda, el módulo agenda.js detecta
 * 'preselected_patient_id' en sessionStorage y abre el modal automáticamente.
 * @param {string|number} patientId - ID interno del paciente en Supabase
 */
window.openAptFromPatient = (patientId) => {
    const p = currentPatients.find(pt => pt.id == patientId);
    if (!p) {
        console.error('openAptFromPatient: Paciente no encontrado con id', patientId);
        return;
    }
    // Guardar el ID para que agenda.js lo recoja al montar
    sessionStorage.setItem('preselected_patient_id', String(patientId));
    // Navegar a la vista de Agenda
    if (typeof window.dispatchView === 'function') {
        window.dispatchView('agenda');
    } else {
        // Fallback: disparar evento por si acaso
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'agenda' } }));
    }
};

// Global Listeners for Search con Debounce (300ms)
let searchTimeout;
document.addEventListener('input', (e) => {
    if (e.target.id === 'patient-search') {
        clearTimeout(searchTimeout);
        currentPage = 1;
        
        const listBody = document.getElementById('patients-list-body');
        if (listBody && e.target.value.trim() !== '') {
            listBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center"><span class="text-secondary font-bold animate-pulse text-[10px] tracking-widest uppercase">Buscando...</span></td></tr>`;
        }

        searchTimeout = setTimeout(async () => {
            const termo = e.target.value.trim();
            if (termo !== '') {
                const { data, error } = await supabase
                    .from('PACIENTES')
                    .select('*')
                    .or(`"NOMBRE DEL PACIENTE".ilike.%${termo}%,"ID DEL PACIENTE".ilike.%${termo}%`)
                    .limit(50);
                if (!error && data) {
                    currentPatients = data;
                }
            }
            loadPatients(termo);
        }, 300);
    }
});

/**
 * MÓDULO DE ARCHIVO VISUAL (Rx / FOTOS / PDF)
 * Implementado por Antigravity para Dra. Lucía Quintero.
 */
async function renderVisualArchive(container, p) {
    const pId = p.id;
    const images = p.imagenes_json || [];

    container.innerHTML = `
        <div class="bg-white rounded-card border border-black/5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700 shadow-sm hover:shadow-md transition-all">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-black/5 group overflow-hidden">
                        <img src="logo-lucia.png" class="w-8 h-8 object-contain group-hover:scale-110 transition-transform" onerror="this.src='whatsapp.svg'; this.style.opacity='0.2'">
                    </div>
                    <div>
                        <h4 class="text-sm font-display font-extrabold text-primary tracking-tight">Archivo Visual</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[7px] font-extrabold uppercase tracking-widest">Neo-Medical</span>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${images.length}/3</p>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button onclick="window.uploadVisualFile('${pId}')" 
                            ${images.length >= 3 ? 'disabled title="Límite alcanzado"' : ''}
                            class="flex-grow md:flex-grow-0 px-4 py-2 bg-primary text-white rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all shadow-glow group disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg class="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-width="3"/></svg>
                        Subir
                    </button>
                    <button onclick="window.openVisualGallery('${pId}')" class="flex-grow md:flex-grow-0 px-4 py-2 bg-white text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all border border-black/5 shadow-sm">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                        Ver
                    </button>
                </div>
            </div>
            <div class="p-4">
                ${images.length === 0 ? `
                    <div class="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                            <svg class="w-6 h-6 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="2"/></svg>
                        </div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin archivos</p>
                        <p class="text-[9px] text-slate-300 font-medium mt-1 max-w-xs text-center">Máximo 3 archivos</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        ${images.map((img, idx) => `
                            <div onclick="window.openVisualGallery('${pId}', ${idx})" class="aspect-video rounded-3xl border border-black/5 bg-slate-50 overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500">
                                ${img.type?.includes('pdf') ? `
                                    <div class="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                                        <div class="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                                            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-6-6H7zm6 7V4.5L17.5 9H13z"/></svg>
                                        </div>
                                        <p class="text-[10px] font-bold text-slate-500 text-center truncate w-full px-2">${img.name || 'documento.pdf'}</p>
                                    </div>
                                ` : `
                                    <img src="${img.url}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700">
                                `}
                                <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                    <div class="text-white">
                                        <p class="text-[10px] font-bold truncate w-32">${img.name}</p>
                                        <p class="text-[8px] font-medium opacity-80 uppercase">${new Date(img.date).toLocaleDateString()}</p>
                                    </div>
                                    <div class="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
        <input type="file" id="visual-file-input-${pId}" class="hidden" accept="image/png, image/jpeg, application/pdf" onchange="window.handleVisualFileUpload(event, '${pId}')">
    `;
}

window.uploadVisualFile = (pId) => {
    const input = document.getElementById(`visual-file-input-${pId}`);
    if (input) input.click();
};

window.handleVisualFileUpload = async (event, pId) => {
    const file = event.target.files[0];
    if (!file) return;

    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    // --- REQUERIMIENTOS DE SEGURIDAD JVCreative ---
    const images = p.imagenes_json || [];

    // 1. Límite de cantidad
    if (images.length >= 3) {
        alert('LÍMITE ALCANZADO: El sistema Neo-Medical permite un máximo de 3 archivos por paciente para garantizar una carga ultrarápida.');
        event.target.value = '';
        return;
    }

    // 2. Límite de peso (500KB)
    if (file.size > 500 * 1024) {
        alert('ARCHIVO DEMASIADO GRANDE: El peso máximo permitido es de 500 KB por imagen. Por favor, optimice su archivo antes de subirlo.');
        event.target.value = '';
        return;
    }

    // Loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-white/60 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-300';
    overlay.innerHTML = `
        <div class="relative w-20 h-20 mb-6">
            <div class="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center">
                <img src="logo-lucia.png" class="w-8 h-8 opacity-40 animate-pulse">
            </div>
        </div>
        <p class="text-[11px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">Optimizando Archivo...</p>
    `;
    document.body.appendChild(overlay);

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${p['ID DEL PACIENTE']}_${Date.now()}.${fileExt}`;
        const filePath = `${p['ID DEL PACIENTE']}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('pacientes-adjuntos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Bucket es PRIVADO: en vez de URL publica, guardamos solo el path
        // y generamos Signed URLs al vuelo en la galeria (validas 60 min)
        const { data: signedData, error: signErr } = await supabase.storage
            .from('pacientes-adjuntos')
            .createSignedUrl(filePath, 3600);

        const resolvedUrl = signedData?.signedUrl || filePath;

        const newImage = {
            name: file.name,
            url: resolvedUrl,
            date: new Date().toISOString(),
            type: file.type,
            path: filePath   // path permanente; URL se regenera si expira
        };

        images.unshift(newImage); // Newest first
        p.imagenes_json = images;

        await supabase.from('PACIENTES').update({ 'imagenes_json': images }).eq('id', pId);

        // Refresh UI
        window.renderizarModuloClinico(pId, 'odontograma');
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        alert('ERROR DE CONEXIÓN: No se pudo subir el archivo. Verifique que el bucket "pacientes-adjuntos" esté configurado en Supabase.');
    } finally {
        if (overlay.parentNode) document.body.removeChild(overlay);
        event.target.value = ''; // Clean input
    }
};

window.openVisualGallery = async (pId, startIdx = 0) => {
    const p = currentPatients.find(patient => patient.id == pId);
    if (!p) return;

    let images = p.imagenes_json || [];
    if (images.length === 0) {
        alert('No hay imagenes para mostrar en la galeria.');
        return;
    }

    // BUCKET PRIVADO: Regenerar Signed URLs (validas 60 min) para cada archivo
    images = await Promise.all(images.map(async (img) => {
        if (!img.path) return img; // imagen de PoC con URL externa directa
        try {
            const { data } = await supabase.storage
                .from('pacientes-adjuntos')
                .createSignedUrl(img.path, 3600);
            return { ...img, url: data?.signedUrl || img.url };
        } catch { return img; }
    }));
    // Actualizar cache local con URLs frescas
    p.imagenes_json = images;

    const gallery = document.createElement('div');
    gallery.id = 'visual-gallery-modal';
    gallery.className = 'fixed inset-0 bg-dark/95 backdrop-blur-xl z-[10000] flex flex-col animate-in fade-in duration-500';
    gallery.innerHTML = `
        <div class="h-20 flex items-center justify-between px-8 border-b border-white/5">
            <div>
                <h3 class="text-white text-lg font-display font-bold">Diagnóstico Visual: ${p['NOMBRE DEL PACIENTE']}</h3>
                <p class="text-white/40 text-[9px] font-bold uppercase tracking-widest">${images.length} Archivos Disponibles</p>
            </div>
            <!-- Zoom Controls -->
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/5">
                    <button id="gallery-zoom-out" title="Reducir (-)" onclick="window.adjustGalleryZoom(-0.25)" class="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all font-bold text-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M11 6v10M6 11h10" stroke-width="2.5"/></svg>
                    </button>
                    <span id="gallery-zoom-label" class="text-white/50 text-[10px] font-bold uppercase tracking-widest w-12 text-center select-none">100%</span>
                    <button id="gallery-zoom-in" title="Ampliar (+)" onclick="window.adjustGalleryZoom(0.25)" class="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all font-bold text-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M11 6v10M6 11h10M11 16V6" stroke-width="2.5"/></svg>
                    </button>
                    <button id="gallery-zoom-reset" title="Restablecer zoom" onclick="window.resetGalleryZoom()" class="w-9 h-9 rounded-xl bg-white/5 hover:bg-accent/30 text-white/40 hover:text-accent flex items-center justify-center transition-all ml-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-width="2.5"/></svg>
                    </button>
                </div>
                <button onclick="window.closeVisualGallery()" class="w-12 h-12 bg-white/5 text-white/60 hover:text-white rounded-2xl flex items-center justify-center transition-all ml-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                </button>
            </div>
        </div>
        
        <div class="flex-grow overflow-hidden flex flex-col md:flex-row p-8 gap-8">
            <!-- Main Preview -->
            <div id="gallery-viewport" class="flex-grow bg-white/5 rounded-3xl overflow-hidden flex items-center justify-center relative shadow-inner border border-white/5" style="cursor:grab">
                <div id="gallery-main-view" class="w-full h-full flex items-center justify-center">
                    <!-- Dynamic -->
                </div>
                <!-- Zoom hint badge -->
                <div id="gallery-zoom-hint" class="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-white/40 text-[9px] font-bold uppercase tracking-widest opacity-0 transition-opacity duration-500 pointer-events-none select-none">
                    🔍 Scroll para zoom · Arrastra para mover
                </div>
            </div>
            
            <!-- Sidebar / Thumbnails -->
            <div class="w-full md:w-80 flex-shrink-0 flex flex-col gap-4">
                <h4 class="text-white/20 text-[9px] font-bold uppercase tracking-widest ml-2">Índice de Archivos</h4>
                <div class="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[60vh] md:max-h-full">
                    ${images.map((img, idx) => `
                        <button onclick="window.selectGalleryImage(${idx})" id="thumb-${idx}" class="gallery-thumb w-full flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-primary/50 transition-all text-left group">
                            <div class="w-16 h-16 flex-shrink-0 bg-dark rounded-lg overflow-hidden border border-white/10 group-hover:border-primary/30 transition-all">
                                ${img.type?.includes('pdf') ? `
                                    <div class="w-full h-full flex items-center justify-center text-red-400">
                                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-6-6H7zm6 7V4.5L17.5 9H13z"/></svg>
                                    </div>
                                ` : `
                                    <img src="${img.url}" class="w-full h-full object-cover">
                                `}
                            </div>
                            <div class="overflow-hidden">
                                <p class="text-white/80 text-[11px] font-bold truncate">${img.name || 'Archivo'}</p>
                                <p class="text-white/30 text-[9px] font-bold uppercase mt-1">${new Date(img.date).toLocaleDateString()}</p>
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <button onclick="window.deleteCurrentImage()" class="mt-4 w-full h-14 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                    Eliminar Archivo Actual
                </button>
            </div>
        </div>
    `;

    // Asignar estado ANTES de insertar en DOM para evitar race conditions
    window._galleryImages = images;
    window._currentGalleryIdx = startIdx;
    window._currentPatientId = pId;
    window._galleryZoom = 1;
    window._galleryPanX = 0;
    window._galleryPanY = 0;
    document.body.appendChild(gallery);
    window.selectGalleryImage(startIdx);

    // ── ZOOM CON RUEDA DEL MOUSE ──
    const viewport = document.getElementById('gallery-viewport');
    if (viewport) {
        viewport.addEventListener('wheel', (e) => {
            const img = window._galleryImages?.[window._currentGalleryIdx];
            if (img?.type?.includes('pdf')) return; // no zoom en PDF
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            window.adjustGalleryZoom(delta);
        }, { passive: false });

        // ── DRAG / PAN cuando zoom > 1 ──
        let isDragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
        viewport.addEventListener('mousedown', (e) => {
            if (window._galleryZoom <= 1) return;
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            panStartX = window._galleryPanX;
            panStartY = window._galleryPanY;
            viewport.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            window._galleryPanX = panStartX + (e.clientX - dragStartX);
            window._galleryPanY = panStartY + (e.clientY - dragStartY);
            window._applyGalleryTransform();
        });
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                viewport.style.cursor = window._galleryZoom > 1 ? 'grab' : 'default';
            }
        });

        // ── HINT BADGE (aparece 3s al abrir) ──
        const hint = document.getElementById('gallery-zoom-hint');
        if (hint) {
            setTimeout(() => { hint.style.opacity = '1'; }, 400);
            setTimeout(() => { hint.style.opacity = '0'; }, 3400);
        }
    }
};

window.selectGalleryImage = (idx) => {
    window._currentGalleryIdx = idx;
    // Resetear zoom al cambiar imagen
    window._galleryZoom = 1;
    window._galleryPanX = 0;
    window._galleryPanY = 0;
    const img = window._galleryImages[idx];
    const main = document.getElementById('gallery-main-view');
    const viewport = document.getElementById('gallery-viewport');

    // Highlight thumb
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('border-primary', 'bg-primary/10'));
    document.getElementById(`thumb-${idx}`)?.classList.add('border-primary', 'bg-primary/10');

    // Ocultar/mostrar controles de zoom según tipo
    const zoomControls = document.getElementById('gallery-zoom-out')?.closest('.flex.items-center.gap-1');

    if (img.type?.includes('pdf')) {
        if (zoomControls) zoomControls.style.opacity = '0.3';
        if (viewport) viewport.style.cursor = 'default';
        main.innerHTML = `
            <div class="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                <svg class="w-24 h-24 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-6-6H7zm6 7V4.5L17.5 9H13z"/></svg>
                <div class="text-center">
                    <p class="text-white font-bold text-lg mb-4">${img.name}</p>
                    <a href="${img.url}" target="_blank" class="px-8 py-3 bg-white text-dark rounded-xl font-bold uppercase text-[11px] tracking-widest hover:scale-110 transition-transform inline-block">Abrir Documento PDF</a>
                </div>
            </div>
        `;
    } else {
        if (zoomControls) zoomControls.style.opacity = '1';
        if (viewport) viewport.style.cursor = 'grab';
        main.innerHTML = `
            <img id="gallery-zoom-img" src="${img.url}"
                style="max-width:100%; max-height:80vh; object-fit:contain; border-radius:0.75rem;
                       transform-origin:center center; transform:scale(1) translate(0px,0px);
                       transition:transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94); display:block; user-select:none; pointer-events:none;"
                class="animate-in fade-in zoom-in-95 duration-500" draggable="false">
            <div class="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-dark/60 backdrop-blur-md rounded-full border border-white/10 text-white/70 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">
                ${img.name} · ${idx + 1}/${window._galleryImages.length}
            </div>
        `;
    }
    window._updateZoomLabel();
};

// ── HELPERS DE ZOOM ──
window._applyGalleryTransform = () => {
    const img = document.getElementById('gallery-zoom-img');
    if (!img) return;
    const z = window._galleryZoom;
    const px = window._galleryPanX;
    const py = window._galleryPanY;
    img.style.transform = `scale(${z}) translate(${px / z}px, ${py / z}px)`;
    const viewport = document.getElementById('gallery-viewport');
    if (viewport) viewport.style.cursor = z > 1 ? 'grab' : 'default';
};

window._updateZoomLabel = () => {
    const label = document.getElementById('gallery-zoom-label');
    if (label) label.textContent = Math.round((window._galleryZoom || 1) * 100) + '%';
};

window.adjustGalleryZoom = (delta) => {
    const MIN = 0.5, MAX = 4;
    window._galleryZoom = Math.min(MAX, Math.max(MIN, (window._galleryZoom || 1) + delta));
    if (window._galleryZoom <= 1) { window._galleryPanX = 0; window._galleryPanY = 0; }
    window._applyGalleryTransform();
    window._updateZoomLabel();
};

window.resetGalleryZoom = () => {
    window._galleryZoom = 1;
    window._galleryPanX = 0;
    window._galleryPanY = 0;
    window._applyGalleryTransform();
    window._updateZoomLabel();
};

window.closeVisualGallery = () => {
    const modal = document.getElementById('visual-gallery-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'transition-opacity');
        setTimeout(() => modal.remove(), 300);
    }
};

window.deleteCurrentImage = async () => {
    const idx = window._currentGalleryIdx ?? 0;
    const img = window._galleryImages?.[idx];
    const pId = window._currentPatientId;

    if (!img || pId === undefined || pId === null) {
        console.error('[SACH] deleteCurrentImage: estado invalido', { idx, img, pId });
        return;
    }

    // ── DIALOGO INLINE (en vez de confirm() que browsers bloquean en modales) ──
    const confirmed = await new Promise((resolve) => {
        const dlg = document.createElement('div');
        dlg.id = 'delete-confirm-overlay';
        dlg.className = 'fixed inset-0 z-[12000] flex items-center justify-center p-6';
        dlg.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
                <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
                </div>
                <h3 class="text-center font-display font-extrabold text-dark text-lg mb-2">Eliminar Archivo</h3>
                <p class="text-center text-slate-500 text-sm mb-8">
                    "<strong>${img.name}</strong>" sera eliminado<br>permanentemente del sistema.
                </p>
                <div class="flex gap-3">
                    <button id="dlg-cancel-btn" class="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button id="dlg-confirm-btn" class="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all">Si, Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(dlg);
        document.getElementById('dlg-cancel-btn').onclick = () => { dlg.remove(); resolve(false); };
        document.getElementById('dlg-confirm-btn').onclick = () => { dlg.remove(); resolve(true); };
    });

    if (!confirmed) return;

    // ── OVERLAY DE PROCESO ──
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-dark/80 backdrop-blur-md z-[11000] flex flex-col items-center justify-center';
    overlay.innerHTML = `
        <div class="relative w-16 h-16 mb-4">
            <div class="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-t-red-500 rounded-full animate-spin"></div>
        </div>
        <p class="text-white text-[11px] font-bold uppercase tracking-[0.2em] animate-pulse">Eliminando archivo...</p>
    `;
    document.body.appendChild(overlay);

    try {
        // PASO 1: Borrar del Storage (solo archivos reales con path)
        if (img.path && img.path.length > 0) {
            const { error: storageErr } = await supabase.storage
                .from('pacientes-adjuntos')
                .remove([img.path]);
            if (storageErr) {
                console.warn('[SACH] Storage remove warning (no fatal):', storageErr.message);
            } else {
                console.log('[SACH] Storage: archivo eliminado ->', img.path);
            }
        } else {
            console.log('[SACH] URL externa (PoC) - omitiendo borrado de Storage.');
        }

        // PASO 2: Actualizar imagenes_json en PACIENTES
        const newImages = (window._galleryImages || []).filter((_, i) => i !== idx);

        const { error: dbErr } = await supabase
            .from('PACIENTES')
            .update({ 'imagenes_json': newImages })
            .eq('id', pId)
            .select();

        if (dbErr) throw new Error('DB error: ' + dbErr.message);
        console.log('[SACH] DB: imagenes_json actualizado. Quedan:', newImages.length);

        // PASO 3: Actualizar estado local
        const p = currentPatients.find(patient => String(patient.id) === String(pId));
        if (p) {
            p.imagenes_json = newImages;
            window._galleryImages = newImages;
        }

    } catch (err) {
        console.error('[SACH] Error eliminando imagen:', err);
        if (overlay.parentNode) document.body.removeChild(overlay);
        // Toast de error
        const errToast = document.createElement('div');
        errToast.className = 'fixed bottom-8 right-8 z-[13000] bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-3';
        errToast.textContent = 'Error al eliminar. Revise la consola.';
        document.body.appendChild(errToast);
        setTimeout(() => errToast.remove(), 4000);
        return;
    }

    if (overlay.parentNode) document.body.removeChild(overlay);

    // PASO 4: Cerrar galeria y refrescar modulo
    window.closeVisualGallery();
    window.renderizarModuloClinico(pId, 'odontograma');

    // Toast de exito
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 right-8 z-[12000] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl text-[11px] font-bold uppercase tracking-widest animate-in slide-in-from-bottom-4 duration-500 flex items-center gap-3';
    toast.innerHTML = `
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3"/></svg>
        Archivo eliminado correctamente
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3000);
};

/**
 * ── BORRADO EN CASCADA (NEO-MEDICAL PERFORMANCE) ──
 * Implementado por Antigravity para Dra. Lucía Quintero.
 * Elimina registros en CITAS, ABONO, PACIENTES y STORAGE.
 */
window.eliminarPaciente = async (id) => {
    const p = currentPatients.find(patient => String(patient.id) === String(id));
    if (!p) {
        console.error('[SACH] eliminarPaciente: No se encontró al paciente en el cache local.');
        return;
    }

    const cedula = p['ID DEL PACIENTE'];
    const nombre = p['NOMBRE DEL PACIENTE'];

    // Neo-Medical UX: Confirmación Crítica
    const currentUser = sessionStorage.getItem('sach_logged_user') || 'Dra. Lucía';

    const confirmed = await new Promise((resolve) => {
        const dlg = document.createElement('div');
        dlg.id = 'delete-patient-confirm';
        dlg.className = 'fixed inset-0 z-[12000] flex items-center justify-center p-6';
        dlg.innerHTML = `
            <div class="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md"></div>
            <div class="relative bg-white rounded-[32px] shadow-2xl p-10 max-w-md w-full animate-in zoom-in-95 duration-300 border border-red-100">
                <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-red-50">
                    <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3 class="text-center font-display font-extrabold text-dark text-xl mb-4 tracking-tight">ADVERTENCIA CRÍTICA</h3>
                <p class="text-center text-slate-500 text-sm leading-relaxed mb-10">
                    ⚠️ ¿Está seguro(a), **${currentUser}**? Esta acción es **IRREVERSIBLE**.<br><br>
                    Se eliminarán permanentemente todos los presupuestos, fotos, citas e historial clínico de:<br>
                    <span class="text-dark font-bold text-base block mt-2">"${nombre}"</span>
                </p>
                <div class="flex gap-4">
                    <button id="p-del-cancel" class="flex-1 h-14 bg-slate-100 text-slate-600 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button id="p-del-confirm" class="flex-1 h-14 bg-red-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)]">ELIMINAR TODO</button>
                </div>
            </div>
        `;
        document.body.appendChild(dlg);
        document.getElementById('p-del-cancel').onclick = () => { dlg.remove(); resolve(false); };
        document.getElementById('p-del-confirm').onclick = () => { dlg.remove(); resolve(true); };
    });

    if (!confirmed) return;

    // Overlay de Proceso Escénico
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-[#0f172a] z-[13000] flex flex-col items-center justify-center animate-in fade-in duration-500';
    overlay.innerHTML = `
        <div class="relative w-24 h-24 mb-8">
            <div class="absolute inset-0 border-4 border-red-500/10 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center">
                <svg class="w-10 h-10 text-red-500/50 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
            </div>
        </div>
        <p class="text-white text-[12px] font-bold uppercase tracking-[0.3em] animate-pulse">Borrando en Cascada Neo-Medical...</p>
        <p class="text-slate-500 text-[9px] font-medium mt-4 uppercase tracking-[0.1em]">Limpiando CITAS · ABONOS · STORAGE · PACIENTES</p>
    `;
    document.body.appendChild(overlay);

    try {
        // PASO 1: ELIMINAR CITAS (Usando cédula)
        if (cedula) {
            await supabase.from('CITAS').delete().eq('ID DEL PACIENTE', cedula);
            console.log('[SACH] Citas eliminadas para:', cedula);
        }

        // PASO 2: ELIMINAR ABONOS (Usando cédula)
        if (cedula) {
            await supabase.from('ABONO').delete().eq('ID_PACIENTE', cedula);
            console.log('[SACH] Abonos/Pagos eliminados para:', cedula);
        }

        // PASO 3: LIMPIEZA DE STORAGE (Bucket: pacientes-adjuntos)
        if (cedula) {
            console.log('[SACH] Iniciando limpieza de Storage para:', cedula);
            const { data: files } = await supabase.storage.from('pacientes-adjuntos').list(cedula);
            if (files && files.length > 0) {
                const pathsToDelete = files.map(f => `${cedula}/${f.name}`);
                const { error: storageErr } = await supabase.storage.from('pacientes-adjuntos').remove(pathsToDelete);
                if (storageErr) console.warn('[SACH] Error parcial en Storage:', storageErr.message);
                else console.log('[SACH] Archivos de Storage eliminados:', pathsToDelete.length);
            }
        }

        // PASO 4: ELIMINAR PACIENTE (Referencia Principal)
        const { error: delErr } = await supabase.from('PACIENTES').delete().eq('id', id);
        if (delErr) throw delErr;

        console.log('[SACH] Cascada completada con éxito.');

        // UI Refresh & Redirection
        window.closePatientModal();
        if (typeof loadPatients === 'function') {
            loadPatients(''); // Refrescar lista principal
        } else {
            window.location.reload(); // Fallback
        }

        if (overlay.parentNode) document.body.removeChild(overlay);

        // Neo-Medical Success Toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 z-[14000] bg-emerald-600 text-white px-8 py-5 rounded-[24px] shadow-2xl text-[11px] font-bold uppercase tracking-[0.2em] animate-in slide-in-from-bottom-10 duration-700 flex items-center gap-4';
        toast.innerHTML = `
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            Expediente eliminado correctamente del sistema S.A.C.H.
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.replace('animate-in', 'animate-out');
            toast.classList.add('fade-out', 'translate-y-20');
            setTimeout(() => toast.remove(), 700);
        }, 4000);

    } catch (err) {
        console.error('[SACH] ERROR CRÍTICO EN BORRADO:', err);
        if (overlay.parentNode) document.body.removeChild(overlay);

        const errToast = document.createElement('div');
        errToast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 z-[14000] bg-red-600 text-white px-8 py-5 rounded-[24px] shadow-2xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-4';
        errToast.textContent = 'ERROR EN EL BORRADO: Detenido por seguridad.';
        document.body.appendChild(errToast);
        setTimeout(() => errToast.remove(), 5000);
    }
};
