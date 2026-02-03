/**
 * Calcula o TOTAL de dias marcados no calendário desde janeiro do ano atual
 * Esta função conta TODOS os dias marcados, independente de serem consecutivos ou não.
 * 
 * @param markedDays Objeto com todos os dias marcados no formato { "YYYY-MM-DD": true, ... }
 * @returns Número total de dias marcados no ano atual
 */
export function calculateSequence(markedDays: { [key: string]: boolean }): number {
  const currentYear = new Date().getFullYear()
  
  // Contar TODOS os dias marcados do ano atual
  const totalDays = Object.keys(markedDays)
    .filter(key => {
      if (!markedDays[key]) return false
      const date = new Date(key + 'T00:00:00')
      return date.getFullYear() === currentYear
    })
    .length
  
  return totalDays
}

