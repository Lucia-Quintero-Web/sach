/**
 * Módulo de Finanzas (Abonos) - S.A.C.H. Neo-Medical Edition
 * Estandarizado por Dante (Arquitecto de Sistemas)
 * Implementado por Antigravity
 */
import { supabase } from '../../data/supabase-client.js';
import { formatCurrency } from '../../utils/calculations.js';

export async function renderAbonosView(container) {
    let abonosList = [];
    let total = 0;
    let count = 0;
    let average = 0;

    try {
        // Bypass 404/Null: Intentar cargar desde 'ABONO' o 'abonos'
        const { data, error } = await supabase
            .from('ABONO')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            abonosList = data;
        } else {
            // Si hay error (ej. tabla no encontrada), abonosList se mantiene []
            console.warn('Finanzas: Bypass activo para tabla vacía o no encontrada.', error?.message);
        }
    } catch (err) {
        console.error('Finanzas: Error crítico de inicialización', err);
    }

    let totalPresupuestos = 0;
    try {
        const { data: patients } = await supabase.from('PACIENTES').select('presupuesto_json');
        if (patients) {
            patients.forEach(p => {
                const items = p.presupuesto_json?.items || [];
                totalPresupuestos += items.reduce((sum, item) => sum + (parseFloat(item.costo) || 0), 0);
            });
        }
    } catch (err) {
        console.error('Error calculando total de presupuestos:', err);
    }

    // Cálculos robustos (Safe Calculations)
    total = abonosList.reduce((sum, a) => sum + (parseFloat(a.ABONO) || 0), 0);
    count = abonosList.length;

    // Realtime Subscription (Evitar duplicados)
    if (!window._abonosSubscription) {
        window._abonosSubscription = supabase.channel('custom-abonos-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ABONO' }, (payload) => {
                const mainApp = document.getElementById('app');
                if (mainApp) renderAbonosView(mainApp);
            }).subscribe();
    }

    container.innerHTML = `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- Header Neo-Medical -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 class="text-3xl font-display font-extrabold text-dark tracking-tight">Módulo de Finanzas</h2>
                    <p class="text-secondary text-sm font-medium mt-1">Control de ingresos y flujo de caja (Cloud)</p>
                </div>
                <button id="btn-registrar-abono" class="sach-button variant-set bg-accent shadow-glow flex items-center gap-2 group hover:scale-105 transition-all">
                    <svg class="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" />
                        <path d="M12 5V21" stroke-linecap="round" />
                    </svg>
                    Registrar Abono
                </button>
            </div>

            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${renderFinanceCard('Total Recaudado', formatCurrency(total), 'bg-emerald-50 text-emerald-600', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2')}
                ${renderFinanceCard('Abonos Registrados', count, 'bg-accent/10 text-accent', 'M7 4L7 13C7 15.7614 9.23858 18 12 18C14.7614 18 17 15.7614 17 13L17 4')}
                ${renderFinanceCard('Presupuesto Global', formatCurrency(totalPresupuestos), 'bg-primary/10 text-primary', 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
            </div>

            <!-- Transaction History Table -->
            <div class="bg-white rounded-card shadow-soft border border-black/5 overflow-hidden">
                <div class="px-8 py-6 border-b border-black/5 flex justify-between items-center bg-slate-50/10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke-width="2"/></svg>
                        </div>
                        <h3 class="font-bold text-lg text-dark">Historial de Transacciones</h3>
                    </div>
                    <div class="flex gap-2">
                         <button class="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-secondary uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm">Exportar Reporte</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/30">
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha & Hora</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsable</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método de Pago</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto Neto</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Saldo Pendiente</th>
                            </tr>
                        </thead>
                        <tbody id="abonos-list-body" class="divide-y divide-slate-50">
                            ${abonosList.length > 0 ? abonosList.map(renderAbonoRow).join('') : `
                                <tr>
                                    <td colspan="4" class="px-8 py-32">
                                        <div class="flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" stroke-width="2"/></svg>
                                            </div>
                                            <p class="text-slate-400 font-bold text-sm tracking-tight italic">No se registran movimientos financieros.</p>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Popups & Modals Integrated -->
        ${renderAbonoModal()}
    `;

    setupAbonoLogic(abonosList);
}

function renderFinanceCard(title, value, colorClass, path) {
    return `
        <div class="bg-white p-8 rounded-card border border-black/5 shadow-soft flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300">
            <div class="space-y-1.5">
                <p class="text-secondary text-[10px] font-bold uppercase tracking-widest">${title}</p>
                <h3 class="text-3xl font-display font-extrabold text-dark tabular-nums tracking-tighter">${value}</h3>
            </div>
            <div class="w-14 h-14 ${colorClass} rounded-2xl flex items-center justify-center shadow-sm">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="${path}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </div>
    `;
}

function renderAbonoRow(a) {
    const dataObj = new Date(a.created_at || a.FECHA);
    const dateFormatted = dataObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = dataObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
        <tr class="hover:bg-slate-50/80 transition-all group">
            <td class="px-8 py-5">
                <div class="font-bold text-dark text-sm">${dateFormatted}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest tabular-nums mt-0.5">${timeFormatted}</div>
            </td>
            <td class="px-8 py-5">
                <div class="font-bold text-dark text-sm truncate max-w-[200px]">${a['RESPONSABLE'] || 'S/N'}</div>
            </td>
            <td class="px-8 py-5">
                 <span class="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-extrabold bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-tighter">
                    ${a['TIPODEPAGO'] || 'Otros'}
                 </span>
            </td>
            <td class="px-8 py-5 text-right font-extrabold text-accent text-sm tabular-nums">
                ${formatCurrency(a.ABONO)}
            </td>
            <td class="px-8 py-5 text-right font-extrabold text-slate-400 text-sm tabular-nums">
                ${a.SALDO !== null && a.SALDO !== undefined ? formatCurrency(a.SALDO) : '---'}
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
