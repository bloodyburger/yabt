const currencyFormats: Record<string, { locale: string; currency: string }> = {
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
    GBP: { locale: 'en-GB', currency: 'GBP' },
    INR: { locale: 'en-IN', currency: 'INR' },
    JPY: { locale: 'ja-JP', currency: 'JPY' },
    CAD: { locale: 'en-CA', currency: 'CAD' },
    AUD: { locale: 'en-AU', currency: 'AUD' },
    CHF: { locale: 'de-CH', currency: 'CHF' },
    CNY: { locale: 'zh-CN', currency: 'CNY' },
    SGD: { locale: 'en-SG', currency: 'SGD' },
    AED: { locale: 'ar-AE', currency: 'AED' },
}

export function formatMoney(amount: number, currencyCode: string = 'USD'): string {
    const format = currencyFormats[currencyCode] || currencyFormats.USD
    return new Intl.NumberFormat(format.locale, {
        style: 'currency',
        currency: format.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function parseMoney(value: string): number {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
}

export function getMoneyColorClass(amount: number): string {
    if (amount < 0) return 'text-red-500'
    if (amount === 0) return 'text-slate-400'
    return 'text-emerald-500'
}
