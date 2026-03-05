/**
 * Odontogram Component - S.A.C.H. Pro Clinical
 * Dynamic Modal & Symbol Overlay Implementation
 */

import { supabase } from '../../data/supabase-client.js';

export class Odontogram {
    constructor(containerId, initialData = {}, onUpdate = null, patient = null) {
        this.container = document.getElementById(containerId);
        this.data = initialData || {}; // ToothID -> { faces: {}, symbol: '...', status: '...' }
        this.onUpdate = onUpdate;
        this.patient = patient;
        this.catalog = [];

        if (!this.container) {
            console.error(`Odontogram container #${containerId} not found`);
        }

        this.loadCatalog();
    }

    async loadCatalog() {
        const { data } = await supabase.from('TRATAMIENTOS').select('*');
        this.catalog = data || [];
    }

    setData(newData) {
        this.data = newData || {};
        this.render();
    }

    render() {
        if (!this.container) return;

        const q1 = [18, 17, 16, 15, 14, 13, 12, 11];
        const q2 = [21, 22, 23, 24, 25, 26, 27, 28];
        const q4 = [48, 47, 46, 45, 44, 43, 42, 41];
        const q3 = [31, 32, 33, 34, 35, 36, 37, 38];

        this.container.innerHTML = `
            <div class="odontogram-wrapper relative p-10 bg-white rounded-[32px] shadow-soft border border-slate-50 transition-all duration-500 overflow-hidden">
                
                <!-- Divider Axes (Ejes de Cuadrantes) - Color Turquesa Neo-Medical -->
                <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-accent/30 -translate-y-1/2 z-0"></div>
                <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-accent/30 -translate-x-1/2 z-0"></div>

                <div class="relative z-10 flex flex-col gap-12">
                    <!-- Upper Arch (Q1 | Q2) -->
                    <div class="flex justify-center items-center gap-12">
                        <div class="flex items-center gap-1.5 flex-nowrap">
                            ${q1.map(id => this.renderTooth(id)).join('')}
                        </div>
                        <div class="flex items-center gap-1.5 flex-nowrap">
                            ${q2.map(id => this.renderTooth(id)).join('')}
                        </div>
                    </div>

                    <!-- Lower Arch (Q4 | Q3) -->
                    <div class="flex justify-center items-center gap-12">
                        <div class="flex items-center gap-1.5 flex-nowrap">
                            ${q4.map(id => this.renderTooth(id)).join('')}
                        </div>
                        <div class="flex items-center gap-1.5 flex-nowrap">
                            ${q3.map(id => this.renderTooth(id)).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Dynamic Modal (Clinical Engine) -->
            <div id="odont-face-modal" class="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-[8px] z-[1000] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-500 p-4">
                <div class="bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,112,184,0.15)] scale-95 transition-all duration-300 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col ring-1 ring-white/20" id="odont-face-container">
                    <!-- Dynamic clinical content -->
                </div>
            </div>
        `;

        this.attachGlobalListeners();
    }

    renderTooth(id) {
        const toothData = this.data[id] || { faces: {}, symbol: null, status: 'caries' };
        const status = toothData.status || 'caries';
        const color = (status === 'realizado') ? '#3B82F6' : '#FF5F5F'; // Blue vs Red
        const getFaceColor = (face) => toothData.faces?.[face] ? color : '#FFFFFF';

        // Base tooth structure
        let toothSvg = `
            <div class="tooth-unit flex flex-col items-center gap-2 group cursor-pointer" onclick="window._odontInstance.openClinicalModal('${id}')">
                <span class="text-[9px] font-bold text-slate-400 group-hover:text-primary transition-colors">${id}</span>
                <div class="relative w-10 h-10">
                    <svg width="40" height="40" viewBox="0 0 40 40" class="drop-shadow-sm overflow-visible absolute inset-0">
                        <path d="M 5,5 L 35,5 L 20,20 Z" fill="${getFaceColor('V')}" stroke="#94A3B8" stroke-width="0.75" />
                        <path d="M 5,35 L 35,35 L 20,20 Z" fill="${getFaceColor('L')}" stroke="#94A3B8" stroke-width="0.75" />
                        <path d="M 5,5 L 5,35 L 20,20 Z" fill="${getFaceColor('M')}" stroke="#94A3B8" stroke-width="0.75" />
                        <path d="M 35,5 L 35,35 L 20,20 Z" fill="${getFaceColor('D')}" stroke="#94A3B8" stroke-width="0.75" />
                        <rect x="13" y="13" width="14" height="14" fill="${getFaceColor('O')}" stroke="#94A3B8" stroke-width="0.75" />
        `;

        // Symbols Overlay
        if (toothData.symbol) {
            toothSvg += this.getSymbolSvg(toothData.symbol, color);
        }

        toothSvg += `
                    </svg>
                </div>
            </div>
        `;

        return toothSvg;
    }

    getSymbolSvg(symbol, color) {
        switch (symbol) {
            case 'corona': // ◯ Circle
                return `<circle cx="20" cy="20" r="16" fill="none" stroke="${color}" stroke-width="2.5" />`;
            case 'sellante': // ✳ Asterisk (simplified as 4 crossed lines)
                return `<g stroke="${color}" stroke-width="2.5">
                            <line x1="12" y1="12" x2="28" y2="28" />
                            <line x1="28" y1="12" x2="12" y2="28" />
                            <line x1="20" y1="10" x2="20" y2="30" />
                            <line x1="10" y1="20" x2="30" y2="20" />
                        </g>`;
            case 'endodoncia': // △ Triangle
                return `<path d="M 20,8 L 32,32 L 8,32 Z" fill="none" stroke="${color}" stroke-width="2" />`;
            case 'exodoncia': // ❌ Cross
                return `<g stroke="${color}" stroke-width="3" stroke-linecap="round">
                            <line x1="8" y1="8" x2="32" y2="32" />
                            <line x1="32" y1="8" x2="8" y2="32" />
                        </g>`;
            case 'otros': // ⬜ Square
                return `<rect x="8" y="8" width="24" height="24" fill="none" stroke="${color}" stroke-width="2.5" />`;
            default:
                return '';
        }
    }

    openClinicalModal(id) {
        window._currentToothId = id;
        const modal = document.getElementById('odont-face-modal');
        const container = document.getElementById('odont-face-container');

        const isChild = (this.patient?.EDAD < 17);
        const categoryFilter = isChild ? 'NIÑO' : 'ADULTO';

        container.innerHTML = `
            <div class="p-8 border-b border-white/20 flex justify-between items-start bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <div>
                    <h3 class="text-2xl font-display font-extrabold text-primary tracking-tight drop-shadow-sm">Diente ${id}</h3>
                    <p class="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">Plan de Tratamiento (${categoryFilter})</p>
                </div>
                <button onclick="window._odontInstance.closeClinicalModal()" class="w-10 h-10 bg-white shadow-soft rounded-full flex items-center justify-center text-primary/60 hover:text-primary hover:scale-105 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>

            <div class="p-8 space-y-8 flex-grow overflow-y-auto custom-scrollbar">
                
                <!-- Estado Selector -->
                <div class="flex gap-4">
                    <button id="st-caries" onclick="window._odontInstance.setStatus('caries')" class="status-btn flex-1 p-4 rounded-2xl border-2 border-red-100 bg-white text-red-500 font-bold text-xs uppercase tracking-widest flex flex-col items-center gap-2 active ring-4 ring-red-50 hover:border-red-200 hover:bg-red-50/50 transition-all shadow-sm">
                        <span class="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Por Realizar
                    </button>
                    <button id="st-realizado" onclick="window._odontInstance.setStatus('realizado')" class="status-btn flex-1 p-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-400 font-bold text-xs uppercase tracking-widest flex flex-col items-center gap-2 hover:border-blue-100 hover:bg-blue-50/50 transition-all shadow-sm">
                        <span class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span> Existente
                    </button>
                </div>

                <!-- GRUPO A: Operatorios -->
                <div class="space-y-4">
                    <h4 class="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <span class="w-1.5 h-4 bg-primary rounded-full"></span> Grupo A: Restauración x Caras
                    </h4>
                    <div id="faces-selector" class="grid grid-cols-5 gap-3">
                        ${['V', 'L', 'M', 'D', 'O'].map(f => `
                            <button onclick="window._odontInstance.toggleFace('${f}')" id="face-${f}" class="py-3 px-2 border-2 border-slate-100 bg-white rounded-xl text-[10px] font-bold text-slate-500 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm">
                                ${f === 'V' ? 'Vest' : f === 'L' ? 'Ling' : f === 'M' ? 'Mes' : f === 'D' ? 'Dist' : 'Oclu'}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- GRUPO B & C: Procedimientos -->
                <div class="space-y-4">
                    <h4 class="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <span class="w-1.5 h-4 bg-primary/70 rounded-full"></span> Grupo B y C: Procedimientos Clínicos
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="procedimientos-list">
                        <!-- Loaded from catalog -->
                    </div>
                </div>
            </div>

            <div class="p-6 bg-slate-50/80 border-t border-slate-100 flex gap-4 backdrop-blur-sm">
                <button onclick="window._odontInstance.clearTooth('${id}')" class="sach-button variant-unset !h-14 !px-6 border-2 border-red-200 text-red-500 bg-white hover:bg-red-50 transition-colors rounded-xl shadow-sm font-bold text-sm">Limpiar Diente</button>
                <button onclick="window._odontInstance.applyClinicalChanges()" class="sach-button variant-set bg-[#00BFA6] hover:bg-[#00a892] text-white !h-14 w-full shadow-[0_8px_20px_rgba(0,191,166,0.3)] transition-all rounded-xl font-bold text-sm">Finalizar Procedimiento</button>
            </div>
        `;

        this.renderProcedimientos(categoryFilter);
        this.syncModalState(id);

        modal.classList.replace('opacity-0', 'opacity-100');
        modal.classList.remove('pointer-events-none');
        container.classList.replace('scale-95', 'scale-100');

        // Block background scroll
        document.body.style.overflow = 'hidden';
    }

    renderProcedimientos(category) {
        const list = document.getElementById('procedimientos-list');
        const filtered = this.catalog.filter(t => t.CATEGORIA === category || t.CATEGORIA === 'AMBOS');

        list.innerHTML = filtered.map(t => {
            const label = t.TRATAMIENTO || '';
            let group = 'C'; // General
            let symbol = null;

            if (label.toLowerCase().includes('corona')) { group = 'B'; symbol = 'corona'; }
            else if (label.toLowerCase().includes('sellante')) { group = 'B'; symbol = 'sellante'; }
            else if (label.toLowerCase().includes('endodoncia')) { group = 'B'; symbol = 'endodoncia'; }
            else if (label.toLowerCase().includes('exodoncia') || label.toLowerCase().includes('extraccion')) { group = 'B'; symbol = 'exodoncia'; }
            else if (['protesis', 'perno', 'parcial'].some(k => label.toLowerCase().includes(k))) { group = 'B'; symbol = 'otros'; }

            return `
                <button onclick="window._odontInstance.selectProcedimiento('${t.id}', '${group}', '${symbol || ''}')" 
                        class="proc-btn text-left p-4 rounded-xl border bg-white hover:border-accent transition-all group"
                        data-id="${t.id}">
                    <p class="text-[11px] font-extrabold text-dark group-hover:text-accent leading-tight">${label}</p>
                    <p class="text-[10px] font-bold text-slate-400 mt-1">$${parseFloat(t.VALOR).toFixed(2)}</p>
                </button>
            `;
        }).join('');
    }

    syncModalState(id) {
        const toothData = this.data[id] || { faces: {}, status: 'caries', symbol: null };
        this.setStatus(toothData.status || 'caries');

        // Faces
        Object.keys(toothData.faces || {}).forEach(f => {
            const btn = document.getElementById(`face-${f}`);
            if (btn) btn.classList.add('bg-primary/10', 'border-primary', 'text-primary');
        });

        this._tempData = JSON.parse(JSON.stringify(toothData));
    }

    setStatus(st) {
        this._tempStatus = st;
        const cBtn = document.getElementById('st-caries');
        const rBtn = document.getElementById('st-realizado');

        [cBtn, rBtn].forEach(b => b.classList.remove('active', 'ring-4', 'ring-red-50', 'ring-blue-50', 'border-red-500', 'border-blue-500', 'bg-red-50', 'bg-blue-50', 'text-red-600', 'text-blue-600'));

        if (st === 'caries') {
            cBtn.classList.add('active', 'ring-4', 'ring-red-50', 'border-red-500', 'bg-red-50', 'text-red-600');
        } else {
            rBtn.classList.add('active', 'ring-4', 'ring-blue-50', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        }
    }

    toggleFace(f) {
        if (!this._tempData.faces) this._tempData.faces = {};
        const btn = document.getElementById(`face-${f}`);

        if (this._tempData.faces[f]) {
            delete this._tempData.faces[f];
            btn.classList.remove('bg-primary/10', 'border-primary', 'text-primary');
        } else {
            this._tempData.faces[f] = true;
            btn.classList.add('bg-primary/10', 'border-primary', 'text-primary');
        }
    }

    selectProcedimiento(id, group, symbol) {
        // Deselect others
        document.querySelectorAll('.proc-btn').forEach(b => b.classList.remove('border-accent', 'bg-accent/5'));
        document.querySelector(`.proc-btn[data-id="${id}"]`).classList.add('border-accent', 'bg-accent/5');

        this._selectedProcedimiento = this.catalog.find(t => t.id == id);
        this._tempData.symbol = symbol || null;
        this._tempData.procedimiento = this._selectedProcedimiento;
    }

    async clearTooth(id) {
        if (confirm('¿Limpiar toda la información gráfica de este diente?')) {
            delete this.data[id];
            await this.syncBudgetWithOdontogram();
            this.closeClinicalModal();
            this.render();
            if (this.onUpdate) this.onUpdate(this.data);
            if (window.renderizarModuloClinico) window.renderizarModuloClinico(this.patient.id, 'odontograma');
        }
    }

    async applyClinicalChanges() {
        const id = window._currentToothId;
        this._tempData.status = this._tempStatus;

        // GRUPO A: Si hay caras pero NO procedimiento B, auto-asignar Operatoria
        const hasFaces = Object.keys(this._tempData.faces || {}).length > 0;
        if (hasFaces && !this._tempData.procedimiento) {
            const isChild = (this.patient?.EDAD < 17);
            const opName = isChild ? 'Operatoria Niño' : 'Operatoria Adulto';
            this._tempData.procedimiento = this.catalog.find(t => t.TRATAMIENTO === opName);
        }

        // Detect Status Change to 'realizado' for Clinical History Logging
        const oldStatus = this.data[id]?.status || 'caries';
        const newStatus = this._tempStatus;
        const procName = this._tempData.procedimiento?.TRATAMIENTO || this._tempData.procedimiento?.nombre || 'Procedimiento';

        if (oldStatus !== 'realizado' && newStatus === 'realizado') {
            const history = this.patient['plan_tratamiento_json'] || [];
            history.unshift({
                fecha: new Date().toISOString(),
                doctor: 'Dra. Lucía Quintero', // Default context
                nota: `Tratamiento Finalizado: ${procName} en el diente #${id}.`
            });

            // Persist History as well
            supabase.from('PACIENTES').update({ 'plan_tratamiento_json': history }).eq('id', this.patient.id).then(() => { });
            this.patient.plan_tratamiento_json = history; // Sync local
        }

        // Update local data
        this.data[id] = JSON.parse(JSON.stringify(this._tempData));

        // SYNC BUDGET: Rebuild the entire budget to ensure reactivity
        await this.syncBudgetWithOdontogram();

        this.closeClinicalModal();
        this.render();

        if (this.onUpdate) {
            this.onUpdate(this.data);
        }

        // 6. GLOBAL REFRESH: Notify the State Manager (pacientes_v2) to sync all clinical views
        if (window.renderizarModuloClinico) {
            window.renderizarModuloClinico(this.patient.id, window._currentTab || 'odontograma');
        }
    }

    async syncBudgetWithOdontogram() {
        const pId = this.patient?.id;
        if (!pId) return;

        // OPTIMISTIC UI: Update the shared patient object in memory IMMEDIATELY
        let b = this.patient.presupuesto_json || { items: [], abonos: [], total_abonado: 0 };
        if (Array.isArray(b)) b = { items: b, abonos: [], total_abonado: 0 };

        // 1. Filter items that DON'T come from the odontogram (manual/general items)
        const generalItems = b.items.filter(item => !item.diente);

        // 2. Generate new items based on current odontogram state
        const odontItems = [];
        for (const [toothId, toothData] of Object.entries(this.data)) {
            if (toothData.procedimiento) {
                const statusLabel = (toothData.status === 'realizado') ? 'EXISTENTE' : 'PENDIENTE';
                odontItems.push({
                    nombre: toothData.procedimiento.TRATAMIENTO || toothData.procedimiento.tratamiento,
                    costo: parseFloat(toothData.procedimiento.VALOR || toothData.procedimiento.valor),
                    diente: toothId,
                    estado: statusLabel,
                    fecha: new Date().toISOString()
                });
            }
        }

        // 3. Merge and Sync Memory
        b.items = [...generalItems, ...odontItems];
        this.patient.presupuesto_json = b;

        // 4. PERSIST (Background)
        supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId).then(() => { });

        // 5. BROADCAST: Trigger refresh of other clinical module tabs (Presupuesto/Historia)
        if (window.renderizarModuloClinico) {
            window.renderizarModuloClinico(this.patient.id, window._currentTab || 'odontograma');
        }
    }

    async addProcedimientoToBudget(proc) {
        // This logic needs to communicate with patients_v2 to update the budget_json
        // For simplicity, we can emit an event or let onUpdate handle it if we modify its signature
        // But Dante wants integration, so let's call a global if defined or handle it here
        const pId = this.patient?.id;
        if (!pId) return;

        const { data: p } = await supabase.from('PACIENTES').select('presupuesto_json').eq('id', pId).single();
        let b = p.presupuesto_json || { items: [], abonos: [], total_abonado: 0 };
        if (Array.isArray(b)) b = { items: b, abonos: [], total_abonado: 0 };

        b.items.push({
            nombre: proc.TRATAMIENTO || proc.tratamiento,
            costo: parseFloat(proc.VALOR || proc.valor),
            diente: window._currentToothId,
            fecha: new Date().toISOString()
        });

        await supabase.from('PACIENTES').update({ presupuesto_json: b }).eq('id', pId);
    }

    closeClinicalModal() {
        const modal = document.getElementById('odont-face-modal');
        const container = document.getElementById('odont-face-container');
        if (modal && container) {
            modal.classList.replace('opacity-100', 'opacity-0');
            modal.classList.add('pointer-events-none');
            container.classList.replace('scale-100', 'scale-95');

            // Restore background scroll
            document.body.style.overflow = '';
        }
    }

    attachGlobalListeners() {
        window._odontInstance = this;
    }
}
