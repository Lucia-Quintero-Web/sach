/**
 * Financial Calculations
 */
export function calculateBalance(abonos) {
    if (!abonos || abonos.length === 0) return 0;
    return abonos.reduce((total, a) => total + (a.ABONO || 0), 0);
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}
