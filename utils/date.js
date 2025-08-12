export function isDateRangeWithinLimit(start, end, limitDays = 60) {
  if (!start || !end) return true;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= limitDays;
}