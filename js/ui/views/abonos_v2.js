/**
 * Módulo de Finanzas (Abonos) - S.A.C.H. Neo-Medical Edition
 * Estandarizado por Dante (Arquitecto de Sistemas)
 * Implementado por Antigravity
 */
import { supabase } from '../../data/supabase-client.js';
import { formatCurrency } from '../../utils/calculations.js';

export async function renderAbonosView(container) {
    let abonosList = [];
    let pacientesMap = {};
    
    // Cálculos
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Cargar pacientes para obtener datos de contacto
    try {
        const { data: pacientes } = await supabase
            .from('PACIENTES')
            .select('id, "NOMBRE DEL PACIENTE", "NOMBRE REPRESENTANTE", "CELULAR DEL REPRESENTANTE", "CELULAR DEL PACIENTE", presupuesto_json');
        if (pacientes) {
            pacientes.forEach(p => {
                pacientesMap[p.id] = p;
            });
        }
    } catch (err) {
        console.error('Finanzas: Error cargando pacientes', err);
    }
    
    try {
        const { data, error } = await supabase
            .from('ABONO')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            abonosList = data;
        }
    } catch (err) {
        console.error('Finanzas: Error cargando abonos', err);
    }

    // Calcular métricas
    const total = abonosList.reduce((sum, a) => sum + (parseFloat(a.ABONO) || 0), 0);
    const count = abonosList.length;
    const average = count > 0 ? total / count : 0;
    
    // Ingresos del mes actual
    const monthEarnings = abonosList.reduce((sum, a) => {
        const d = new Date(a.created_at || a.FECHA);
        if (d >= new Date(startOfMonth)) {
            return sum + (parseFloat(a.ABONO) || 0);
        }
        return sum;
    }, 0);

    // Abonos pendientes (si hay campo de estado)
    const pendingCount = abonosList.filter(a => a.ESTADO === 'Pendiente').length;

    let totalPresupuestos = 0;
    try {
        const { data: patients } = await supabase.from('PACIENTES').select('presupuesto_json');
        if (patients) {
            patients.forEach(p => {
                const items = p.presupuesto_json?.items || [];
                totalPresupuestos += items.reduce((sum, item) => sum + (parseFloat(item.costo) || 0), 0);
            });
        }
    } catch (err) {}

    // Realtime
    if (!window._abonosSubscription) {
        window._abonosSubscription = supabase.channel('custom-abonos-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ABONO' }, () => {
                const mainApp = document.getElementById('app');
                if (mainApp) renderAbonosView(mainApp);
            }).subscribe();
    }

    container.innerHTML = `
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- Header -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 class="text-2xl lg:text-3xl font-display font-extrabold text-dark tracking-tight">Finanzas</h2>
                    <p class="text-secondary text-sm font-medium mt-1">Control de ingresos y flujo de caja</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button id="btn-registrar-abono" class="sach-button variant-set bg-accent shadow-glow flex items-center gap-2 group">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                        <span class="text-sm">Registrar</span>
                    </button>
                </div>
            </div>

            <!-- Filtros -->
            <div class="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <select id="filter-fecha" class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold" onchange="window.filterAbonos()">
                    <option value="all">Todas las fechas</option>
                    <option value="today">Hoy</option>
                    <option value="week">Esta semana</option>
                    <option value="month" selected>Este mes</option>
                </select>
                <select id="filter-metodo" class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold" onchange="window.filterAbonos()">
                    <option value="all">Todos los métodos</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cheque">Cheque</option>
                </select>
                <span id="abono-count" class="text-xs font-bold text-slate-400 ml-auto">${abonosList.length} registros</span>
            </div>

            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                ${renderFinanceCard('Este Mes', formatCurrency(monthEarnings), 'bg-emerald-50 text-emerald-600', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 'green')}
                ${renderFinanceCard('Total General', formatCurrency(total), 'bg-primary/10 text-primary', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', 'primary')}
                ${renderFinanceCard('Promedio', formatCurrency(average), 'bg-accent/10 text-accent', 'M9 7h6m0 10v-3m-4 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', 'accent')}
                ${renderFinanceCard('Transacciones', count, 'bg-purple-50 text-purple-600', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2 2 2 0 012 2', 'purple')}
            </div>

            <!-- Transaction History Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-4 lg:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                             <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke-width="2"/></svg>
                        </div>
                        <h3 class="font-bold text-base text-dark">Historial</h3>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Responsable</th>
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">IDENTIFICACIÓN</th>
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Abono</th>
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Pendiente</th>
                                <th class="px-3 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody id="abonos-list-body" class="divide-y divide-slate-50">
                            ${abonosList.length > 0 ? abonosList.slice(0, 20).map(a => renderAbonoRow(a, pacientesMap)).join('') : `
                                <tr>
                                    <td colspan="7" class="px-4 py-16 text-center">
                                        <div class="flex flex-col items-center text-slate-400 gap-2">
                                            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" stroke-width="2"/></svg>
                                            <p class="text-xs font-medium">No hay transacciones registradas</p>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                ${abonosList.length > 20 ? `
                <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
                    <span class="text-xs text-slate-400">Mostrando 20 de ${abonosList.length} transacciones</span>
                </div>
                ` : ''}
            </div>
        </div>

        ${renderAbonoModal()}
    `;

    setupAbonoLogic(abonosList);
}

function renderFinanceCard(title, value, colorClass, path, colorKey = 'primary') {
    const colorMap = {
        green: { bg: 'bg-emerald-500', text: 'text-white' },
        primary: { bg: 'bg-primary', text: 'text-white' },
        accent: { bg: 'bg-accent', text: 'text-white' },
        purple: { bg: 'bg-purple-500', text: 'text-white' }
    };
    const btnColor = colorMap[colorKey] || colorMap.primary;
    
    return `
        <div class="bg-white p-4 lg:p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:-translate-y-0.5 transition-all">
            <div class="space-y-1">
                <p class="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">${title}</p>
                <h3 class="text-xl lg:text-2xl font-display font-extrabold text-dark tabular-nums tracking-tight">${value}</h3>
            </div>
            <div class="w-10 h-10 lg:w-12 lg:h-12 ${colorClass} rounded-xl flex items-center justify-center">
                <svg class="w-5 lg:w-6 h-5 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="${path}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </div>
    `;
}

function renderAbonoRow(a, pacientesMap = {}) {
    const dataObj = new Date(a.created_at || a.FECHA);
    const dateFormatted = dataObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const timeFormatted = dataObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Obtener datos del paciente
    const paciente = pacientesMap[a['ID_PACIENTE']] || {};
    const idPaciente = a['ID_PACIENTE'] || 'S/D';
    const nombrePaciente = a['RESPONSABLE'] || paciente['NOMBRE DEL PACIENTE'] || 'S/N';
    
    // Calcular total (abono + saldo pendiente)
    const montoAbono = parseFloat(a.ABONO) || 0;
    const saldoPendiente = parseFloat(a.SALDO) || 0;
    const montoTotal = montoAbono + saldoPendiente;
    
    const methodColors = {
        'Efectivo': 'bg-green-50 text-green-600 border-green-100',
        'Transferencia': 'bg-blue-50 text-blue-600 border-blue-100',
        'Tarjeta': 'bg-purple-50 text-purple-600 border-purple-100',
        'Cheque': 'bg-amber-50 text-amber-600 border-amber-100'
    };
    const methodClass = methodColors[a['TIPODEPAGO']] || 'bg-slate-50 text-slate-500 border-slate-100';

    return `
        <tr class="hover:bg-slate-50/50 transition-all border-l-2 border-transparent hover:border-accent">
            <td class="px-3 py-3">
                <div class="font-bold text-dark text-xs">${dateFormatted}</div>
                <div class="text-[9px] text-slate-400">${timeFormatted}</div>
            </td>
            <td class="px-3 py-3">
                <div class="font-semibold text-dark text-xs truncate max-w-[140px]" title="${nombrePaciente}">${nombrePaciente}</div>
            </td>
            <td class="px-3 py-3">
                <div class="font-mono text-slate-600 text-[10px]">${idPaciente}</div>
            </td>
            <td class="px-3 py-3">
                 <span class="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-semibold border ${methodClass}">
                    ${a['TIPODEPAGO'] || 'Otros'}
                 </span>
            </td>
            <td class="px-3 py-3 text-right font-bold text-emerald-600 text-xs">
                ${formatCurrency(montoAbono)}
            </td>
            <td class="px-3 py-3 text-right font-bold ${saldoPendiente > 0 ? 'text-amber-500' : 'text-slate-400'} text-xs">
                ${formatCurrency(saldoPendiente)}
            </td>
            <td class="px-3 py-3 text-right font-bold text-primary text-xs">
                ${formatCurrency(montoTotal)}
            </td>
        </tr>
    `;
}

function renderAbonoModal() {
    return `
        <div id="abono-modal" class="sach-modal-backdrop opacity-0 pointer-events-none transition-all duration-300">
            <div class="sach-modal w-full max-w-lg transform scale-95 transition-all duration-300 bg-white p-10 rounded-[32px] shadow-2xl" id="abono-modal-container">
                 <div class="flex justify-between items-start mb-10">
                    <div>
                        <h3 class="text-3xl font-display font-extrabold text-dark tracking-tight">Registro de Abono</h3>
                        <p class="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">Transacción Certificada</p>
                    </div>
                    <button type="button" onclick="window.closeAbonoModal()" class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                 </div>
                 
                 <form id="new-abono-form" class="space-y-8">
                    <div class="sach-input-container">
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Seleccionar Paciente</p>
                         <select id="abono-patient" class="sach-input bg-slate-50 h-14 font-bold border-none" required>
                            <option value="">Cargando directorio...</option>
                         </select>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Monto USD</p>
                             <input type="number" step="0.01" id="abono-amount" class="sach-input !text-accent font-extrabold h-14 bg-slate-50 border-none px-4" placeholder="0.00" required>
                        </div>
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Vía de Pago</p>
                             <select id="abono-method" class="sach-input h-14 font-bold bg-slate-50 border-none" required>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta de Crédito</option>
                                <option value="Otro">Otro</option>
                             </select>
                        </div>
                    </div>

                    <div class="flex gap-4 pt-6">
                        <button type="submit" class="flex-grow sach-button variant-set bg-dark text-white shadow-soft py-5 !h-auto font-bold rounded-2xl" id="btn-submit-abono">Guardar Transacción</button>
                        <button type="button" onclick="window.closeAbonoModal()" class="sach-button variant-unset py-5 !h-auto text-secondary font-bold">Cancelar</button>
                    </div>
                 </form>
            </div>
        </div>
    `;
}

window.filterAbonos = async function() {
    const fechaFilter = document.getElementById('filter-fecha')?.value || 'all';
    const metodoFilter = document.getElementById('filter-metodo')?.value || 'all';
    const tbody = document.getElementById('abonos-list-body');
    const countEl = document.getElementById('abono-count');
    
    if (!tbody) return;
    
    const { data: abonos } = await supabase.from('ABONO').select('*').order('created_at', { ascending: false });
    const { data: pacientes } = await supabase.from('PACIENTES').select('id, "NOMBRE DEL PACIENTE", "NOMBRE REPRESENTANTE", "CELULAR DEL REPRESENTANTE", "CELULAR DEL PACIENTE"');
    
    const pacientesMap = {};
    if (pacientes) {
        pacientes.forEach(p => {
            pacientesMap[p.id] = p;
        });
    }
    
    let filtered = abonos || [];
    
    const now = new Date();
    
    // Filtro por fecha
    if (fechaFilter === 'today') {
        const today = now.toISOString().split('T')[0];
        filtered = filtered.filter(a => (a.created_at || a.FECHA || '').startsWith(today));
    } else if (fechaFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(a => new Date(a.created_at || a.FECHA) >= weekAgo);
    } else if (fechaFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(a => new Date(a.created_at || a.FECHA) >= monthStart);
    }
    
    // Filtro por método
    if (metodoFilter !== 'all') {
        filtered = filtered.filter(a => a['TIPODEPAGO'] === metodoFilter);
    }
    
    // Actualizar contador
    if (countEl) countEl.textContent = `${filtered.length} registros`;
    
    // Renderizar
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-16 text-center">
                    <div class="flex flex-col items-center text-slate-400 gap-2">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" stroke-width="2"/></svg>
                        <p class="text-xs font-medium">No hay transacciones con esos filtros</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = filtered.slice(0, 20).map(a => renderAbonoRow(a, pacientesMap)).join('');
    }
};

async function setupAbonoLogic() {
    // Carga de pacientes para el modal
    const { data: patients } = await supabase.from('PACIENTES').select('id, "NOMBRE DEL PACIENTE", "ID DEL PACIENTE"').order('NOMBRE DEL PACIENTE');
    const patientSelect = document.getElementById('abono-patient');

    if (patientSelect) {
        if (patients && patients.length > 0) {
            patientSelect.innerHTML = `<option value="">Seleccione Paciente...</option>` +
                patients.map(p => `<option value="${p.id}">${p['NOMBRE DEL PACIENTE']} (CC: ${p['ID DEL PACIENTE']})</option>`).join('');

            const lastId = sessionStorage.getItem('last_selected_patient_id');
            if (lastId) {
                patientSelect.value = lastId;
            }
        } else {
            patientSelect.innerHTML = `<option value="">No hay pacientes registrados</option>`;
        }
    }

    // Lógica del Formulario
    const form = document.getElementById('new-abono-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-abono');
            const ogText = btn.innerText;
            btn.innerText = 'Registrando...';
            btn.disabled = true;

            const ptId = parseInt(document.getElementById('abono-patient').value);
            const amount = parseFloat(document.getElementById('abono-amount').value);
            const method = document.getElementById('abono-method').value;

            const { data: patientRecord, error: pError } = await supabase
                .from('PACIENTES')
                .select('*')
                .eq('id', ptId)
                .single();

            if (pError || !patientRecord) {
                alert('No se pudo recuperar la información del paciente.');
                btn.innerText = ogText;
                btn.disabled = false;
                return;
            }

            // Calcular Saldo Basado en Presupuesto
            const presupuesto = patientRecord.presupuesto_json || { items: [], total_abonado: 0 };
            const totalPresupuesto = (presupuesto.items || []).reduce((sum, item) => sum + (parseFloat(item.costo) || 0), 0);
            const totalAbonadoAnterior = parseFloat(presupuesto.total_abonado) || 0;
            const nuevoTotalAbonado = totalAbonadoAnterior + amount;
            const nuevoSaldo = Math.max(0, totalPresupuesto - nuevoTotalAbonado);

            const now = new Date();
            const newEntry = {
                'RESPONSABLE': patientRecord['NOMBRE DEL PACIENTE'],
                'ID_PACIENTE': patientRecord['ID DEL PACIENTE'],
                'TIPODEPAGO': method,
                'ABONO': amount,
                'SALDO': nuevoSaldo,
                'FECHA': now.toISOString().split('T')[0],
                'created_at': now.toISOString()
            };

            const { error: abonoError } = await supabase.from('ABONO').insert([newEntry]);

            if (abonoError) {
                console.error('Error insertando abono:', abonoError);
                alert('Error al guardar el abono: ' + abonoError.message);
                btn.innerText = ogText;
                btn.disabled = false;
                return;
            }

            // Actualizar total_abonado en la tabla PACIENTES
            const updatedPresupuesto = { ...presupuesto, total_abonado: nuevoTotalAbonado };
            const { error: patientUpdateError } = await supabase
                .from('PACIENTES')
                .update({ presupuesto_json: updatedPresupuesto })
                .eq('id', ptId);

            btn.innerText = ogText;
            btn.disabled = false;

            if (patientUpdateError) {
                console.warn('Alerta: Abono guardado pero no se pudo actualizar el balance en el historial del paciente.');
            }

            window.closeAbonoModal();
            form.reset();
            renderAbonosView(document.getElementById('app'));
        });
    }

    // Apertura del Modal
    const btnReg = document.getElementById('btn-registrar-abono');
    const modal = document.getElementById('abono-modal');
    if (btnReg && modal) {
        btnReg.onclick = () => {
            modal.classList.replace('opacity-0', 'opacity-100');
            modal.classList.remove('pointer-events-none');
            document.getElementById('abono-modal-container').classList.replace('scale-95', 'scale-100');
        };
    }
}

window.closeAbonoModal = () => {
    const modal = document.getElementById('abono-modal');
    if (modal) {
        modal.classList.replace('opacity-100', 'opacity-0');
        modal.classList.add('pointer-events-none');
        document.getElementById('abono-modal-container').classList.replace('scale-100', 'scale-95');
    }
};
