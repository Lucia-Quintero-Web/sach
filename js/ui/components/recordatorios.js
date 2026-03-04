/**
 * recordatorios.js
 * Sistema de Recordatorios WhatsApp T-24h
 * S.A.C.H Lucia Quintero - Neo-Medical Platform
 */
import { supabase } from '../../data/supabase-client.js';

// ─── Utilidades de fecha ─────────────────────────────────────────────────────

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Convierte "YYYY-MM-DD" → "Lunes 03 de Marzo del 2026"
 */
export function formatFechaAmigable(fechaISO) {
    if (!fechaISO) return '';
    const [yyyy, mm, dd] = fechaISO.split('-').map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return `${DIAS[d.getDay()]} ${String(dd).padStart(2, '0')} de ${MESES[mm - 1]} del ${yyyy}`;
}

/**
 * Convierte "YYYY-MM-DD" → "DD/MM/YYYY" (alias para Supabase)
 */
export function isoToDMY(fechaISO) {
    if (!fechaISO) return '';
    const [yyyy, mm, dd] = fechaISO.split('-');
    return `${dd}/${mm}/${yyyy}`;
}

/**
 * Devuelve la fecha de mañana en formato "YYYY-MM-DD"
 */
export function getFechaMañana() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

/**
 * Convierte número sillón → texto amigable
 */
function formatSillon(num) {
    return `Sillón 0${num}`;
}

/**
 * Sanitiza el número para Ecuador (593)
 * - Elimina caracteres no numéricos
 * - Elimina ceros a la izquierda
 * - Añade prefijo 593 si no lo tiene
 * @param {string} celular
 * @returns {string}
 */
export function sanitizarCelularEcuador(celular) {
    if (!celular) return '';
    let clean = celular.replace(/\D/g, '');

    // Eliminar ceros a la izquierda (ej: 09... -> 9...)
    clean = clean.replace(/^0+/, '');

    // Si no tiene el prefijo 593, añadirlo
    if (!clean.startsWith('593')) {
        clean = '593' + clean;
    }

    return clean;
}

// ─── Plantilla de mensaje ────────────────────────────────────────────────────

export function generarMensajeWA({ nombre, fechaISO, horaInicio, idSillon }) {
    const fechaAmigable = formatFechaAmigable(fechaISO);
    const sillonTexto = formatSillon(idSillon);
    return (
        `¡Hola ${nombre}! 👋 Te saludamos de la S.A.C.H Lucia Quintero. ` +
        `Queremos recordarte tu cita para mañana *${fechaAmigable}* ` +
        `a las *${horaInicio}* en nuestro *${sillonTexto}*. ` +
        `Por favor, confírmanos tu asistencia respondiendo a este mensaje. ¡Te esperamos! ✨`
    );
}

/**
 * Genera el mensaje de confirmación inmediata con estilo Premium
 * @param {Object} data - { nombre, fecha, hora }
 * @returns {string} - Mensaje formateado para WhatsApp
 */
export function generarMensajeConfirmacionPremium({ nombre, fecha, hora }) {
    const fechaAmigable = formatFechaAmigable(fecha);
    return `✨ *S.A.C.H. - Confirmación de Cita* ✨

Estimado/a *${nombre}*, es un placer saludarte.

Te confirmamos que tu cita ha sido programada con éxito en nuestras instalaciones:
📅 *Fecha:* ${fechaAmigable}
🕒 *Hora:* ${hora}
📍 *Ubicación:* Clínica Lucía Quintero

*Nota:* Agradecemos tu puntualidad para brindarte la mejor atención. Si necesitas reprogramar, por favor avísanos con 24 horas de antelación.

Tu bienestar es nuestra prioridad. 🌿`;
}

export function generarMensajeEmail({ nombre, fechaISO, horaInicio, idSillon }) {
    const fechaAmigable = formatFechaAmigable(fechaISO);
    const sillonTexto = formatSillon(idSillon);
    return (
        `Estimado/a ${nombre},\n\n` +
        `Le recordamos su cita médica programada para mañana ${fechaAmigable} ` +
        `a las ${horaInicio} en nuestro ${sillonTexto}.\n\n` +
        `Por favor confirme su asistencia respondiéndonos por WhatsApp o llamando a nuestra clínica.\n\n` +
        `Atentamente,\nS.A.C.H Lucia Quintero`
    );
}

// ─── Consulta de citas T-24h ─────────────────────────────────────────────────

/**
 * Obtiene citas de mañana que aún NO han recibido recordatorio.
 * Prioridad: Supabase (online) → IndexedDB (offline)
 */
export async function obtenerCitasMañana() {
    const fechaMañana = getFechaMañana();
    let citas = [];

    const { data, error } = await supabase
        .from('CITAS')
        .select('*')
        .eq('FECHA DE CITA', fechaMañana)
        .neq('ESTADO', 'Cancelada');

    if (!error && data && data.length > 0) {
        const pending = data.filter(c => !c.recordatorio_enviado)
        citas = pending.map(row => ({
            supabase_id: row.id,
            nombre: row['NOMBRE DEL PACIENTE'] || 'Paciente',
            celular: sanitizarCelularEcuador(row['CELULAR DEL PACIENTE'] || ''),
            correo: row['CORREO'] || '',
            fechaISO: fechaMañana,
            horaInicio: row['HORA DE CITA'] || '08:00',
            idSillon: parseInt(row['NUMERO SILLON'] || 1),
            recordatorio_enviado: !!row.recordatorio_enviado,
            _source: 'supabase'
        }));
    } else if (error) {
        console.warn('⚠️ Error al obtener citas:', error.message);
    }

    return citas;
}

// ─── Marcar recordatorio enviado ─────────────────────────────────────────────

/**
 * Actualiza el campo `recordatorio_enviado = true` en Supabase y en local.
 */
export async function marcarRecordatorioEnviado(cita) {
    if (cita.supabase_id) {
        try {
            await supabase
                .from('CITAS')
                .update({ recordatorio_enviado: true })
                .eq('id', cita.supabase_id);
        } catch (e) {
            console.warn('No se pudo actualizar Supabase:', e.message);
        }
    }
}
