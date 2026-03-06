/**
 * supabase-client.js
 * Cliente Supabase cargado vía CDN ESM para máxima compatibilidad con GitHub Pages.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import SUPABASE_CONFIG from '../config.js';

let _client = null;

export function getSupabase() {
    if (!_client) {
        _client = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
    }
    return _client;
}

// Helper: llama getSupabase().from(table) de forma segura
export function sbFrom(table) {
    return getSupabase().from(table);
}

// Objeto supabase compatible para uso directo
export const supabase = {
    from: (table) => getSupabase().from(table),
    channel: (name) => getSupabase().channel(name),
    auth: {
        getUser: () => getSupabase().auth.getUser(),
        signOut: () => getSupabase().auth.signOut(),
    },
    realtime: {
        setAuth: (t) => getSupabase().realtime.setAuth(t),
    },
    storage: {
        from: (name) => getSupabase().storage.from(name)
    }
};
