/**
 * Pacientes Module
 * Neo-Medical Style Implementation
 */
import { Odontogram } from '../components/odontogram.js';
import { supabase } from '../../data/supabase-client.js';
import { sanitizarCelularEcuador } from '../components/recordatorios.js';

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
                                <th class="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificación & Nombre</th>
                                <th class="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edad</th>
                                <th class="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto Directo</th>
                                <th class="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado Clínico</th>
                                <th class="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ficha Médica</th>
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
        let rowClass = 'hover:bg-slate-50/50 transition-colors group';

        if (edad < 17 && edad > 0) {
            rowClass = 'bg-accent/[0.03] hover:bg-accent/[0.08] transition-colors group';
        } else if (edad >= 18) {
            rowClass = 'bg-primary/[0.02] hover:bg-primary/[0.06] transition-colors group';
        }

        return `
        <tr class="${rowClass}">
            <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-[14px] bg-primary/5 text-primary flex items-center justify-center text-lg font-bold">
                        ${p['NOMBRE DEL PACIENTE']?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div class="font-bold text-dark text-base">${p['NOMBRE DEL PACIENTE']}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cédula: ${p['ID DEL PACIENTE']}</div>
                    </div>
                </div>
            </td>
            <td class="px-8 py-6">
                <span class="text-sm font-bold text-slate-600">${p['EDAD'] || '-'} años</span>
            </td>
            <td class="px-8 py-6">
                <div class="text-sm font-semibold text-slate-600">${p['CELULAR DEL PACIENTE'] || '-'}</div>
                <div class="text-[11px] font-medium text-slate-400">${p['CORREO'] || 'Sin correo registrado'}</div>
            </td>
            <td class="px-8 py-6">
                 <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,191,166,0.3)]"></span>
                    <span class="text-[10px] font-bold text-accent uppercase tracking-widest">En Tratamiento</span>
                 </div>
            </td>
            <td class="px-8 py-6 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="window.openAptFromPatient('${p.id}')" class="sach-button variant-set bg-primary !h-10 !px-4 text-[10px] font-bold shadow-soft">
                        Agendar Cita
                    </button>
                    <button onclick="window.viewPatientDetail('${p.id}')" class="sach-button variant-unset !h-10 !px-4 text-[10px] font-bold hover:!text-primary hover:!bg-primary/10">
                        Expediente
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

window.viewPatientDetail = async (id) => {
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
            <button onclick="window.printClinicalRecord('${p.id}')" class="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" stroke-width="2"/></svg>
                Imprimir Ficha
            </button>
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
            root.innerHTML = `<div id="odont-clinical-root"></div>`;
            const odont = new Odontogram('odont-clinical-root', odontData, async (data) => {
                p.odontograma_json = data;
                // PERSIST: We don't wait for DB to update UI
                supabase.from('PACIENTES').update({ 'odontograma_json': data }).eq('id', p.id).then(() => { });
            }, p);
            odont.render();
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
                                        <button onclick="window.removeFromBudget(${idx}, '${p.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-2">
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
                        <button onclick="window.promptAddAbono('${p.id}')" class="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 group">
                            <span class="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke-width="3"/></svg>
                            </span>
                            Añadir Abono
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
                                                <button onclick="window.removeAbono(${idx}, '${p.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-2">
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

        const metodo = prompt('Ingrese método de pago:\n(Efectivo, Transferencia, Tarjeta o Otros)', 'Efectivo') || 'Efectivo';
        const nota = prompt('¿Alguna nota adicional? (Opcional):') || '';

        const nuevoAbono = {
            fecha: new Date().toISOString(),
            monto: monto,
            metodo: metodo,
            nota: nota
        };

        if (!b.abonos) b.abonos = [];
        b.abonos.push(nuevoAbono);
        // Recalcular total_abonado por compatibilidad legacy
        b.total_abonado = b.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);

        p.presupuesto_json = b;
        window.renderizarModuloClinico(pId, 'presupuesto');

        supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId).then(() => { });
    };

    window.removeAbono = async (idx, pId) => {
        if (!confirm('¿Desea eliminar este registro de pago de forma definitiva?')) return;
        const p = currentPatients.find(patient => patient.id == pId);

        let b = p.presupuesto_json || { items: [], abonos: [] };
        if (Array.isArray(b)) b = { items: b, abonos: [] };

        b.abonos.splice(idx, 1);
        b.total_abonado = b.abonos.reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0);

        p.presupuesto_json = b;
        window.renderizarModuloClinico(pId, 'presupuesto');
        supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId).then(() => { });
    };

    window.removeFromBudget = async (idx, pId) => {
        if (!confirm('¿Eliminar procedimiento?')) return;
        const p = currentPatients.find(patient => patient.id == pId);

        let b = p.presupuesto_json || { items: [], abonos: [] };
        if (Array.isArray(b)) b = { items: b, abonos: [] };

        b.items.splice(idx, 1);
        p.presupuesto_json = b;
        window.renderizarModuloClinico(pId, 'presupuesto');
        supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId).then(() => { });
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
                console.log('✅ V2 ACTIVATED: Paciente actualizado en Supabase');
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
                console.log('✅ V2 ACTIVATED: Paciente insertado en Supabase con id:', data.id);
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
                console.log('✅ Paciente eliminado en Supabase');
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
    const { data: p } = await supabase.from('PACIENTES').select('*').eq('id', pId).single();
    if (!p) return;

    let b = p.presupuesto_json || { items: [], abonos: [], total_abonado: 0 };
    if (Array.isArray(b)) b = { items: b, abonos: [], total_abonado: 0 };

    const items = b.items || [];
    const total = items.reduce((acc, i) => acc + (parseFloat(i.costo) || 0), 0);
    const totalAbonado = b.total_abonado || 0;
    const saldo = total - totalAbonado;

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <html>
            <head>
                <title>Expediente S.A.C.H - ${p['NOMBRE DEL PACIENTE']}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; }
                    .header { display: flex; justify-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: 800; color: #0f172a; }
                    .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
                    .label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
                    .value { font-size: 14px; font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    th { text-align: left; padding: 12px; background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #64748b; }
                    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                    .totals { float: right; width: 250px; margin-top: 20px; }
                    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-weight: 700; }
                    .primary { color: #5B21B6; font-size: 18px; }
                    .signature { margin-top: 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 100px; }
                    .sign-box { border-top: 1px solid #cbd5e1; text-align: center; padding-top: 10px; font-size: 12px; font-weight: 600; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">S.A.C.H - CLÍNICA DENTAL</div>
                        <div style="font-size: 12px; color: #64748b;">Dra. Lucía Quintero | Cuenca, Ecuador</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="label">Fecha de Emisión</div>
                        <div class="value">${new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <div class="patient-info">
                    <div>
                        <div class="label">Paciente</div>
                        <div class="value">${p['NOMBRE DEL PACIENTE']}</div>
                    </div>
                    <div>
                        <div class="label">Cédula / ID</div>
                        <div class="value">${p['ID DEL PACIENTE']}</div>
                    </div>
                    <div>
                        <div class="label">Edad / Sexo</div>
                        <div class="value">${p['EDAD']} años / ${p['SEXO']}</div>
                    </div>
                    <div>
                        <div class="label">Teléfono</div>
                        <div class="value">${p['CELULAR DEL PACIENTE']}</div>
                    </div>
                </div>

                <div class="label" style="margin-bottom: 10px;">Presupuesto y Plan de Tratamiento</div>
                <table>
                    <thead>
                        <tr>
                            <th>Procedimiento</th>
                            <th style="text-align: right;">Inversión</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(i => `
                            <tr>
                                <td>${i.nombre}</td>
                                <td style="text-align: right;">$${parseFloat(i.costo).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                    <div class="total-row" style="color: #059669;">
                        <span>Total Abonado:</span>
                        <span>-$${totalAbonado.toFixed(2)}</span>
                    </div>
                    <div class="total-row primary" style="border-top: 2px solid #f1f5f9; padding-top: 15px; margin-top: 10px;">
                        <span>Saldo Pendiente:</span>
                        <span>$${saldo.toFixed(2)}</span>
                    </div>
                </div>

                <div style="clear: both; margin-top: 50px; font-size: 11px; color: #64748b; font-style: italic;">
                    Nota: Los presupuestos tienen una vigencia de 30 días. Los tratamientos pueden variar según la evolución clínica del paciente.
                </div>

                <div class="signature">
                    <div class="sign-box">Firma del Profesional</div>
                    <div class="sign-box">Firma del Paciente / Representante</div>
                </div>

                <div style="margin-top: 100px; text-align: center;" class="no-print">
                    <button onclick="window.print()" style="padding: 12px 30px; background: #5B21B6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Imprimir Documento</button>
                </div>
            </body>
        </html>
    `);
    printWin.document.close();
};

// Global Listeners for Search con Debounce (300ms)
let searchTimeout;
document.addEventListener('input', (e) => {
    if (e.target.id === 'patient-search') {
        clearTimeout(searchTimeout);

        // Efecto visual de "Cargando" inmediato
        const listBody = document.getElementById('patients-list-body');
        if (listBody && e.target.value.trim() !== '') {
            listBody.innerHTML = `<tr><td colspan="4" class="px-8 py-20 text-center"><span class="text-secondary font-bold animate-pulse text-[10px] tracking-widest uppercase">Buscando Directorio...</span></td></tr>`;
        } else if (listBody && e.target.value.trim() === '') {
            // Si borran el texto rápido, carga local de inmediato sin debounce
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
                currentPatients = []; // will trigger full refetch
            }

            // Renderizamos
            loadPatients(termo);

        }, 300);
    }
});
