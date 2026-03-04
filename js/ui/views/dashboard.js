/**
 * Dashboard Module
 * Handles the main landing view with Neo-Medical Minimalist aesthetics
 */
import { supabase } from '../../data/supabase-client.js';
import { formatCurrency } from '../../utils/calculations.js';

export async function renderDashboardView(container) {
    const { count: patientCount } = await supabase.from('PACIENTES').select('*', { count: 'exact', head: true });
    const { count: appointmentCount } = await supabase.from('CITAS').select('*', { count: 'exact', head: true });
    const { data: abonos } = await supabase.from('abonos').select('ABONO, FECHA, created_at');

    const abonosList = abonos || [];
    const totalEarnings = abonosList.reduce((sum, a) => sum + (parseFloat(a.ABONO) || 0), 0);
    const todayISO = new Date().toISOString().split('T')[0];

    // Subscribe to realtime changes
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

    // Reverse it to show "most recent" top or keep it chronological
    recentAppointments.sort((a, b) => (a['HORA DE CITA'] || '').localeCompare(b['HORA DE CITA'] || ''));

    container.innerHTML = `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 class="text-3xl font-display font-extrabold text-dark tracking-tight">Panel de Gestión</h2>
                    <p class="text-secondary text-sm font-medium mt-1">S.A.C.H. Lucía Quintero <span class="mx-2">•</span> <span class="text-accent font-bold">Neo-Medical</span></p>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.dispatchView('agenda')" class="sach-button variant-set bg-accent shadow-glow">Nueva Cita</button>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                ${renderStatCard('Citas Agendadas', appointmentCount, 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', 'text-primary bg-primary/10')}
                ${renderStatCard('Pacientes Activos', patientCount, 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', 'text-accent bg-accent/10')}
                ${renderStatCard('Ingresos Globales', formatCurrency(totalEarnings), 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', 'text-primary bg-primary/10')}
                ${renderStatCard('Alerta de Saldo', '$250', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 'text-danger bg-danger/10')}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Revenue Chart -->
                <div class="lg:col-span-8 bg-white rounded-card shadow-soft border border-black/5 p-8 flex flex-col min-h-[460px]">
                    <div class="flex items-center justify-between mb-10">
                        <h3 class="font-display font-bold text-xl text-dark">Rendimiento Financiero</h3>
                        <div class="flex bg-slate-50 p-1 rounded-xl">
                            <button class="px-4 py-1.5 bg-white shadow-soft border border-black/5 rounded-lg text-xs font-bold text-primary">Mensual</button>
                            <button class="px-4 py-1.5 text-xs font-bold text-secondary">Anual</button>
                        </div>
                    </div>
                    
                    <div class="flex-grow flex items-end justify-between gap-6 px-4" id="revenue-chart">
                        ${generateChartBars(abonosList)}
                    </div>
                    
                    <div class="flex justify-between mt-6 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
                    </div>
                </div>

                <!-- Upcoming Appointments -->
                <div class="lg:col-span-4 bg-white rounded-card shadow-soft border border-black/5 p-8 flex flex-col h-[460px]">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="font-display font-bold text-xl text-dark">Agenda Hoy</h3>
                        <span class="w-2 h-2 rounded-full bg-accent animate-ping shadow-glow"></span>
                    </div>
                    
                    <div class="space-y-4 overflow-y-auto pr-2 flex-grow scrollbar-thin">
                        ${recentAppointments.length > 0 ? recentAppointments.map(renderAptItem).join('') : `
                            <div class="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="1.5"/></svg>
                                <p class="text-sm font-bold">Sin citas para hoy</p>
                            </div>
                        `}
                    </div>

                    <button onclick="window.dispatchView('agenda')" class="w-full mt-6 py-4 sach-button variant-unset text-xs uppercase tracking-widest">Ver Calendario Completo</button>
                </div>
            </div>
        </div>
    `;
}

function renderStatCard(title, value, svgPath, colorClasses) {
    return `
        <div class="bg-white p-8 rounded-card shadow-soft border border-black/5 flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300">
            <div class="space-y-2">
                <p class="text-secondary text-[10px] font-bold uppercase tracking-widest">${title}</p>
                <h3 class="text-3xl font-display font-extrabold text-dark tabular-nums">${value}</h3>
            </div>
            <div class="w-14 h-14 ${colorClasses} rounded-2xl flex items-center justify-center">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="${svgPath}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
        </div>
    `;
}

function renderAptItem(apt) {
    return `
        <div class="p-5 rounded-xl border border-black/5 bg-background hover:bg-white hover:shadow-soft hover:border-accent/30 transition-all group">
            <div class="flex items-center justify-between mb-3">
                <div class="px-2.5 py-1 bg-white border border-black/5 rounded-lg text-xs font-extrabold text-primary tabular-nums">
                    ${apt['HORA DE CITA']}
                </div>
                <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                   ${apt['NUMERO SILLON'] ? 'Sillón ' + apt['NUMERO SILLON'] : 'Confirmar'}
                </div>
            </div>
            <h4 class="font-bold text-dark text-sm truncate group-hover:text-primary transition-colors">${apt['NOMBRE DEL PACIENTE']}</h4>
            <div class="flex items-center gap-1.5 mt-1.5 opacity-60">
                <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
                <span class="text-[10px] font-bold text-dark truncate uppercase">${apt['MOTIVO DE CONSULTA'] || 'General'}</span>
            </div>
        </div>
    `;
}


function generateChartBars(abonos) {
    const monthlyData = new Array(12).fill(0);
    (abonos || []).forEach(a => {
        const d = new Date(a.FECHA || a.created_at);
        if (!isNaN(d)) monthlyData[d.getMonth()] += (parseFloat(a.ABONO) || 0);
    });

    const max = Math.max(...monthlyData, 5000000);

    return monthlyData.map((val, idx) => {
        const height = (val / max) * 100;
        const isCurrentMonth = new Date().getMonth() === idx;

        return `
            <div class="flex-grow group relative flex items-end justify-center">
                <div class="w-full max-w-[40px] ${isCurrentMonth ? 'bg-accent shadow-glow' : 'bg-primary/5 hover:bg-primary/20'} rounded-t-lg transition-all duration-500 cursor-pointer" style="height: ${Math.max(height, 5)}%">
                    ${val > 0 ? `
                        <div class="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30">
                            <div class="bg-dark text-white text-[10px] font-bold py-2 px-3 rounded-xl shadow-soft border border-white/10 whitespace-nowrap">
                                ${formatCurrency(val)}
                            </div>
                            <div class="w-2 h-2 bg-dark rotate-45 mx-auto -mt-1 border-r border-b border-white/10"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}
