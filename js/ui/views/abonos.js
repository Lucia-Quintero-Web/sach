/**
 * Abonos & Finanzas Module
 * Neo-Medical Style Implementation (Supabase Realtime)
 */
import { supabase } from '../../data/supabase-client.js';
import { formatCurrency } from '../../utils/calculations.js';

export async function renderAbonosView(container) {
    const { data: abonos } = await supabase.from('abonos').select('*').order('created_at', { ascending: false });
    const abonosList = abonos || [];

    const total = abonosList.reduce((sum, a) => sum + (parseFloat(a.ABONO) || 0), 0);
    const count = abonosList.length;
    const average = count > 0 ? total / count : 0;

    // Realtime Subscription
    if (!window._abonosSubscription) {
        window._abonosSubscription = supabase.channel('custom-abonos-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'abonos' }, () => {
                if (document.getElementById('abonos-list-body')) {
                    renderAbonosView(document.getElementById('app'));
                }
            }).subscribe();
    }

    container.innerHTML = `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 class="text-3xl font-display font-extrabold text-dark tracking-tight">Módulo de Finanzas</h2>
                    <p class="text-secondary text-sm font-medium mt-1">Control de ingresos y flujo de caja (Cloud)</p>
                </div>
                <button id="btn-registrar-abono" class="sach-button variant-set bg-accent shadow-glow flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" stroke-width="2.5"/></svg>
                    Registrar Abono
                </button>
            </div>

            <!-- Financial Summary -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${renderFinanceCard('Total Recaudado', formatCurrency(total), 'bg-primary/5 text-primary', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2')}
                ${renderFinanceCard('Abonos Registrados', count, 'bg-accent/10 text-accent', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2')}
                ${renderFinanceCard('Ticket Promedio', formatCurrency(average), 'bg-slate-50 text-slate-400', 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6')}
            </div>

            <!-- Transaction History -->
            <div class="bg-white rounded-card shadow-soft border-0 overflow-hidden">
                <div class="px-8 py-6 border-b border-black/5 flex justify-between items-center bg-slate-50/10">
                    <h3 class="font-bold text-lg text-dark">Historial de Transacciones</h3>
                    <div class="flex gap-2">
                         <span class="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-secondary uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">Exportar CSV</span>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/20">
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha & Hora</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paciente Vinculado</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método de Pago</th>
                                <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto Neto</th>
                            </tr>
                        </thead>
                        <tbody id="abonos-list-body" class="divide-y divide-slate-50">
                            ${abonosList.length > 0 ? abonosList.map(renderAbonoRow).join('') : `
                                <tr><td colspan="4" class="px-8 py-20 text-center text-slate-400 font-medium italic">No se registran movimientos financieros.</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Abono Modal -->
        <div id="abono-modal" class="sach-modal-backdrop opacity-0 pointer-events-none transition-all duration-300">
            <div class="sach-modal w-full max-w-lg transform scale-95 transition-all duration-300" id="abono-modal-container">
                 <h3 class="text-2xl font-display font-extrabold text-dark mb-8 tracking-tight">Registrar Nuevo Cobro</h3>
                 <form id="new-abono-form" class="space-y-6">
                    <div class="sach-input-container">
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Paciente</p>
                         <select id="abono-patient" class="sach-input" required>
                            <!-- Populated from DB -->
                         </select>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Monto del Abono</p>
                             <input type="number" id="abono-amount" class="sach-input !text-primary font-bold" placeholder="0.00" required>
                        </div>
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Vía de Pago</p>
                             <select id="abono-method" class="sach-input" required>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta de Crédito</option>
                             </select>
                        </div>
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button type="submit" class="flex-grow sach-button variant-set py-5 !h-auto" id="btn-submit-abono">Registrar Pago</button>
                        <button type="button" onclick="window.closeAbonoModal()" class="sach-button variant-unset py-5 !h-auto">Cancelar</button>
                    </div>
                 </form>
            </div>
        </div>
    `;

    setupAbonoLogic();
}

function renderFinanceCard(title, value, colorClass, path) {
    return `
        <div class="bg-white p-8 rounded-card border border-black/5 shadow-soft flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300">
            <div>
                <p class="text-secondary text-[10px] font-bold uppercase tracking-widest mb-1.5">${title}</p>
                <h3 class="text-3xl font-display font-extrabold text-dark tabular-nums">${value}</h3>
            </div>
            <div class="w-14 h-14 ${colorClass} rounded-2xl flex items-center justify-center">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="${path}" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
        </div>
    `;
}

function renderAbonoRow(a) {
    const dateStr = a.FECHA ? new Date(a.FECHA).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    return `
        <tr class="hover:bg-slate-50/50 transition-colors">
            <td class="px-8 py-5">
                <div class="font-bold text-dark text-sm">${dateStr}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tabular-nums">${new Date(a.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </td>
            <td class="px-8 py-5">
                <div class="font-bold text-dark text-sm truncate">${a['NOMBRE DEL PACIENTE'] || 'Desconocido'}</div>
            </td>
            <td class="px-8 py-5">
                 <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-tighter">
                    ${a['FORMA DE PAGO'] || 'Otros'}
                 </span>
            </td>
            <td class="px-8 py-5 text-right font-extrabold text-accent text-sm">
                ${formatCurrency(a.ABONO)}
            </td>
        </tr>
    `;
}

async function setupAbonoLogic() {
    const { data: patients } = await supabase.from('PACIENTES').select('*');
    const patientsList = patients || [];
    const patientSelect = document.getElementById('abono-patient');

    if (patientSelect && patientsList.length > 0) {
        patientSelect.innerHTML = patientsList.map(p => `<option value="${p.id || p['ID DEL PACIENTE']}">${p['NOMBRE DEL PACIENTE']}</option>`).join('');
    }

    // Form submission (Supabase directly)
    const form = document.getElementById('new-abono-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-abono');
            const ogText = btn.innerText;
            btn.innerText = 'Procesando...';
            btn.disabled = true;

            const ptId = patientSelect.value;
            const pt = patientsList.find(p => p.id?.toString() === ptId || p['ID DEL PACIENTE']?.toString() === ptId) || {};
            const amount = parseFloat(document.getElementById('abono-amount').value);
            const method = document.getElementById('abono-method').value;
            const now = new Date();

            const newAbono = {
                'NOMBRE DEL PACIENTE': pt['NOMBRE DEL PACIENTE'],
                'ID DEL PACIENTE': pt['ID DEL PACIENTE'],
                'FORMA DE PAGO': method,
                'ABONO': amount,
                'FECHA': now.toISOString().split('T')[0],
                'created_at': now.toISOString()
            };

            const { error } = await supabase.from('abonos').insert([newAbono]);

            btn.innerText = ogText;
            btn.disabled = false;

            if (error) {
                alert('Error al guardar el abono: ' + error.message);
                return;
            }

            window.closeAbonoModal();
            form.reset();
        });
    }

    // Modal behavior
    const btn = document.getElementById('btn-registrar-abono');
    const modal = document.getElementById('abono-modal');
    if (btn) {
        btn.onclick = () => {
            modal.classList.replace('opacity-0', 'opacity-100');
            modal.classList.remove('pointer-events-none');
            modal.children[0].classList.replace('scale-95', 'scale-100');
        };
    }
}

window.closeAbonoModal = () => {
    const modal = document.getElementById('abono-modal');
    if (modal) {
        modal.classList.replace('opacity-100', 'opacity-0');
        modal.classList.add('pointer-events-none');
        modal.children[0].classList.replace('scale-100', 'scale-95');
    }
};
