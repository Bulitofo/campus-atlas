export const number = new Intl.NumberFormat('en-US');
export const dollars = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
export const median = values => {
  const sorted = values.filter(value => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return !sorted.length ? null : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
export const cityKey = row => `${row.city}, ${row.state}`;
export const yearOf = row => row.sale_date?.slice(0, 4) || 'Unknown';
export const pricePerSqft = row => row.living_area_sqft > 0 ? row.sale_price / row.living_area_sqft : null;
export function filterSales(rows, filters) {
  return rows.filter(row => (!filters.university || row.university === filters.university)
    && (!filters.city || cityKey(row) === filters.city)
    && (!filters.year || yearOf(row) === filters.year)
    && (!filters.distance || row.miles_to_campus <= Number(filters.distance)));
}
export function summarize(rows) {
  const area = rows.map(pricePerSqft).filter(value => value !== null);
  const days = rows.map(row => row.days_on_market).filter(value => value !== null);
  return {count: rows.length, price: median(rows.map(row => row.sale_price)),
    ppsf: median(area), ppsfCount: area.length, dom: median(days), domCount: days.length};
}
export function groupCities(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = cityKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups].map(([city, sales]) => ({city, ...summarize(sales)})).sort((a, b) => b.price - a.price || a.city.localeCompare(b.city));
}
export const distanceBands = [
  {label: '0–1 mi', min: -Infinity, max: 1}, {label: '>1–3 mi', min: 1, max: 3},
  {label: '>3–5 mi', min: 3, max: 5}, {label: '>5–10 mi', min: 5, max: 10},
  {label: '>10 mi', min: 10, max: Infinity},
];
export function groupDistance(rows) {
  return distanceBands.map(band => ({...band, ...summarize(rows.filter(row => row.miles_to_campus > band.min && row.miles_to_campus <= band.max))}));
}
export function searchSales(rows, query) {
  const q = query.trim().toLowerCase();
  return !q ? rows : rows.filter(row => [row.listing_id, row.address_street, row.city, row.zipcode].some(value => String(value).toLowerCase().includes(q)));
}
export function csvText(rows) {
  const fields = ['listing_id','address_street','city','state','zipcode','university','sale_date','sale_price','living_area_sqft','miles_to_campus','days_on_market'];
  const quote = value => {
    let text = value == null ? '' : String(value);
    if (typeof value === 'string' && /^[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [fields.map(quote).join(','), ...rows.map(row => fields.map(key => quote(row[key])).join(','))].join('\r\n');
}
