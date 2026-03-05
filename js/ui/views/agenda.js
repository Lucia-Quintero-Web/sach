/**
 * Agenda Module
 * Neo-Medical Dashboard con Sistema de Sillones Simétricos
 */
import { supabase } from '../../data/supabase-client.js';
import {
    obtenerCitasMañana,
    generarMensajeWA,
    marcarRecordatorioEnviado,
    generarMensajeConfirmacionPremium,
    formatFechaAmigable,
    getFechaMañana,
    sanitizarCelularEcuador
} from '../components/recordatorios.js';

// Generar slots de 30 mins (08:00 a 20:30)
const SLOTS = [];
for (let h = 8; h <= 20; h++) {
    SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
    if (h === 20) {
        SLOTS.push(`20:30`);
        break;
    }
    SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
}

export async function renderAgendaView(container) {
    const today = new Date().toISOString().split('T')[0];

    if (!window._agendaSubscription) {
        window._agendaSubscription = supabase.channel('custom-agenda-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'CITAS' }, () => {
                if (document.getElementById('agenda-root')) {
                    const dtDate = document.getElementById('agenda-date')?.value || new Date().toISOString().split('T')[0];
                    loadAppointmentsDate(dtDate);
                }
            }).subscribe();
    }

    container.innerHTML = `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <!-- Header & Navegación del Dashboard -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 class="text-3xl font-display font-extrabold text-dark tracking-tight">Agenda Médica</h2>
                    <p class="text-secondary text-sm font-medium mt-1">Control de sillones en tiempo real</p>
                </div>
                
                <!-- Controles del header -->
                <div class="flex items-center gap-3">
                    <!-- Botón Recordatorios -->
                    <button id="btn-recordatorios" onclick="window.openRecordatoriosModal()"
                        class="relative flex items-center gap-2 px-4 py-2 sach-button !h-10 bg-amber-500 hover:bg-amber-600 text-white shadow-soft transition-all group">
                        <!-- Ícono Bell -->
                        <svg class="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <span class="text-[11px] font-bold uppercase tracking-widest hidden sm:block">Recordatorios</span>
                        <span id="badge-recordatorios" class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center hidden">0</span>
                    </button>
                    <!-- Selector Glassmorphism y Botón de Hoy -->
                    <div class="flex items-center gap-2 bg-white/50 backdrop-blur-glass p-2 rounded-2xl border border-black/5 shadow-soft">
                        <input type="date" id="agenda-date" class="bg-transparent border-none text-sm font-bold text-dark px-3 py-1.5 outline-none hover:bg-white/60 rounded-xl transition-colors cursor-pointer" value="${today}">
                        <button id="btn-hoy" class="px-5 py-2 sach-button variant-set bg-primary shadow-soft !h-10">Hoy</button>
                    </div>
                </div>
            </div>

            <!-- Agenda Grid -->
            <div class="bg-white rounded-card shadow-soft border-0 overflow-hidden flex relative" id="agenda-root">
                
                <!-- Time Labels -->
                <div class="w-16 flex-shrink-0 border-r border-black/5 bg-slate-50/20 flex flex-col">
                    <div class="h-14 border-b border-black/5 flex items-center justify-center">
                        <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div class="relative flex-grow pointer-events-none">
                        ${renderTimeLabels()}
                    </div>
                </div>

                <!-- Chairs Container -->
                <div class="flex-grow flex overflow-x-auto relative" id="chairs-wrapper">
                    <!-- Línea de Tiempo en Vivo (Time Indicator) -->
                    <div id="time-indicator" class="absolute left-0 right-0 h-[2px] bg-accent z-30 pointer-events-none transition-all duration-1000 hidden">
                        <div class="absolute -left-1.5 -top-1 w-2.5 h-2.5 bg-accent rounded-full shadow-glow"></div>
                        <div class="absolute right-0 -top-[10px] w-24 h-[22px] bg-accent/10 rounded-l-full blur-md"></div>
                    </div>
                    
                    <!-- Llenamos los 3 sillones simétricos -->
                    ${renderChairColumn(1, 'Sillón 01')}
                    ${renderChairColumn(2, 'Sillón 02')}
                    ${renderChairColumn(3, 'Sillón 03')}
                </div>
            </div>
        </div>

        <!-- Appointment Modal (Simétrico) -->
        <div id="appointment-modal" class="sach-modal-backdrop opacity-0 pointer-events-none transition-all duration-300">
            <div class="sach-modal w-full max-w-lg transform scale-95 transition-all duration-300" id="apt-modal-container">
                <div class="flex justify-between items-center mb-10">
                    <h3 class="text-2xl font-display font-extrabold text-dark tracking-tight">Agendar Cita Inteligente</h3>
                    <button type="button" onclick="window.closeAptModal()" class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                    </button>
                </div>
                
                <form id="new-appointment-form" class="space-y-6">
                    <input type="hidden" id="apt-id">
                    <div class="sach-input-container relative" id="patient-search-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-2 flex justify-between items-center">
                            <span>Paciente Seleccionado</span>
                            <button type="button" onclick="window.location.hash = '#pacientes'; window.closeAptModal();" class="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors font-bold">+ Nuevo</button>
                        </p>
                        <input type="text" id="apt-patient-search" class="sach-input bg-slate-50 h-12 font-bold px-4 w-full border border-black/5 rounded-xl placeholder:text-slate-400 focus:bg-white transition-colors" placeholder="Buscar paciente por nombre o CC..." autocomplete="off" required>
                        <input type="hidden" id="apt-patient-id" required>
                        <span id="apt-patient-display" class="hidden"></span>
                        
                        <div id="apt-patient-dropdown" class="absolute top-[100%] left-0 w-full bg-white shadow-xl rounded-xl border border-black/5 mt-1 z-50 hidden max-h-56 overflow-y-auto">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="sach-input-container">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Sillón Asignado</p>
                            <select id="apt-chair" class="sach-input bg-white h-12 font-bold" required>
                                <option value="1">Sillón 01</option>
                                <option value="2">Sillón 02</option>
                                <option value="3">Sillón 03</option>
                            </select>
                        </div>
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Fecha de Cita</p>
                             <input type="date" id="apt-date-input" class="sach-input bg-white h-12 font-bold cursor-pointer" value="${today}" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Hora Inicio</p>
                             <select id="apt-time-start" class="sach-input bg-white h-12 font-bold" required>
                                 ${SLOTS.map(t => `<option value="${t}">${t}</option>`).join('')}
                             </select>
                        </div>
                        <div class="sach-input-container">
                             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Hora Fin</p>
                             <select id="apt-time-end" class="sach-input bg-white h-12 font-bold" required>
                                 ${SLOTS.map(t => `<option value="${t}">${t}</option>`).join('')}
                             </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="sach-input-container">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Médico Tratante</p>
                            <select id="apt-doctor" class="sach-input bg-white h-12 font-bold" required>
                                <option value="">Seleccione Odontólogo...</option>
                                <option value="Dra. Lucía Quintero">Dra. Lucía Quintero</option>
                                <option value="Dr. Sergio Arboleda">Dr. Sergio Arboleda</option>
                                <option value="Dr. Juan Manuel Santos">Dr. Juan Manuel Santos</option>
                            </select>
                        </div>
                        <div class="sach-input-container">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Estado</p>
                            <select id="apt-status" class="sach-input bg-white h-12 font-bold">
                                <option value="Pendiente">🟡 PENDIENTE</option>
                                <option value="Confirmada">🟢 CONFIRMADA</option>
                                <option value="Cancelada">🔴 CANCELADA</option>
                            </select>
                        </div>
                    </div>

                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-2">Motivo Principal</p>
                        <textarea id="apt-reason" class="sach-input bg-white !h-24 pt-4 resize-none" placeholder="Diagnóstico, control, endodoncia..." required></textarea>
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button type="submit" id="btn-submit-apt" class="flex-grow sach-button variant-set bg-primary !h-12 shadow-soft">Confirmar Agendamiento</button>
                        <button type="button" onclick="window.closeAptModal()" class="sach-button variant-unset !h-12 border-none hover:bg-slate-100">Cerrar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Reagendar Modal -->
        <div id="reagendar-modal" class="sach-modal-backdrop opacity-0 pointer-events-none transition-all duration-300">
            <div class="sach-modal w-full max-w-sm transform scale-95 transition-all duration-300" id="reagendar-modal-container">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-display font-extrabold text-dark tracking-tight">Reagendar Cita</h3>
                    <button type="button" onclick="window.closeReagendarModal()" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                    </button>
                </div>
                
                <form id="reagendar-form" class="space-y-4">
                    <input type="hidden" id="reagendar-apt-id">
                    <input type="hidden" id="reagendar-sillon-id">
                    <input type="hidden" id="reagendar-paciente-id">
                    <div class="sach-input-container">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-2">Nueva Fecha</p>
                        <input type="date" id="reagendar-date" class="sach-input bg-white h-12 font-bold cursor-pointer" required>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="sach-input-container">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-2">Nueva Hora Inicio</p>
                            <select id="reagendar-time-start" class="sach-input bg-white h-12 font-bold" required>
                                ${SLOTS.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="sach-input-container">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-2">Nueva Hora Fin</p>
                            <select id="reagendar-time-end" class="sach-input bg-white h-12 font-bold" required>
                                ${SLOTS.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="pt-4">
                        <button type="submit" id="btn-submit-reagendar" class="w-full sach-button variant-set bg-accent !h-12 shadow-soft">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ========== MODAL RECORDATORIOS T-24h ========== -->
        <div id="recordatorios-modal" class="sach-modal-backdrop opacity-0 pointer-events-none transition-all duration-300">
            <div class="sach-modal w-full max-w-2xl transform scale-95 transition-all duration-300" id="recordatorios-modal-container">
                <!-- Header -->
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-display font-extrabold text-dark tracking-tight">Recordatorios del Día</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest" id="recordatorios-fecha-label">Cargando...</p>
                        </div>
                    </div>
                    <button onclick="window.closeRecordatoriosModal()" class="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                    </button>
                </div>

                <!-- Lista de Pacientes -->
                <div id="recordatorios-lista" class="space-y-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar mb-6">
                    <div class="flex items-center justify-center py-16">
                        <div class="text-slate-300 text-center">
                            <svg class="w-10 h-10 mx-auto mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            <p class="text-sm font-bold">Buscando citas para mañana...</p>
                        </div>
                    </div>
                </div>

                <!-- Footer con acción masiva -->
                <div class="flex items-center justify-between pt-4 border-t border-black/5">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest" id="recordatorios-count">-- pacientes detectados</p>
                    <button id="btn-enviar-todos" onclick="window.enviarTodosRecordatorios()"
                        class="sach-button variant-set bg-amber-500 hover:bg-amber-600 !h-10 px-6 shadow-soft flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg class="w-4 h-4" viewBox="0 0 737.509 740.824">
                            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"/>
                        </svg>
                        Enviar a Todos
                    </button>
                </div>
            </div>
        </div>
    `;

    await setupAgendaLogic();
    setupRecordatoriosLogic();

    // Iniciar el reloj de línea
    updateTimeIndicator();
    if (window._agendaTimeInterval) clearInterval(window._agendaTimeInterval);
    window._agendaTimeInterval = setInterval(updateTimeIndicator, 60000); // 1 minuto update
}

function renderTimeLabels() {
    let html = '';
    // Etiquetas de hora para la visualización izquierda. h-16 representa 30 Minutos (64px).
    SLOTS.forEach(t => {
        html += `
            <div class="h-16 relative flex justify-center border-b border-black/5 last:border-0 box-border">
                <span class="absolute -top-[9px] px-1 text-[10px] font-bold text-slate-400 font-display" style="background-color: var(--bg-light);">${t}</span>
            </div>
        `;
    });
    return html;
}

function renderChairColumn(chairId, label) {
    let slotsHtml = '';

    // Todos los slots miden exactamente 64px (h-16) para mantener simetría matemática
    SLOTS.forEach(t => {
        slotsHtml += `
            <div class="h-16 p-1.5 border-b border-black/5 hover:bg-slate-50/50 transition-colors box-border" id="slot-${chairId}-${t.replace(':', '')}">
                <!-- Estado NO SETEADO -->
                <button type="button" class="w-full h-full rounded-[10px] bg-white/40 border-2 border-dashed border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center group cursor-pointer shadow-sm" onclick="window.openNewAptModal('${t}', ${chairId})">
                    <span class="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm">+ Nuevo en ${t}</span>
                </button>
            </div>
        `;
    });

    return `
        <div class="flex-1 min-w-[220px] border-r border-black/5 last:border-0 flex flex-col bg-white">
            <div class="h-14 sticky top-0 bg-white/95 backdrop-blur-glass z-20 flex items-center justify-center border-b border-black/5 shadow-sm">
                <span class="text-xs font-display font-extrabold text-primary uppercase tracking-widest">${label}</span>
            </div>
            <div class="relative w-full">
                ${slotsHtml}
            </div>
        </div>
    `;
}

async function setupAgendaLogic() {
    const form = document.getElementById('new-appointment-form');

    const searchInput = document.getElementById('apt-patient-search');
    const dropdown = document.getElementById('apt-patient-dropdown');
    const idInput = document.getElementById('apt-patient-id');
    const displayInput = document.getElementById('apt-patient-display');

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            idInput.value = '';
            searchInput.classList.remove('text-primary', 'bg-primary/5');
            searchInput.classList.add('bg-slate-50');

            if (query.length < 2) {
                dropdown.innerHTML = '';
                dropdown.classList.add('hidden');
                return;
            }

            debounceTimer = setTimeout(async () => {
                const { data: searchResults, error } = await supabase
                    .from('PACIENTES')
                    .select('id, "NOMBRE DEL PACIENTE", "ID DEL PACIENTE"')
                    .or(`"NOMBRE DEL PACIENTE".ilike.%${query}%,"ID DEL PACIENTE".ilike.%${query}%`)
                    .limit(8);

                dropdown.innerHTML = '';
                if (searchResults && searchResults.length > 0) {
                    searchResults.forEach(p => {
                        const div = document.createElement('div');
                        div.className = 'px-4 py-3 hover:bg-primary/5 cursor-pointer border-b border-black/5 last:border-0 transition-colors';
                        div.innerHTML = `<p class="text-sm font-bold text-dark">${p['NOMBRE DEL PACIENTE']}</p><p class="text-[10px] text-slate-500 font-medium">CC: ${p['ID DEL PACIENTE']}</p>`;
                        div.addEventListener('click', () => {
                            idInput.value = p.id;
                            searchInput.value = p['NOMBRE DEL PACIENTE'];
                            displayInput.innerText = p['NOMBRE DEL PACIENTE'];
                            searchInput.classList.replace('bg-slate-50', 'bg-primary/5');
                            searchInput.classList.add('text-primary');
                            dropdown.classList.add('hidden');
                        });
                        dropdown.appendChild(div);
                    });
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.innerHTML = `
                        <div class="px-4 py-4 text-center">
                            <p class="text-sm text-slate-500 mb-3">No se encontraron pacientes.</p>
                            <button type="button" onclick="window.location.hash = '#pacientes'; window.closeAptModal();" class="text-xs sach-button variant-set bg-primary w-full shadow-soft border-0 !h-9">Crear Nuevo Paciente</button>
                        </div>
                    `;
                    dropdown.classList.remove('hidden');
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (searchInput && dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // Check for pre-selected patient from session storage
    const preselectedId = sessionStorage.getItem('preselected_patient_id');
    if (preselectedId) {
        const { data: p } = await supabase.from('PACIENTES').select('*').eq('id', parseInt(preselectedId)).single();
        if (p) {
            document.getElementById('apt-patient-id').value = p.id;
            document.getElementById('apt-patient-search').value = `${p['NOMBRE DEL PACIENTE']}`;
            document.getElementById('apt-patient-display').innerText = `${p['NOMBRE DEL PACIENTE']}`;
            document.getElementById('apt-patient-search').classList.replace('bg-slate-50', 'bg-primary/5');
            document.getElementById('apt-patient-search').classList.add('text-primary');

            // Open modal automatically
            openNewAptModal(null, 1); // Default to chair 1, current time will be selected if not provided
        }
        sessionStorage.removeItem('preselected_patient_id');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id_paciente = document.getElementById('apt-patient-id').value;
        const ptName = document.getElementById('apt-patient-display').innerText.split('(')[0].trim();
        const hora_inicio = document.getElementById('apt-time-start').value;
        const hora_fin = document.getElementById('apt-time-end').value;
        const id_sillon = document.getElementById('apt-chair').value;
        const medico = document.getElementById('apt-doctor').value;
        const status = document.getElementById('apt-status').value;
        const motivo = document.getElementById('apt-reason').value;
        const fecha = document.getElementById('apt-date-input').value;

        // Fetch patient for metadata cache
        const pId = parseInt(id_paciente);
        if (isNaN(pId)) {
            alert('Error: ID de paciente no válido. Por favor, seleccione el paciente nuevamente.');
            return;
        }

        const { data: patientRecord } = await supabase.from('PACIENTES').select('*').eq('id', pId).single();
        const cedula = patientRecord ? (patientRecord['ID DEL PACIENTE'] || '') : '';
        const edad = patientRecord ? (patientRecord['EDAD'] || '??') : '??';
        const sexo = patientRecord ? (patientRecord['SEXO'] || '') : '';
        const celular = patientRecord ? (patientRecord['CELULAR DEL PACIENTE'] || '') : '';
        const fecha_nacimiento = patientRecord ? (patientRecord['FECHA DE NACIMIENTO'] || '') : '';
        const correo = patientRecord ? (patientRecord['CORREO'] || '') : '';

        // Validation 1: End time must be after start time
        if (hora_fin <= hora_inicio) {
            alert('La hora de fin debe ser posterior a la hora de inicio.');
            return;
        }

        // Validation 2: Overlap check (Buffer Offline - IndexedDB)
        const { data: existingCitas } = await supabase.from('CITAS').select('*').eq('FECHA DE CITA', fecha).eq('NUMERO SILLON', id_sillon.toString());
        const hasOverlap = (existingCitas || []).some(c => {
            // Overlap logic: (StartA < EndB) AND (EndA > StartB)
            const c_inicio = c['HORA DE CITA'];
            const c_fin = c['HORA FIN'] || c['HORA DE CITA']; // Fallback if missing
            return (hora_inicio < c_fin) && (hora_fin > c_inicio);
        });

        if (hasOverlap) {
            alert(`¡Conflicto de Horario! El Sillón ${id_sillon} ya está ocupado en el rango seleccionado (${hora_inicio} - ${hora_fin}).`);
            return;
        }

        const newApt = {
            'ID DEL PACIENTE': cedula, // ID real en Supabase (String)
            'NOMBRE DEL PACIENTE': ptName,
            'EDAD': edad,
            'SEXO': sexo,
            'CELULAR DEL PACIENTE': celular,
            'FECHA DE NACIMIENTO': fecha_nacimiento,
            'CORREO': correo,
            'MEDICO TRATANTE': medico,
            'FECHA DE CITA': fecha,
            'HORA DE CITA': hora_inicio,
            'HORA FIN': hora_fin,
            'NUMERO SILLON': id_sillon.toString(),
            'MOTIVO DE CONSULTA': motivo,
            'ESTADO': status,
            'created_at': new Date().toISOString()
        };

        const editingId = document.getElementById('apt-id').value;
        if (editingId && !isNaN(parseInt(editingId))) {
            newApt.id = parseInt(editingId);
            const { error: updErr } = await supabase.from('CITAS').update(newApt).eq('id', newApt.id);
            if (updErr) alert('Error: ' + updErr.message);
            else showSuccessAlert('Cita actualizada con éxito');
        } else if (editingId) {
            alert('Error: ID de cita no válido para actualizar.');
            return;
        } else {
            const { error: insErr } = await supabase.from('CITAS').insert([newApt]);
            if (insErr) alert('Error: ' + insErr.message);
            else {
                showSuccessAlert('Cita agendada con éxito');
                window.enviarNotificacionWhatsApp({
                    celular: celular,
                    nombre: ptName,
                    fecha: fecha,
                    hora: hora_inicio
                });
            }
        }

        // Refresh UI
        loadAppointmentsDate(fecha);
        window.closeAptModal();
        e.target.reset();
    });

    const reagendarForm = document.getElementById('reagendar-form');
    if (reagendarForm) {
        reagendarForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('btn-submit-reagendar');
            const originalText = btn.innerText;
            btn.innerText = 'Verificando...';
            btn.disabled = true;

            const id = document.getElementById('reagendar-apt-id').value;
            const idNum = parseInt(id);
            if (isNaN(idNum)) {
                alert('Error: ID de cita no válido.');
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }
            const nueva_fecha = document.getElementById('reagendar-date').value;
            const nueva_hora_inicio = document.getElementById('reagendar-time-start').value;
            const nueva_hora_fin = document.getElementById('reagendar-time-end').value;
            const id_sillon = document.getElementById('reagendar-sillon-id').value;

            if (nueva_hora_fin <= nueva_hora_inicio) {
                alert('La hora de fin debe ser posterior a la hora de inicio.');
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }

            // Conflict Validation
            const { data: existingCitas } = await supabase.from('CITAS').select('*').eq('FECHA DE CITA', nueva_fecha).eq('NUMERO SILLON', id_sillon.toString());
            const hasOverlap = (existingCitas || []).some(c => {
                const c_inicio = c['HORA DE CITA'];
                const c_fin = c['HORA FIN'] || c['HORA DE CITA'];
                return (c.ESTADO !== 'Cancelada' && c.id !== idNum) && (nueva_hora_inicio < c_fin) && (nueva_hora_fin > c_inicio);
            });

            if (hasOverlap) {
                alert(`¡Conflicto de Horario! El Sillón ${id_sillon} ya está ocupado en el rango seleccionado (${nueva_hora_inicio} - ${nueva_hora_fin}).`);
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }

            // Update Supabase
            const { data: aptData } = await supabase.from('CITAS').select('*').eq('id', idNum).single();
            if (aptData) {
                const apt = aptData;
                apt['FECHA DE CITA'] = nueva_fecha;
                apt['HORA DE CITA'] = nueva_hora_inicio;
                apt['HORA FIN'] = nueva_hora_fin;

                await supabase.from('CITAS').update(apt).eq('id', apt.id);

                showSuccessAlert('Cita reagendada con éxito');

                // Enviar notificación de reagendamiento
                window.enviarNotificacionWhatsApp({
                    celular: apt['CELULAR DEL PACIENTE'],
                    nombre: apt['NOMBRE DEL PACIENTE'],
                    fecha: nueva_fecha,
                    hora: nueva_hora_inicio
                });

                window.closeReagendarModal();

                const currentDate = document.getElementById('agenda-date').value;
                loadAppointmentsDate(currentDate);
            }

            btn.innerText = originalText;
            btn.disabled = false;
        });
    }

    // Cargar inicial
    const inputDate = document.getElementById('agenda-date');
    await loadAppointmentsDate(inputDate.value);

    // Watchers de fecha
    inputDate.addEventListener('change', (e) => {
        document.getElementById('apt-date-input').value = e.target.value;
        loadAppointmentsDate(e.target.value);
    });

    document.getElementById('btn-hoy').addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        inputDate.value = today;
        document.getElementById('apt-date-input').value = today;
        loadAppointmentsDate(today);
    });
}

function showSuccessAlert(msg) {
    const alert = document.createElement('div');
    alert.className = 'fixed top-10 right-10 bg-accent text-white px-8 py-4 rounded-2xl shadow-glow z-[9999] animate-in slide-in-from-right-10 duration-500 font-bold flex items-center gap-3';
    alert.innerHTML = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${msg}
    `;
    document.body.appendChild(alert);
    setTimeout(() => {
        alert.classList.replace('animate-in', 'animate-out');
        alert.classList.add('fade-out', 'slide-out-to-right-10');
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}

async function loadAppointmentsDate(dateString) {
    // Resetear a NO SETEADO
    SLOTS.forEach(time => {
        [1, 2, 3].forEach(c => {
            const el = document.getElementById(`slot-${c}-${time.replace(':', '')}`);
            if (el) {
                el.innerHTML = `
                    <button type="button" class="w-full h-full rounded-[10px] bg-white/40 border-2 border-dashed border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center group cursor-pointer shadow-sm" onclick="window.openNewAptModal('${time}', ${c})">
                        <span class="text-xs font-bold text-primary opacity-0 group-hover:opacity-100">+ Nuevo en ${time}</span>
                    </button>
                `;
            }
        });
    });

    const { data: filteredData } = await supabase.from('CITAS').select('*').eq('FECHA DE CITA', dateString);
    const filtered = filteredData || [];

    // Filter out canceled ones just in case but the query above gets all chairs for that date
    filtered.filter(a => a.ESTADO !== 'Cancelada').forEach(a => renderAppointmentNode(a));
}

function renderAppointmentNode(apt) {
    if (!apt['HORA DE CITA']) return;

    let slotTime = apt['HORA DE CITA'].substring(0, 5);
    if (!SLOTS.includes(slotTime)) {
        let exactMin = parseInt(slotTime.split(':')[1] || '0');
        let snapMin = exactMin >= 30 ? '30' : '00';
        slotTime = `${slotTime.split(':')[0]}:${snapMin}`;
    }

    const chairId = apt['NUMERO SILLON'] || 1;
    const container = document.getElementById(`slot-${chairId}-${slotTime.replace(':', '')}`);

    if (container) {
        const estado = apt.ESTADO || 'Pendiente';

        // Estilos de estado Neo-Medical
        const stateConfig = {
            'Pendiente': {
                cardBg: 'bg-white',
                textColor: 'text-dark',
                indicatorBg: 'bg-amber-400',
                borderColor: 'border-slate-100',
                accentLine: 'bg-amber-400/50'
            },
            'Confirmada': {
                cardBg: 'bg-emerald-50/60',
                textColor: 'text-emerald-900',
                indicatorBg: 'bg-emerald-500',
                borderColor: 'border-emerald-200',
                accentLine: 'bg-emerald-500'
            },
            'Cancelada': {
                cardBg: 'bg-slate-50',
                textColor: 'text-slate-400',
                indicatorBg: 'bg-slate-300',
                borderColor: 'border-transparent',
                accentLine: 'bg-slate-200'
            }
        };

        const config = stateConfig[estado] || stateConfig['Pendiente'];

        container.innerHTML = `
            <div oncontextmenu="window.openReagendarModal('${apt.id}', event)" 
                 class="w-full h-full rounded-[10px] ${config.cardBg} ${config.textColor} shadow-sm border ${config.borderColor} transition-all flex flex-col items-start justify-center px-3 hover:-translate-y-0.5 hover:shadow-glow isolate relative overflow-hidden group cursor-context-menu">
                <div class="absolute -right-6 -bottom-6 w-16 h-16 bg-black/5 rounded-full blur-md group-hover:scale-150 transition-transform duration-500"></div>
                <div class="absolute right-0 top-0 w-1.5 h-full ${config.accentLine}"></div>
                
                <!-- Acciones flotantes -->
                <div class="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    ${estado === 'Pendiente' ? `
                        <button onclick="window.quickConfirmApt('${apt.id}')" 
                                class="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-soft transition-all" 
                                title="Confirmar Cita">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="4">
                                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button onclick="window.openEditAptModal('${apt.id}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[8px] font-bold transition-colors">EDITAR</button>
                    <button onclick="window.cancelApt('${apt.id}')" class="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-[8px] font-bold transition-colors">ANULAR</button>
                    ${apt['CELULAR DEL PACIENTE'] ? `
                    <button onclick="window.open('https://wa.me/${sanitizarCelularEcuador(apt['CELULAR DEL PACIENTE'])}', '_blank')" 
                            class="p-1.5 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-white shadow-soft transition-colors" title="Chat Directo">
                        <svg class="w-2.5 h-2.5" viewBox="0 0 737.509 740.824">
                            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"/>
                        </svg>
                    </button>
                    ` : ''}
                </div>

                <div class="flex items-center gap-1.5 mb-1">
                    <span class="w-1.5 h-1.5 rounded-full ${config.indicatorBg} shadow-glow"></span>
                    <span class="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">${apt['HORA DE CITA']} - ${apt['HORA FIN']} / Edad: ${apt['EDAD'] || '??'}</span>
                </div>
                <div class="text-[10px] font-display font-extrabold truncate w-[80%] z-10">${apt['NOMBRE DEL PACIENTE']}</div>
                <div class="text-[8px] font-bold opacity-60 uppercase tracking-tighter truncate w-[80%] z-10">${apt['MEDICO TRATANTE'] || 'Sin médico'}</div>
            </div>
        `;
    }
}

function updateTimeIndicator() {
    const indicator = document.getElementById('time-indicator');
    if (!indicator) return;

    const dtDate = document.getElementById('agenda-date')?.value;
    const today = new Date().toISOString().split('T')[0];

    // Validar si estamos en el día actúal
    if (dtDate !== today) {
        indicator.style.display = 'none';
        return;
    }

    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Jornada laboral
    if (h < 8 || (h === 20 && m > 30) || h > 20) {
        indicator.style.display = 'none';
        return;
    }

    indicator.style.display = 'block';

    const startHour = 8;
    const minsSinceStart = ((h - startHour) * 60) + m;

    // Header fijo mide h-14 (56px) 
    // Slots miden h-16 (64px) -> Por cada 30min recorremos 64px (o sea ~2.133px por minuto)
    const headerHeight = 56;
    const pxPerMin = 64 / 30;
    const topPx = headerHeight + (minsSinceStart * pxPerMin);

    indicator.style.top = `${topPx}px`;
}

window.openNewAptModal = async (time, chair) => {
    document.getElementById('apt-id').value = '';
    document.getElementById('btn-submit-apt').innerText = 'Confirmar Agendamiento';
    document.getElementById('apt-status').value = 'Pendiente';

    if (time) document.getElementById('apt-time-start').value = time;
    if (chair) document.getElementById('apt-chair').value = chair.toString();

    // Auto-set end time to +30 min if start is set
    if (time) {
        const idx = SLOTS.indexOf(time);
        if (idx !== -1 && idx < SLOTS.length - 1) {
            document.getElementById('apt-time-end').value = SLOTS[idx + 1];
        } else {
            document.getElementById('apt-time-end').value = SLOTS[idx] || SLOTS[0];
        }
    }

    const modal = document.getElementById('appointment-modal');
    modal.classList.replace('opacity-0', 'opacity-100');
    modal.classList.remove('pointer-events-none');
    document.getElementById('apt-modal-container').classList.replace('scale-95', 'scale-100');
};

window.openEditAptModal = async (id) => {
    const { data: apt } = await supabase.from('CITAS').select('*').eq('id', id).single();
    if (!apt) return;

    document.getElementById('apt-id').value = id;

    // Recuperar ID interno del paciente (no está en CITAS, lo buscamos por "ID DEL PACIENTE" que es la cédula)
    let pId = '';
    if (apt['ID DEL PACIENTE']) {
        const { data: p } = await supabase.from('PACIENTES').select('id').eq('ID DEL PACIENTE', apt['ID DEL PACIENTE']).single();
        if (p) pId = p.id;
    }
    document.getElementById('apt-patient-id').value = pId;
    document.getElementById('apt-patient-search').value = apt['NOMBRE DEL PACIENTE'];
    document.getElementById('apt-patient-display').innerText = apt['NOMBRE DEL PACIENTE'];
    document.getElementById('apt-patient-search').classList.replace('bg-slate-50', 'bg-primary/5');
    document.getElementById('apt-patient-search').classList.add('text-primary');
    document.getElementById('apt-chair').value = apt['NUMERO SILLON'];
    document.getElementById('apt-date-input').value = apt['FECHA DE CITA'];
    document.getElementById('apt-time-start').value = apt['HORA DE CITA'];
    document.getElementById('apt-time-end').value = apt['HORA FIN'];
    document.getElementById('apt-doctor').value = apt['MEDICO TRATANTE'];
    document.getElementById('apt-reason').value = apt['MOTIVO DE CONSULTA'] || apt.motivo;
    document.getElementById('apt-status').value = apt.ESTADO || 'Pendiente';

    document.getElementById('btn-submit-apt').innerText = 'Guardar Cambios';

    const modal = document.getElementById('appointment-modal');
    modal.classList.replace('opacity-0', 'opacity-100');
    modal.classList.remove('pointer-events-none');
    document.getElementById('apt-modal-container').classList.replace('scale-95', 'scale-100');
};

window.cancelApt = async (id) => {
    if (confirm('¿Estás seguro de que deseas anular esta cita?')) {
        const { data: apt } = await supabase.from('CITAS').select('*').eq('id', id).single();
        if (apt) {
            const updated = { ...apt, ESTADO: 'Cancelada' };
            await supabase.from('CITAS').update(updated).eq('id', updated.id);
            loadAppointmentsDate(apt['FECHA DE CITA']);
            showSuccessAlert('Cita cancelada correctamente');
        }
    }
};

window.quickConfirmApt = async (id) => {
    const { data: apt } = await supabase.from('CITAS').select('*').eq('id', id).single();
    if (apt) {
        const updated = { ...apt, ESTADO: 'Confirmada' };
        await supabase.from('CITAS').update(updated).eq('id', updated.id);
        loadAppointmentsDate(apt['FECHA DE CITA']);
        showSuccessAlert(`Cita de ${apt['NOMBRE DEL PACIENTE']} confirmada correctamente`);
    }
};

window.closeAptModal = () => {
    const modal = document.getElementById('appointment-modal');
    modal.classList.replace('opacity-100', 'opacity-0');
    modal.classList.add('pointer-events-none');
    document.getElementById('apt-modal-container').classList.replace('scale-100', 'scale-95');
    document.getElementById('new-appointment-form').reset();
    document.getElementById('apt-id').value = '';
    document.getElementById('apt-patient-id').value = '';
    document.getElementById('apt-patient-search').value = '';
    document.getElementById('apt-patient-display').innerText = '';
    document.getElementById('apt-patient-search').classList.remove('text-primary', 'bg-primary/5');
    document.getElementById('apt-patient-search').classList.add('bg-slate-50');
};

window.openReagendarModal = async (id, event) => {
    if (event) event.preventDefault(); // For oncontextmenu

    const { data: apt } = await supabase.from('CITAS').select('*').eq('id', parseInt(id)).single();
    if (!apt) return;

    document.getElementById('reagendar-apt-id').value = apt.id;
    document.getElementById('reagendar-sillon-id').value = apt['NUMERO SILLON'];

    // Recuperar ID interno del paciente
    let pId = '';
    if (apt['ID DEL PACIENTE']) {
        const { data: p } = await supabase.from('PACIENTES').select('id').eq('ID DEL PACIENTE', apt['ID DEL PACIENTE']).single();
        if (p) pId = p.id;
    }
    document.getElementById('reagendar-paciente-id').value = pId;
    document.getElementById('reagendar-date').value = apt['FECHA DE CITA'];
    document.getElementById('reagendar-time-start').value = apt['HORA DE CITA'];

    // Attempt to select the specific time
    const startSelect = document.getElementById('reagendar-time-start');
    if ([...startSelect.options].map(o => o.value).includes(apt['HORA DE CITA'])) {
        startSelect.value = apt['HORA DE CITA'];
    }

    const endSelect = document.getElementById('reagendar-time-end');
    if ([...endSelect.options].map(o => o.value).includes(apt['HORA FIN'])) {
        endSelect.value = apt['HORA FIN'];
    }

    const modal = document.getElementById('reagendar-modal');
    modal.classList.replace('opacity-0', 'opacity-100');
    modal.classList.remove('pointer-events-none');
    document.getElementById('reagendar-modal-container').classList.replace('scale-95', 'scale-100');
};

window.closeReagendarModal = () => {
    const modal = document.getElementById('reagendar-modal');
    modal.classList.replace('opacity-100', 'opacity-0');
    modal.classList.add('pointer-events-none');
    document.getElementById('reagendar-modal-container').classList.replace('scale-100', 'scale-95');
    document.getElementById('reagendar-form').reset();
};

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE RECORDATORIOS T-24h
// ═══════════════════════════════════════════════════════════════════════════

/** Caché de citas de mañana para reutilizar entre funciones */
let _citasCache = [];

/**
 * Lógica de inicialización: carga el badge al montar la vista.
 */
function setupRecordatoriosLogic() {
    // Pre-carga silenciosa del badge al abrir la agenda
    obtenerCitasMañana().then(citas => {
        _citasCache = citas;
        const badge = document.getElementById('badge-recordatorios');
        if (badge) {
            const pendientes = citas.filter(c => !c.recordatorio_enviado).length;
            if (pendientes > 0) {
                badge.textContent = pendientes;
                badge.classList.remove('hidden');
            }
        }
    }).catch(e => console.warn('No se pudo pre-cargar recordatorios:', e.message));
}

/**
 * Abre el modal y renderiza la lista de citas del día siguiente.
 */
window.openRecordatoriosModal = async () => {
    const modal = document.getElementById('recordatorios-modal');
    const container = document.getElementById('recordatorios-modal-container');
    const fechaLabel = document.getElementById('recordatorios-fecha-label');
    const lista = document.getElementById('recordatorios-lista');
    const countEl = document.getElementById('recordatorios-count');
    const btnTodos = document.getElementById('btn-enviar-todos');

    // Abrir modal con animación
    modal.classList.replace('opacity-0', 'opacity-100');
    modal.classList.remove('pointer-events-none');
    container.classList.replace('scale-95', 'scale-100');

    // Actualizar label de fecha
    const fechaMañana = getFechaMañana();
    if (fechaLabel) {
        fechaLabel.textContent = 'Citas para: ' + formatFechaAmigable(fechaMañana);
    }

    // Mostrar spinner
    lista.innerHTML = `
        <div class="flex items-center justify-center py-16">
            <div class="text-slate-300 text-center">
                <svg class="w-8 h-8 mx-auto mb-3 animate-spin text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round"/>
                </svg>
                <p class="text-sm font-bold text-slate-400">Consultando citas...</p>
            </div>
        </div>`;

    // Obtener citas
    try {
        const citas = await obtenerCitasMañana();
        _citasCache = citas;
        renderListaRecordatorios(citas, lista, countEl, btnTodos);
    } catch (err) {
        lista.innerHTML = `
            <div class="p-6 bg-red-50 rounded-xl text-center">
                <p class="text-red-500 font-bold text-sm">Error al cargar las citas</p>
                <p class="text-red-400 text-xs mt-1">${err.message}</p>
            </div>`;
    }
};

/**
 * Renderiza las tarjetas de pacientes en el modal.
 */
function renderListaRecordatorios(citas, lista, countEl, btnTodos) {
    const pendientes = citas.filter(c => !c.recordatorio_enviado);

    // Actualizar contador
    if (countEl) {
        countEl.textContent = `${pendientes.length} paciente${pendientes.length !== 1 ? 's' : ''} detectado${pendientes.length !== 1 ? 's' : ''} para mañana`;
    }

    // Actualizar badge del header
    const badge = document.getElementById('badge-recordatorios');
    if (badge) {
        if (pendientes.length > 0) {
            badge.textContent = pendientes.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Estado vacío
    if (citas.length === 0) {
        lista.innerHTML = `
            <div class="flex flex-col items-center justify-center py-14 text-center">
                <div class="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 4L12 14.01l-3-3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <p class="text-base font-bold text-slate-600">Sin citas programadas para mañana</p>
                <p class="text-xs text-slate-400 mt-1 font-medium">No hay pacientes que notificar en este momento.</p>
            </div>`;
        if (btnTodos) btnTodos.disabled = true;
        return;
    }

    if (btnTodos) btnTodos.disabled = pendientes.length === 0;

    // Renderizar tarjetas
    lista.innerHTML = citas.map((cita, idx) => {
        const sillonLabel = `Sillón 0${cita.idSillon}`;
        const msgWA = generarMensajeWA({
            nombre: cita.nombre,
            fechaISO: cita.fechaISO,
            horaInicio: cita.horaInicio,
            idSillon: cita.idSillon
        });
        const waUrl = cita.celular
            ? `https://wa.me/${cita.celular}?text=${encodeURIComponent(msgWA)}`
            : null;

        const yaEnviado = cita.recordatorio_enviado;

        return `
        <div id="rec-card-${idx}" class="flex items-center gap-4 p-4 rounded-[16px] border ${yaEnviado ? 'bg-green-50 border-green-100 opacity-70' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-soft'} transition-all">
            <!-- Avatar -->\n            <div class="w-11 h-11 rounded-[12px] flex-shrink-0 flex items-center justify-center text-base font-bold text-white ${yaEnviado ? 'bg-green-400' : 'bg-primary'}">
                ${cita.nombre.charAt(0)}
            </div>
            <!-- Info -->\n            <div class="flex-grow min-w-0">
                <div class="font-bold text-dark text-sm truncate">${cita.nombre}</div>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${cita.horaInicio}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${sillonLabel}</span>
                    ${cita.celular ? `<span class="w-1 h-1 rounded-full bg-slate-300"></span><span class="text-[10px] font-bold text-slate-400">${cita.celular}</span>` : '<span class="text-[10px] font-bold text-red-400">Sin teléfono</span>'}
                </div>
            </div>
            <!-- Acción -->\n            <div class="flex-shrink-0">
                ${yaEnviado
                ? `<div class="flex items-center gap-1 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                           <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                           Enviado
                       </div>`
                : waUrl
                    ? `<a href="${waUrl}" target="_blank"
                               onclick="window.marcarEnviado(${idx})"
                               <svg class="w-3.5 h-3.5" viewBox="0 0 737.509 740.824">
                                   <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"/>
                               </svg>
                               WhatsApp
                           </a>`
                    : `<span class="text-[10px] font-bold text-slate-300 uppercase">Sin contacto</span>`
            }
            </div>
        </div>`;
    }).join('');
}

/**
 * Marca un recordatorio como enviado desde la tarjeta individual.
 */
window.marcarEnviado = async (idx) => {
    const cita = _citasCache[idx];
    if (!cita) return;

    // Esperar ~1s para que el usuario vea el link abrirse
    setTimeout(async () => {
        await marcarRecordatorioEnviado(cita);
        _citasCache[idx] = { ...cita, recordatorio_enviado: true };

        // Actualizar tarjeta visualmente
        const card = document.getElementById(`rec-card-${idx}`);
        if (card) {
            card.classList.replace('bg-white', 'bg-green-50');
            card.classList.replace('border-slate-100', 'border-green-100');
            card.classList.add('opacity-70');
            const actionDiv = card.querySelector('.flex-shrink-0:last-child');
            if (actionDiv) {
                actionDiv.innerHTML = `<div class="flex items-center gap-1 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Enviado
                </div>`;
            }
        }

        // Actualizar badge
        const pendientes = _citasCache.filter(c => !c.recordatorio_enviado).length;
        const badge = document.getElementById('badge-recordatorios');
        if (badge) {
            if (pendientes > 0) {
                badge.textContent = pendientes;
            } else {
                badge.classList.add('hidden');
            }
        }

        showSuccessAlert('Recordatorio marcado como enviado');
    }, 800);
};

/**
 * Abre todos los WhatsApp pendientes uno por uno (ventana separada por cada uno).
 */
window.enviarTodosRecordatorios = async () => {
    const pendientes = _citasCache.filter(c => !c.recordatorio_enviado && c.celular);

    if (pendientes.length === 0) {
        showSuccessAlert('No hay recordatorios pendientes para enviar');
        return;
    }

    const btnTodos = document.getElementById('btn-enviar-todos');
    if (btnTodos) {
        btnTodos.disabled = true;
        btnTodos.innerHTML = `
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round"/></svg>
            Enviando (${pendientes.length})...`;
    }

    // Abrir cada WhatsApp con delay de 600ms entre cada uno para evitar bloqueo del browser
    for (let i = 0; i < pendientes.length; i++) {
        const cita = pendientes[i];
        const idx = _citasCache.indexOf(cita);
        const msg = generarMensajeWA({
            nombre: cita.nombre,
            fechaISO: cita.fechaISO,
            horaInicio: cita.horaInicio,
            idSillon: cita.idSillon
        });

        await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 700));
        window.open(`https://wa.me/${cita.celular}?text=${encodeURIComponent(msg)}`, '_blank');

        // Marcar como enviado
        await marcarRecordatorioEnviado(cita);
        if (idx >= 0) {
            _citasCache[idx] = { ...cita, recordatorio_enviado: true };
        }
    }

    // Refrescar la lista
    const lista = document.getElementById('recordatorios-lista');
    const countEl = document.getElementById('recordatorios-count');
    if (lista && countEl) {
        renderListaRecordatorios(_citasCache, lista, countEl, btnTodos);
    }

    if (btnTodos) {
        btnTodos.disabled = false;
        btnTodos.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M22 2L11 13" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22 11 13 2 9l20-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Enviar a Todos`;
    }

    showSuccessAlert(`${pendientes.length} recordatorio${pendientes.length !== 1 ? 's' : ''} enviado${pendientes.length !== 1 ? 's' : ''} exitosamente`);
};

/**
 * Cierra el modal de recordatorios.
 */
window.closeRecordatoriosModal = () => {
    const modal = document.getElementById('recordatorios-modal');
    const container = document.getElementById('recordatorios-modal-container');
    modal.classList.replace('opacity-100', 'opacity-0');
    modal.classList.add('pointer-events-none');
    container.classList.replace('scale-100', 'scale-95');
};


/**
 * Envía una notificación de WhatsApp al paciente tras agendar o actualizar una cita.
 * @param {Object} data - { celular, nombre_paciente, fecha, hora }
 */
window.enviarNotificacionWhatsApp = (data) => {
    const { celular, nombre, fecha, hora } = data;
    if (!celular) {
        console.warn('⚠️ No se puede enviar WhatsApp: Celular ausente.');
        return;
    }

    const mensaje = generarMensajeConfirmacionPremium({ nombre, fecha, hora });
    const encodedMsg = encodeURIComponent(mensaje);
    const cleanPhone = sanitizarCelularEcuador(celular);

    // Abrir WhatsApp Web/App (Prefijo 593 forzado)
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
    window.open(url, '_blank');
};
