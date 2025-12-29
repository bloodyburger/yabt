import { format, parseISO } from 'date-fns'

export function formatDateForDisplay(date: string | Date, dateFormat: string = 'YYYY-MM-DD'): string {
    const d = typeof date === 'string' ? parseISO(date) : date

    switch (dateFormat) {
        case 'MM/DD/YYYY':
            return format(d, 'MM/dd/yyyy')
        case 'DD/MM/YYYY':
            return format(d, 'dd/MM/yyyy')
        case 'DD-MM-YYYY':
            return format(d, 'dd-MM-yyyy')
        default:
            return format(d, 'yyyy-MM-dd')
    }
}

export function formatDateForDB(date: Date): string {
    return format(date, 'yyyy-MM-dd')
}

export function formatMonthForDisplay(date: Date): string {
    return format(date, 'MMMM yyyy')
}

export function formatMonthForDB(date: Date): string {
    return format(date, 'yyyy-MM') + '-01'
}

export function getToday(): Date {
    return new Date()
}

export function getNextMonth(date: Date): Date {
    const next = new Date(date)
    next.setMonth(next.getMonth() + 1)
    return next
}

export function getPreviousMonth(date: Date): Date {
    const prev = new Date(date)
    prev.setMonth(prev.getMonth() - 1)
    return prev
}
