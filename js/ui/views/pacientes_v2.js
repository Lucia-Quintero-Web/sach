/**
 * Pacientes Module
 * Neo-Medical Style Implementation
 */
import { Odontogram } from '../components/odontogram.js';
import { supabase } from '../../data/supabase-client.js';
import { sanitizarCelularEcuador, generarMensajeBienvenidaPremium } from '../components/recordatorios.js';

let currentPatients = [];

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
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 class="text-3xl font-display font-extrabold text-dark tracking-tight">Gestión de Pacientes</h2>
                    <p class="text-secondary text-sm font-medium mt-1">Directorio médico centralizado</p>
                </div>
                <button id="btn-nuevo-paciente" onclick="window.openNewPatientModal()" class="sach-button variant-set bg-accent shadow-glow flex items-center gap-2 group">
                    <div class="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="3" stroke-linecap="round"/></svg>
                    </div>
                    Registrar Paciente
                </button>
            </div>

            <!-- Search Bar -->
            <div class="bg-white p-5 rounded-card shadow-soft border-0 flex items-center gap-4 transition-all focus-within:ring-4 focus-within:ring-primary/5">
                <div class="relative flex-grow">
                    <span class="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2.5"/></svg>
                    </span>
                    <input type="text" id="patient-search" placeholder="Buscar por nombre, cédula o diagnóstico..." class="sach-input !bg-slate-50 border-none !pl-14 focus:!bg-white focus:!ring-0">
                </div>
            </div>

            <!-- Patient List Table -->
            <div class="bg-white rounded-card shadow-soft border-0 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificación & Nombre</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edad</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto Directo</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado Clínico</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="patients-list-body" class="divide-y divide-slate-50">
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
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
}

async function loadPatients(query = '') {
    const listBody = document.getElementById('patients-list-body');

    if (!currentPatients.length || query === '') {
        const { data, error } = await supabase.from('PACIENTES').select('*').order('created_at', { ascending: false });
        if (!error && data) currentPatients = data;
    }

    const filtered = currentPatients.filter(p =>
        p['NOMBRE DEL PACIENTE']?.toLowerCase().includes(query.toLowerCase()) ||
        p['ID DEL PACIENTE']?.toString().includes(query)
    );

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="5" class="px-8 py-20 text-center text-slate-400 font-medium font-bold">No se encontraron pacientes registrados con el criterio "${query}".</td></tr>`;
        return;
    }

    listBody.innerHTML = filtered.map(p => {
        const edad = parseInt(p['EDAD']) || 0;
        // NIÑOS < 18 años: fondo lila atenuado | ADULTOS >= 18: fondo azul atenuado
        const rowClass = 'transition-colors group';

        let bgStyle = '';
        if (edad > 0 && edad < 18) {
            bgStyle = 'background-color: rgba(180, 130, 210, 0.18);'; // lila/lavanda visible
        } else if (edad >= 18) {
            bgStyle = 'background-color: rgba(30, 120, 220, 0.07);'; // azul celeste visible
        }

        return `
        <tr class="${rowClass}" style="${bgStyle}">
            <td class="px-6 py-3">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-[10px] bg-primary/5 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                        ${p['NOMBRE DEL PACIENTE']?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div class="font-bold text-dark text-sm leading-tight">${p['NOMBRE DEL PACIENTE']}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cédula: ${p['ID DEL PACIENTE']}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-3">
                <span class="text-sm font-bold text-slate-600">${p['EDAD'] || '-'} años</span>
            </td>
            <td class="px-6 py-3">
                <div class="text-sm font-semibold text-slate-600">${p['CELULAR DEL PACIENTE'] || '-'}</div>
                <div class="text-[11px] font-medium text-slate-400">${p['CORREO'] || 'Sin correo registrado'}</div>
            </td>
            <td class="px-6 py-3">
                 <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,191,166,0.3)]"></span>
                    <span class="text-[10px] font-bold text-accent uppercase tracking-widest">En Tratamiento</span>
                 </div>
            </td>
            <td class="px-6 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="window.openAptFromPatient('${p.id}')" class="sach-button variant-set bg-primary !h-9 !px-3 text-[10px] font-bold shadow-soft">
                        🗓 Agendar
                    </button>
                    <button onclick="window.viewPatientDetail('${p.id}')" class="sach-button variant-unset !h-9 !px-3 text-[10px] font-bold hover:!text-primary hover:!bg-primary/10">
                        Expediente
                    </button>
                    ${p['CELULAR DEL PACIENTE'] ? `
                    <button onclick="window.open('https://wa.me/${sanitizarCelularEcuador(p['CELULAR DEL PACIENTE'])}', '_blank')" class="sach-button !h-9 !px-2.5 bg-[#25D366] hover:bg-[#1DA851] flex items-center justify-center text-white shadow-soft transition-colors" title="WhatsApp Directo">
                        <svg class="w-4 h-4" viewBox="0 0 737.509 740.824">
                            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"/>
                        </svg>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `}).join('');
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
        <div class="flex justify-between items-start mb-8 border-b border-black/5 pb-6">
            <div class="flex items-center gap-5">
                <div class="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-display font-bold shadow-soft">
                    ${nombre.charAt(0)}
                </div>
                <div>
                    <h3 class="text-2xl font-display font-extrabold text-dark tracking-tight leading-tight">${nombre}</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        ID: ${p['ID DEL PACIENTE'] || '-'} <span class="mx-2">|</span> 
                        ${p['EDAD'] || '?'} Años <span class="mx-2">|</span> 
                        ${p['SEXO'] || ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                 ${celular ? `
                    <a href="https://wa.me/${celularLimpio}" target="_blank" class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-200 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-width="2"/></svg>
                    </a>` : ''}
                <button onclick="window.closePatientModal()" class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                </button>
            </div>
        </div>

        <div class="flex items-center justify-between border-b border-black/5 mb-8">
            <div class="flex items-center gap-4">
                <button onclick="window.switchPatientTab('odontograma')" class="tab-btn active px-6 py-4 text-xs font-bold uppercase tracking-widest text-primary border-b-2 border-primary transition-all">Odontograma</button>
                <button onclick="window.switchPatientTab('presupuesto')" class="tab-btn px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b-2 border-transparent hover:text-primary transition-all">Presupuesto</button>
                <button onclick="window.switchPatientTab('historia')" class="tab-btn px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b-2 border-transparent hover:text-primary transition-all">Historia Clínica</button>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.printClinicalRecord('${p.id}')" class="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" stroke-width="2"/></svg>
                    Imprimir 
                </button>
            </div>
        </div>

        <!-- Tabs Content -->
        <div id="patient-tabs-root" class="min-h-[400px] max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <!-- Content loaded dynamically -->
        </div>

        <!-- Footer Actions -->
        <div class="flex gap-4 pt-10 border-t border-black/5 mt-10">
            <button onclick="window.openNewPatientModal('${p.id}')" class="sach-button variant-set bg-primary w-full !h-12 shadow-soft">Editar Datos</button>
            <button onclick="window.closePatientModal()" class="sach-button variant-unset w-full !h-12 border-none bg-slate-50 text-slate-500">Cerrar Expediente</button>
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

        // Garantizar que presupuesto_json sea un objeto con la estructura correcta
        let budgetData = p['presupuesto_json'] || { items: [], abonos: [] };
        if (Array.isArray(budgetData)) budgetData = { items: budgetData, abonos: [] };
        if (!budgetData.items) budgetData.items = [];
        if (!budgetData.abonos) budgetData.abonos = [];

        const odontData = p['odontograma_json'] || {};
        const historyData = p['plan_tratamiento_json'] || [];

        if (tab === 'odontograma') {
            root.innerHTML = `
                <div id="odont-clinical-root"></div>
                <!-- Módulo de Archivo Visual (Rx/Panorámicas) -->
                <div id="visual-archive-root" class="mt-8 pt-8 border-t border-black/5"></div>
            `;
            const odont = new Odontogram('odont-clinical-root', odontData, async (data) => {
                p.odontograma_json = data;
                // PERSIST: We don't wait for DB to update UI
                supabase.from('PACIENTES').update({ 'odontograma_json': data }).eq('id', p.id).then(() => { });
            }, p);
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

async function renderBudgetTab(root, p, budgetObj) {
    let { data: rawCatalog } = await supabase.from('TRATAMIENTOS').select('*');

    const items = budgetObj.items || [];
    const abonos = budgetObj.abonos || [];

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

    const { totalTratamiento, totalAbonado, saldoPendiente } = calcularTotalesPresupuesto(budgetObj);

    root.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <!-- Resumen Financiero -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-slate-50 p-5 rounded-xl border border-black/5">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tratamiento</p>
                        <p class="text-xl font-display font-bold text-primary" id="total-presupuesto-val">$${totalTratamiento.toFixed(2)}</p>
                    </div>
                    <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                        <p class="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Abonado</p>
                        <p class="text-xl font-display font-bold text-emerald-600" id="total-abonado-val">$${totalAbonado.toFixed(2)}</p>
                    </div>
                    <div class="bg-orange-50 p-5 rounded-xl border border-orange-100">
                        <p class="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                        <p class="text-xl font-display font-bold text-orange-600" id="saldo-pendiente-val">$${saldoPendiente.toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-card border border-black/5 overflow-hidden">
                    <div class="px-6 py-4 bg-slate-50/50 border-b border-black/5 flex justify-between items-center">
                        <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Procedimientos Seleccionados</h4>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50">
                            <tr>
                                <th class="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Diente</th>
                                <th class="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Procedimiento</th>
                                <th class="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Costo</th>
                                <th class="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Eliminar</th>
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
                                    <td class="px-6 py-4 text-right font-bold text-slate-600 text-sm">$${item.costo.toFixed(2)}</td>
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
                    <div class="px-6 py-4 bg-slate-50/50 border-b border-black/5 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                             <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Historial de Pagos / Abonos</h4>
                        </div>
                        <button onclick="window.promptAddAbono('${p.id}')" class="px-4 py-2 bg-[#40E0D0]/20 text-[#008080] rounded-xl text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2 hover:bg-[#40E0D0]/40 transition-all group shadow-sm border border-[#40E0D0]/30 border-dashed">
                            <span class="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke-width="3" stroke-linecap="round"/></svg>
                            </span>
                            Registrar Abono
                        </button>
                    </div>
                    <div class="p-0">
                        ${abonos.length === 0 ? `
                            <div class="px-6 py-8 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">No hay pagos registrados</div>
                        ` : `
                            <table class="w-full text-left">
                                <thead class="bg-slate-50/30">
                                    <tr>
                                        <th class="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                                        <th class="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                                        <th class="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                                        <th class="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${abonos.map((a, idx) => `
                                        <tr>
                                            <td class="px-6 py-3">
                                                <p class="text-[11px] font-bold text-dark leading-tight">${new Date(a.fecha).toLocaleDateString()}</p>
                                                <p class="text-[9px] text-slate-400 font-medium">${new Date(a.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </td>
                                            <td class="px-6 py-3">
                                                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">${a.metodo || 'Efectivo'}</span>
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

    // ── OPTIMISTIC UI: ADD TO BUDGET ────────────────────
    window.addToBudget = async (nombre, costo, pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let b = p.presupuesto_json || { items: [], abonos: [] };
        if (Array.isArray(b)) b = { items: b, abonos: [] };
        if (!b.items) b.items = [];

        // OPTIMISTIC UPDATE
        const newItem = {
            nombre,
            costo: parseFloat(costo),
            diente: null, // Manual item
            estado: 'PENDIENTE',
            fecha: new Date().toISOString()
        };
        b.items.push(newItem);
        p.presupuesto_json = b;

        // Visual feedback immediately
        window.renderizarModuloClinico(pId, 'presupuesto');

        // BACKGROUND PERSIST
        supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId).then(({ error }) => {
            if (error) console.error('Error persistiendo presupuesto:', error);
        });
    };

    // ── OPTIMISTIC UI: ABONOS ────────────────────────────
    window.promptAddAbono = async (pId) => {
        const p = currentPatients.find(patient => patient.id == pId);
        if (!p) return;

        let b = p.presupuesto_json || { items: [], abonos: [] };
        if (Array.isArray(b)) b = { items: b, abonos: [] };

        const { totalTratamiento, totalAbonado } = calcularTotalesPresupuesto(b);
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
            nota: nota
        };

        if (!b.abonos) b.abonos = [];
        b.abonos.push(nuevoAbonoJSON);
        b.total_abonado = b.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);

        const nuevoSaldo = totalTratamiento - b.total_abonado;

        // 1. Insertar en tabla maestra ABONO (Finanzas)
        const { error: errorAbono } = await supabase.from('ABONO').insert([{
            'FECHA': new Date().toISOString(),
            'ABONO': monto,
            'SALDO': nuevoSaldo,
            'TIPODEPAGO': metodo.toUpperCase(),
            'RESPONSABLE': responsable,
            'ID_PACIENTE': p['ID DEL PACIENTE'] // Usamos la cédula para relación
        }]);

        if (errorAbono) {
            console.error('Error insertando en tabla ABONO:', errorAbono);
            alert('Se guardó en el expediente pero hubo un error registrándolo en Finanzas.');
        }

        // 2. Actualizar JSON en PACIENTES
        p.presupuesto_json = b;
        window.renderizarModuloClinico(pId, 'presupuesto');

        await supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId);

    };

    window.removeAbono = async (idx, pId) => {
        const p = currentPatients.find(patient => patient.id == pId);

        let b = p.presupuesto_json || { items: [], abonos: [] };
        if (Array.isArray(b)) b = { items: b, abonos: [] };
        if (!b.items) b.items = [];
        if (!b.abonos) b.abonos = [];

        b.abonos.splice(idx, 1);
        b.total_abonado = b.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);

        p.presupuesto_json = b;
        window.renderizarModuloClinico(pId, 'presupuesto');
        supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId).then(() => { });
    };

    window.removeFromBudget = async (idx, pId) => {
        try {
            const p = currentPatients.find(patient => patient.id == pId);
            if (!p) {
                console.warn('El paciente no existe en el array local de carga rápida.');
                return;
            }

            let b = p.presupuesto_json || { items: [], abonos: [] };
            if (Array.isArray(b)) b = { items: b, abonos: [] };
            if (!b.items) b.items = [];
            if (!b.abonos) b.abonos = [];

            const item = b.items[idx];
            if (!item) return;

            // 1. Limpiar Odontograma si tiene dientes asociados
            if (item.diente && String(item.diente).trim() !== '') {
                let odontData = p.odontograma_json || {};

                if (String(item.diente) === 'Dentadura Completa') {
                    // PRÓTESIS TOTAL: Limpiamos todos los dientes
                    odontData = {};
                } else {
                    // Separar los dientes si están agrupados por comas (Ej: "14, 15, 16")
                    const teethIds = String(item.diente).split(',').map(d => d.trim());
                    teethIds.forEach(tId => {
                        if (tId && odontData[tId]) {
                            delete odontData[tId];
                        }
                    });
                }
                p.odontograma_json = odontData;
                // Persistir cambios del odontograma
                supabase.from('PACIENTES').update({ odontograma_json: odontData }).eq('id', pId).then(() => { });
            }

            // 2. Eliminar del presupuesto
            b.items.splice(idx, 1);
            p.presupuesto_json = b;

            window.renderizarModuloClinico(pId, 'presupuesto');
            await supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId);

        } catch (error) {
            console.error('Error procesando eliminación del presupuesto:', error);
            alert('Hubo un error al eliminar el procedimiento. Por favor intente de nuevo.');
        }
    };
}

async function renderHistoryTab(root, p, history) {
    const budget = p.presupuesto_json || { items: [] };
    const items = Array.isArray(budget) ? budget : (budget.items || []);

    const { totalTratamiento, totalAbonado, saldoPendiente } = calcularTotalesPresupuesto(budget);

    root.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- Timeline View -->
            <div class="space-y-8">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Linea de Tiempo Clínica</h4>
                </div>
                <div class="relative border-l-2 border-slate-100 pl-6 space-y-10 py-2">
                    ${history.length === 0 ? `
                        <div class="text-slate-300 font-bold text-[10px] uppercase tracking-widest">Sin historias registradas</div>
                    ` : history.map(h => `
                        <div class="relative">
                            <span class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm z-10"></span>
                            <div class="bg-white p-5 rounded-card border shadow-soft transition-all hover:scale-[1.02]">
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">${new Date(h.fecha).toLocaleString()}</p>
                                <p class="text-sm font-bold text-dark mb-1">${h.doctor}</p>
                                <p class="text-sm text-slate-600 font-medium">${h.nota}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Suggested Treatment Plan -->
            <div class="space-y-10">
                <!-- Financial Status Summary Stick-on-Clinical -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex flex-col items-center">
                        <p class="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Total Pagado</p>
                        <p class="text-2xl font-display font-extrabold text-emerald-600">$${totalAbonado.toFixed(2)}</p>
                        <div class="mt-2 w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                             <div class="h-full bg-emerald-400" style="width: ${Math.min(totalAbonado / (totalTratamiento || 1) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <div class="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex flex-col items-center">
                        <p class="text-[9px] font-bold text-primary/60 uppercase tracking-widest mb-2">Saldo a Cobrar</p>
                        <p class="text-2xl font-display font-extrabold text-primary">$${saldoPendiente.toFixed(2)}</p>
                        <p class="text-[10px] font-bold text-primary/40 uppercase mt-auto">Financiero S.A.C.H.</p>
                    </div>
                </div>

                <div class="bg-slate-50 p-8 rounded-card border border-black/5">
                    <h4 class="text-sm font-display font-extrabold text-primary mb-6 flex items-center gap-2">
                        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-width="2"/></svg>
                        Plan de Tratamiento Sugerido
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
                <div class="bg-white p-8 rounded-card border border-black/5">
                    <h4 class="text-sm font-display font-extrabold text-primary mb-6">Nueva Evolución Clínica</h4>
                    <form id="evolution-form" class="space-y-6">
                        <div class="sach-input-container !mb-0">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Médico Tratante</p>
                            <select id="evo-doctor" class="sach-input bg-slate-50 h-12 font-bold" required>
                                <option value="Dra. Lucía Quintero">Dra. Lucía Quintero</option>
                                <option value="Dr. Sergio Arboleda">Dr. Sergio Arboleda</option>
                            </select>
                        </div>
                        <div class="sach-input-container !mb-0">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Notas de Evolución</p>
                            <textarea id="evo-note" class="sach-input bg-slate-50 !h-32 pt-4 resize-none" placeholder="Escriba la evolución..." required></textarea>
                        </div>
                        <button type="submit" class="sach-button variant-set bg-accent w-full !h-12 shadow-glow">Guardar Entrada</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('evolution-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const note = document.getElementById('evo-note').value;
        const doctor = document.getElementById('evo-doctor').value;
        const newEntry = {
            fecha: new Date().toISOString(),
            doctor: doctor,
            nota: note
        };

        const { data: patient } = await supabase.from('PACIENTES').select('plan_tratamiento_json').eq('id', p.id).single();
        const currentHistory = patient.plan_tratamiento_json || [];
        currentHistory.unshift(newEntry); // Newest first

        await supabase.from('PACIENTES').update({ 'plan_tratamiento_json': currentHistory }).eq('id', p.id);
        window.switchPatientTab('historia'); // Refresh tab
    });

    // Integrated logic to complete treatment from Plan
    window.completeTreatment = async (itemIdx, pId) => {
        if (!confirm('¿Marcar este tratamiento como Realizado? Esto lo moverá a la línea de tiempo y actualizará el odontograma.')) return;

        const { data: patient } = await supabase.from('PACIENTES').select('*').eq('id', pId).single();
        let budget = patient.presupuesto_json || { items: [] };
        if (Array.isArray(budget)) budget = { items: budget, abonos: [] };

        const item = budget.items[itemIdx];
        if (!item) return;

        // 1. Mark as Existente in Budget
        item.estado = 'EXISTENTE';
        item.fecha_completado = new Date().toISOString();

        // 2. Update Odontogram if tooth is linked
        let odont = patient.odontograma_json || {};
        if (item.diente && odont[item.diente]) {
            odont[item.diente].status = 'realizado';
        }

        // 3. Add to Clinical History (Evolution)
        let history = patient.plan_tratamiento_json || [];
        history.unshift({
            fecha: new Date().toISOString(),
            doctor: 'Dra. Lucía Quintero',
            nota: `Procedimiento Completado desde el Plan: ${item.nombre} en diente #${item.diente || '--'}.`
        });

        // 4. Multi-update in Supabase
        await supabase.from('PACIENTES').update({
            presupuesto_json: budget,
            odontograma_json: odont,
            plan_tratamiento_json: history
        }).eq('id', pId);

        // Sync local object for UI refresh
        p.presupuesto_json = budget;
        p.odontograma_json = odont;
        p.plan_tratamiento_json = history;

        window.switchPatientTab('historia');
    };
}

// Import handled at top of file
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
                        <input type="text" id="p-cedula" class="sach-input bg-white font-bold text-primary" required>
                    </div>
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Fecha de Nacimiento</p>
                        <input type="date" id="p-fecha-nac" class="sach-input bg-white font-bold cursor-pointer">
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

function calcularEdad(fechaNac) {
    if (!fechaNac) return null;
    const diff_ms = Date.now() - new Date(fechaNac).getTime();
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970).toString();
}

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

    // Preparar datos financieros
    let b = patientDoc.presupuesto_json || { items: [], abonos: [], total_abonado: 0 };
    if (Array.isArray(b)) b = { items: b, abonos: [], total_abonado: 0 };
    const items = b.items || [];
    const total = items.reduce((acc, i) => acc + (parseFloat(i.costo) || 0), 0);
    const totalAbonado = b.total_abonado || 0;
    const saldo = total - totalAbonado;

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

            const canvas = await html2canvas(odontNode, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: false
            });
            odontImg = canvas.toDataURL('image/png');
        }
    } catch (e) {
        console.warn('Error capturando odontograma para impresión:', e);
    } finally {
        if (hiddenContainer && hiddenContainer.parentNode) {
            document.body.removeChild(hiddenContainer);
        }
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert("El navegador bloqueó la ventana de impresión. Por favor, permita las ventanas emergentes.");
        document.body.removeChild(loadingOverlay);
        return;
    }

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
                        <div class="logo-box">LQ<span style="color: #00BFA6;">.</span></div>
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
                            ${items.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No se registran procedimientos en el plan sugerido</td></tr>' :
            items.map(i => `
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
                                <span>$${total.toFixed(2)}</span>
                            </div>
                            <div class="summary-row" style="color: #059669;">
                                <span class="abono-label">Total Abonado:</span>
                                <span>-$${totalAbonado.toFixed(2)}</span>
                            </div>
                            <div class="summary-row saldo-row">
                                <span>Saldo Pendiente:</span>
                                <span>$${saldo.toFixed(2)}</span>
                            </div>
                        </div>
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

                    <!-- Footer Legal -->
                    <div class="footer">
                        Este documento es un reporte médico informativo con validez de 15 días tras su emisión.<br>
                        S.A.C.H. - Sistema de Administración Clínica Holográfica | Neo-Medical Style
                    </div>
                </div>

                <div class="no-print" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);">
                    <button onclick="window.print()" style="padding: 12px 30px; background: #0F4C5C; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">LANZAR IMPRESIÓN OFICIAL</button>
                </div>

                <script>
                    window.onload = () => {
                        // Opcional: auto-disparar impresión después de cargar las fuentes e imágenes
                        // setTimeout(() => { window.print(); }, 500);
                    };
                </script>
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

        const listBody = document.getElementById('patients-list-body');
        if (listBody && e.target.value.trim() !== '') {
            listBody.innerHTML = `<tr><td colspan="5" class="px-8 py-20 text-center"><span class="text-secondary font-bold animate-pulse text-[10px] tracking-widest uppercase">Buscando Directorio...</span></td></tr>`;
        } else if (listBody && e.target.value.trim() === '') {
            loadPatients('');
            return;
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
            } else {
                currentPatients = [];
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
            <div class="px-6 py-6 bg-slate-50/50 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-soft border border-black/5 group overflow-hidden">
                        <img src="logo-lucia.png" class="w-10 h-10 object-contain group-hover:scale-110 transition-transform" onerror="this.src='whatsapp.svg'; this.style.opacity='0.2'">
                    </div>
                    <div>
                        <h4 class="text-base font-display font-extrabold text-primary tracking-tight">Archivo de Diagnóstico Visual</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="px-2 py-0.5 bg-accent/10 text-accent rounded text-[8px] font-extrabold uppercase tracking-widest">Neo-Medical Suite</span>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacidad: ${images.length}/3 Archivos</p>
                        </div>
                    </div>
                </div>
                <div class="flex gap-3 w-full md:w-auto">
                    <button onclick="window.uploadVisualFile('${pId}')" 
                            ${images.length >= 3 ? 'disabled title="Límite alcanzado"' : ''}
                            class="flex-grow md:flex-grow-0 px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-glow group disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg class="w-4 h-4 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-width="3"/></svg>
                        ⬆ Subir Foto / Rx
                    </button>
                    <button onclick="window.openVisualGallery('${pId}')" class="flex-grow md:flex-grow-0 px-6 py-3 bg-white text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all border border-black/5 shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                        👁 Ver Galería
                    </button>
                </div>
            </div>
            <div class="p-8">
                ${images.length === 0 ? `
                    <div class="flex flex-col items-center justify-center py-14 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-soft mb-6">
                            <svg class="w-10 h-10 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="2"/></svg>
                        </div>
                        <p class="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Sin archivos de diagnóstico</p>
                        <p class="text-[10px] text-slate-300 font-medium mt-2 max-w-xs text-center">Inicie la carga de Rx o fotos clínicas. Máximo 3 archivos de hasta 500KB para optimizar la velocidad.</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
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


