/**
 * Financial Calculations
 */
export function calculateBalance(abonos) {
    if (!abonos || abonos.length === 0) return 0;
    return abonos.reduce((total, a) => total + (a.ABONO || 0), 0);
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}
