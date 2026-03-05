import { supabase } from '../../data/supabase-client.js';
import { formatCurrency } from '../../utils/calculations.js';

export async function renderDashboardView(container) {
    // Estado de la gráfica (persiste mientras la sesión esté activa en esta vista)
    if (!window._dashboardChartMode) window._dashboardChartMode = 'monthly'; // 'monthly', 'weekly', 'daily'

    const { count: patientCount } = await supabase.from('PACIENTES').select('*', { count: 'exact', head: true });
    const { count: appointmentCount } = await supabase.from('CITAS').select('*', { count: 'exact', head: true });
    const { data: abonos } = await supabase.from('ABONO').select('ABONO, FECHA, created_at');

    const abonosList = abonos || [];
    const totalEarnings = abonosList.reduce((sum, a) => sum + (parseFloat(a.ABONO) || 0), 0);
    const todayISO = new Date().toISOString().split('T')[0];

    // Realtime
    if (!window._dashboardSubscription) {
        window._dashboardSubscription = supabase.channel('custom-dashboard-channel')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                if (document.getElementById('revenue-chart')) {
                    renderDashboardView(document.getElementById('app'));
                }
            }).subscribe();
    }

    const { data: recentAppointmentsData } = await supabase.from('CITAS')
        .select('*')
        .eq('FECHA DE CITA', todayISO);

    const recentAppointments = recentAppointmentsData || [];
    recentAppointments.sort((a, b) => (a['HORA DE CITA'] || '').localeCompare(b['HORA DE CITA'] || ''));

    container.innerHTML = `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 class="text-3xl font-display font-extrabold text-dark tracking-tight">Panel de Gestión</h2>
                    <p class="text-secondary text-sm font-medium mt-1">S.A.C.H. Lucía Quintero <span class="mx-2">•</span> <span class="text-accent font-bold">Neo-Medical Performance</span></p>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.dispatchView('agenda')" class="sach-button variant-set bg-accent shadow-soft !h-11">Nueva Cita</button>
                    <button onclick="window.dispatchView('abonos')" class="sach-button variant-unset bg-white border border-black/5 shadow-soft !h-11 font-bold">Ver Finanzas</button>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                ${renderStatCard('Citas para Hoy', recentAppointments.length, 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', 'text-primary bg-primary/10')}
                ${renderStatCard('Pacientes Activos', patientCount, 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', 'text-accent bg-accent/10')}
                ${renderStatCard('Ingresos Globales', formatCurrency(totalEarnings), 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', 'text-emerald-600 bg-emerald-50')}
                ${renderStatCard('Citas Totales', appointmentCount, 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'text-amber-500 bg-amber-50')}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Revenue Chart Container -->
                <div class="lg:col-span-8 bg-white rounded-[32px] shadow-soft border border-black/5 p-8 flex flex-col min-h-[500px]">
                    <div class="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
                        <div>
                            <h3 class="font-display font-bold text-xl text-dark">Rendimiento Financiero</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis por ${window._dashboardChartMode === 'monthly' ? 'Meses' : window._dashboardChartMode === 'weekly' ? 'Semanas' : 'Días'}</p>
                        </div>
                        <div class="flex bg-slate-50 p-1.5 rounded-2xl border border-black/5">
                            <button onclick="window.setChartMode('monthly')" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${window._dashboardChartMode === 'monthly' ? 'bg-white shadow-soft text-primary' : 'text-secondary hover:text-dark'}">Mensual</button>
                            <button onclick="window.setChartMode('weekly')" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${window._dashboardChartMode === 'weekly' ? 'bg-white shadow-soft text-primary' : 'text-secondary hover:text-dark'}">Semanal</button>
                            <button onclick="window.setChartMode('daily')" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${window._dashboardChartMode === 'daily' ? 'bg-white shadow-soft text-primary' : 'text-secondary hover:text-dark'}">Diario</button>
                        </div>
                    </div>
                    
                    <div class="flex-grow flex items-end justify-between gap-4 px-2" id="revenue-chart">
                        ${processChartData(abonosList, window._dashboardChartMode)}
                    </div>
                </div>

                <!-- Upcoming Appointments -->
                <div class="lg:col-span-4 bg-white rounded-[32px] shadow-soft border border-black/5 p-8 flex flex-col h-[500px]">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 class="font-display font-bold text-xl text-dark">Agenda Hoy</h3>
                            <p class="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}</p>
                        </div>
                        <span class="w-2.5 h-2.5 rounded-full bg-accent animate-ping shadow-glow"></span>
                    </div>
                    
                    <div class="space-y-4 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                        ${recentAppointments.length > 0 ? recentAppointments.map(renderAptItem).join('') : `
                            <div class="h-full flex flex-col items-center justify-center opacity-20 gap-4 grayscale">
                                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="1.5"/></svg>
                                <p class="text-sm font-bold">No hay citas programadas</p>
                            </div>
                        `}
                    </div>

                    <button onclick="window.dispatchView('agenda')" class="w-full mt-6 py-4 sach-button variant-unset text-[10px] font-bold uppercase tracking-widest bg-slate-50 hover:bg-slate-100 border-none">Ver Calendario Completo</button>
                </div>
            </div>
        </div>
    `;
}

function processChartData(abonos, mode) {
    const data = [];
    const now = new Date();

    if (mode === 'monthly') {
        const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const values = new Array(12).fill(0);
        abonos.forEach(a => {
            const d = new Date(a.created_at || a.FECHA);
            if (d.getFullYear() === now.getFullYear()) values[d.getMonth()] += (parseFloat(a.ABONO) || 0);
        });
        values.forEach((v, i) => data.push({ label: labels[i], value: v }));
    } else if (mode === 'weekly') {
        // Últimas 4 semanas
        const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        const values = new Array(4).fill(0);
        abonos.forEach(a => {
            const d = new Date(a.created_at || a.FECHA);
            const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
            if (diffDays < 28) {
                const weekIdx = 3 - Math.floor(diffDays / 7);
                if (weekIdx >= 0) values[weekIdx] += (parseFloat(a.ABONO) || 0);
            }
        });
        values.forEach((v, i) => data.push({ label: labels[i], value: v }));
    } else {
        // Últimos 7 días
        const labels = [];
        const values = new Array(7).fill(0);
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('es-ES', { weekday: 'short' }));
        }
        abonos.forEach(a => {
            const d = new Date(a.created_at || a.FECHA);
            const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
                const idx = 6 - diffDays;
                if (idx >= 0) values[idx] += (parseFloat(a.ABONO) || 0);
            }
        });
        values.forEach((v, i) => data.push({ label: labels[i], value: v }));
    }

    const max = Math.max(...data.map(d => d.value), 1000);
    const totalCurrentView = data.reduce((s, d) => s + d.value, 0) || 1;

    return data.map(d => {
        const height = (d.value / max) * 100;
        const percentage = ((d.value / totalCurrentView) * 100).toFixed(1);

        return `
            <div class="flex-grow flex flex-col items-center group relative h-full justify-end">
                <!-- Porcentaje sobre la barra -->
                <span class="text-[9px] font-bold text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">${percentage}%</span>
                
                <div class="w-full max-w-[44px] ${d.value > 0 ? 'bg-primary/80 shadow-glow animate-grow-up' : 'bg-slate-50'} rounded-t-2xl transition-all duration-500 cursor-pointer relative" 
                     style="height: ${Math.max(height, 4)}%">
                    
                    <!-- Tooltip con Totales -->
                    <div class="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 scale-90 group-hover:scale-100">
                        <div class="bg-dark text-white text-[10px] font-bold py-2.5 px-4 rounded-2xl shadow-2xl border border-white/10 whitespace-nowrap">
                            ${formatCurrency(d.value)}
                        </div>
                        <div class="w-2.5 h-2.5 bg-dark rotate-45 mx-auto -mt-1.5 border-r border-b border-white/10"></div>
                    </div>
                </div>
                
                <!-- Label Inferior -->
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 group-hover:text-dark transition-colors">${d.label}</span>
            </div>
        `;
    }).join('');
}

// Helpers globales para control de vista
window.setChartMode = (mode) => {
    window._dashboardChartMode = mode;
    renderDashboardView(document.getElementById('app'));
};

function renderStatCard(title, value, svgPath, colorClasses) {
    return `
        <div class="bg-white p-8 rounded-[28px] shadow-soft border border-black/5 flex items-center justify-between group hover:-translate-y-1 transition-all duration-300">
            <div class="space-y-2">
                <p class="text-secondary text-[10px] font-bold uppercase tracking-widest opacity-60">${title}</p>
                <h3 class="text-3xl font-display font-extrabold text-dark tabular-nums tracking-tighter">${value}</h3>
            </div>
            <div class="w-14 h-14 ${colorClasses} rounded-[18px] flex items-center justify-center shadow-sm">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="${svgPath}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </div>
    `;
}

function renderAptItem(apt) {
    return `
        <div class="p-3.5 rounded-2xl border border-black/5 bg-[#40E0D0]/50 hover:bg-[#40E0D0]/70 hover:shadow-soft hover:border-[#40E0D0]/30 transition-all group cursor-pointer" onclick="window.dispatchView('agenda')">
            <div class="flex items-center justify-between mb-2">
                <div class="px-2.5 py-0.5 bg-white border border-black/5 rounded-lg text-[9px] font-extrabold text-[#008080] shadow-sm tabular-nums">
                    ${apt['HORA DE CITA']}
                </div>
                <div class="text-[8px] font-black text-[#006666]/60 uppercase tracking-tighter">
                   ${apt['NUMERO SILLON'] ? 'SILLÓN ' + apt['NUMERO SILLON'] : 'POR CONFIRMAR'}
                </div>
            </div>
            <h4 class="font-bold text-dark text-xs truncate group-hover:text-[#004d4d] transition-colors">${apt['NOMBRE DEL PACIENTE']}</h4>
            <div class="flex items-center gap-1.5 mt-1">
                <span class="w-1.5 h-1.5 rounded-full bg-white shadow-sm ring-1 ring-black/5"></span>
                <span class="text-[8px] font-extrabold text-dark/50 truncate uppercase tracking-tight">${apt['MOTIVO DE CONSULTA'] || 'ODONTOLOGÍA GENERAL'}</span>
            </div>
        </div>
    `;
}
