import {number, dollars, cityKey, yearOf, filterSales, summarize, groupCities, groupDistance, searchSales, csvText} from './core.mjs';

const $ = id => document.getElementById(id);
const money = value => value === null ? '—' : dollars.format(value);
const n = value => number.format(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const controls = ['university','city','year','distance'];
const localCities = new Set(['Champaign, IL','Urbana, IL','Savoy, IL']);
const ILLINOIS = 'University of Illinois Urbana-Champaign';
const campusNames = {
  'Purdue University': 'Purdue',
  'The Pennsylvania State University': 'Penn State',
  'The University of Iowa': 'Iowa',
  'The University of North Carolina at Chapel Hill': 'UNC Chapel Hill',
  'University of California, Davis': 'UC Davis',
  'University of Florida': 'Florida',
  'University of Georgia': 'Georgia',
  [ILLINOIS]: 'Illinois Urbana-Champaign',
  'University of Michigan': 'Michigan',
  'University of Virginia': 'Virginia',
  'University of Wisconsin-Madison': 'Wisconsin–Madison',
};
let allRows = [], selectedRows = [], tableRows = [], meta, page = 1;
const pageSize = 10;
const filters = () => Object.fromEntries(controls.map(id => [id, $(id).value]));
function addOption(select, value, label) { select.add(new Option(label, value)); }
function cityOptions() {
  const previous = $('city').value;
  $('city').replaceChildren(new Option('All cities', ''));
  const rows = allRows.filter(row => !$('university').value || row.university === $('university').value);
  [...new Set(rows.map(cityKey))].sort().forEach(city => addOption($('city'), city, city));
  if ([...$('city').options].some(option => option.value === previous)) $('city').value = previous;
}
function saveFilters() {
  const url = new URL(location.href);
  for (const key of controls) $(key).value ? url.searchParams.set(key, $(key).value) : url.searchParams.delete(key);
  history.replaceState(null, '', url);
}
function reset() {
  for (const key of controls) $(key).value = '';
  cityOptions();
  $('search').value = '';
  $('sort').value = 'recent';
  render();
}
function render() {
  selectedRows = filterSales(allRows, filters());
  const summary = summarize(selectedRows);
  const cityCount = new Set(selectedRows.map(cityKey)).size;
  $('median-price').textContent = money(summary.price);
  $('sale-count').textContent = n(summary.count);
  $('median-ppsf').textContent = money(summary.ppsf);
  $('median-dom').textContent = summary.dom === null ? '—' : n(summary.dom);
  $('price-note').textContent = `${n(summary.count)} sales${summary.count > 0 && summary.count < 30 ? ' · small sample' : ' · nominal USD'}`;
  $('count-note').textContent = `${n(cityCount)} ${cityCount === 1 ? 'city / town' : 'cities & towns'} in this selection`;
  $('ppsf-note').textContent = `${n(summary.ppsfCount)} sales with positive living area`;
  $('dom-note').textContent = `${n(summary.domCount)} sales with both dates`;
  let caption = `Showing ${n(summary.count)} of ${n(meta.included_rows)} included sales · Price rule: $10,000–$5,000,000.`;
  if ($('year').value === '2023' || $('year').value === '2026') caption += ' Selected year has partial coverage.';
  if ($('year').value === 'Unknown') caption += ' Sale dates were not reported.';
  if (!$('year').value) caption += ' All years combined; 2023 and 2026 are partial.';
  $('load-status').textContent = caption;
  $('empty-state').hidden = summary.count > 0;
  $('charts').hidden = summary.count === 0;
  if (summary.count) {
    const cities = groupCities(selectedRows);
    const maxPrice = Math.max(...cities.map(city => city.price));
    $('city-chart').innerHTML = cities.map(city => `<button class="bar-row" type="button" data-city="${esc(city.city)}" aria-label="Explore ${esc(city.city)}, median ${money(city.price)}, ${n(city.count)} sales"><span class="bar-label">${esc(city.city)}<small>${n(city.count)} sales${city.count < 30 ? ' · small sample' : ''}</small></span><span class="bar-track" aria-hidden="true"><span class="bar ${localCities.has(city.city) ? 'local' : ''}" style="--bar-width:${city.price / maxPrice * 100}%"></span></span><span class="bar-value">${money(city.price)}</span></button>`).join('');
    const bands = groupDistance(selectedRows);
    const maxBand = Math.max(...bands.map(band => band.price || 0));
    $('distance-chart').innerHTML = bands.map(band => `<div class="distance-row"><div class="distance-label"><span>${esc(band.label)}</span><strong>${money(band.price)}</strong></div><div class="bar-track" aria-hidden="true"><span class="bar" style="--bar-width:${band.price ? band.price / maxBand * 100 : 0}%"></span></div><small>${n(band.count)} sales${band.count > 0 && band.count < 30 ? ' · small sample' : ''}${band.count === 0 ? ' · no observations' : ''}</small></div>`).join('') + '<p class="axis-label">USD · bars start at $0 · sample counts shown for each band</p>';
    if (cities.length > 1) {
      const high = cities[0], low = cities.at(-1);
      $('insight-title').textContent = `${(high.price / low.price).toFixed(1)}× from one town to another.`;
      $('insight-text').textContent = `In this selection, ${high.city} has a median of ${money(high.price)} (${n(high.count)} sales), compared with ${money(low.price)} in ${low.city} (${n(low.count)} sales). The mix of properties and sale dates matters.`;
    } else {
      const coverage = summary.domCount / summary.count * 100;
      $('insight-title').textContent = `${coverage.toFixed(1)}% have a market timeline.`;
      $('insight-text').textContent = `In ${cities[0].city}, ${n(summary.domCount)} of ${n(summary.count)} selected sales have both a listing and contract date. The days-on-market figure describes this subset; unreported timelines stay unknown.`;
    }
  }
  page = 1;
  renderTable();
  saveFilters();
}
function renderTable() {
  tableRows = searchSales(selectedRows, $('search').value);
  const sort = $('sort').value;
  tableRows.sort((a,b) => {
    let result = 0;
    if (sort === 'price-high') result = b.sale_price - a.sale_price;
    else if (sort === 'price-low') result = a.sale_price - b.sale_price;
    else if (sort === 'distance') result = a.miles_to_campus - b.miles_to_campus;
    else result = (b.sale_date || '').localeCompare(a.sale_date || '');
    return result || a.listing_id.localeCompare(b.listing_id);
  });
  const pages = Math.ceil(tableRows.length / pageSize);
  page = Math.max(1, Math.min(page, pages));
  const start = (page - 1) * pageSize;
  const visible = tableRows.slice(start, start + pageSize);
  $('sales-body').innerHTML = visible.length ? visible.map(row => `<tr><td>${esc(row.address_street)}<small>${esc(row.listing_id)}</small></td><td>${esc(cityKey(row))}<small>${esc(row.zipcode)}</small></td><td>${esc(row.sale_date || 'Unknown')}</td><td class="numeric">${money(row.sale_price)}</td><td class="numeric">${row.living_area_sqft > 0 ? n(row.living_area_sqft) : '—'}</td><td class="numeric">${row.miles_to_campus.toFixed(1)} mi</td></tr>`).join('') : '<tr><td colspan="6">No matching sales. Try a different search or clear the filters.</td></tr>';
  $('table-status').textContent = visible.length ? `Showing ${n(start+1)}–${n(start+visible.length)} of ${n(tableRows.length)} sales` : '0 matching sales';
  $('page-status').textContent = pages ? `Page ${n(page)} of ${n(pages)}` : 'No pages';
  $('previous').disabled = page <= 1;
  $('next').disabled = page >= pages;
  $('download').disabled = !tableRows.length;
  $('export-status').textContent = 'Search affects the table and download only. Charts use the filters above.';
}
async function init() {
  try {
    const response = await fetch('data/explorer_data.json');
    if (!response.ok) throw new Error(`Data request returned ${response.status}`);
    const payload = await response.json();
    meta = payload.meta;
    allRows = payload.rows.map(values => Object.fromEntries(payload.fields.map((key,i) => [key, values[i]])));
    $('source-count').textContent = n(meta.source_rows);
    $('campus-count').textContent = n(meta.campuses);
    $('city-count').textContent = n(meta.cities);
    [...new Set(allRows.map(row => row.university))].sort((a,b) => (campusNames[a] || a).localeCompare(campusNames[b] || b)).forEach(university => addOption($('university'), university, campusNames[university] || university));
    [...new Set(allRows.map(yearOf))].sort().forEach(year => addOption($('year'), year, year === 'Unknown' ? 'Unknown date' : `${year}${year === '2023' || year === '2026' ? ' (partial)' : ''}`));
    const params = new URLSearchParams(location.search);
    for (const key of ['university','year','distance']) if ([...$(key).options].some(option => option.value === params.get(key))) $(key).value = params.get(key);
    cityOptions();
    if ([...$('city').options].some(option => option.value === params.get('city'))) $('city').value = params.get('city');
    $('cleaning-note').textContent = `All views include prices from $10,000 through $5,000,000. Of ${n(meta.source_rows)} records, ${n(meta.below_minimum)} below the range and ${n(meta.above_maximum)} above it are excluded, leaving ${n(meta.included_rows)} sales. The original dataset is unchanged.`;
    $('coverage-note').textContent = `Recorded sale dates span ${meta.date_min} to ${meta.date_max}; 2023 and 2026 are partial years. ${n(allRows.filter(row => !row.sale_date).length)} included sales have no sale date. This collection is not a complete market census or a current listing feed.`;
    $('filter-form').addEventListener('submit', event => event.preventDefault());
    for (const key of controls) { $(key).disabled = false; $(key).addEventListener('change', () => { if (key === 'university') { $('city').value = ''; cityOptions(); } render(); }); }
    $('illinois-button').disabled = false;
    $('illinois-button').addEventListener('click', () => { reset(); $('university').value = ILLINOIS; cityOptions(); render(); });
    $('reset').disabled = false;
    $('reset').addEventListener('click', reset);
    $('empty-reset').addEventListener('click', reset);
    $('city-chart').addEventListener('click', event => { const button = event.target.closest('[data-city]'); if (button) { $('city').value = button.dataset.city; render(); } });
    $('search').addEventListener('input', () => { page = 1; renderTable(); });
    $('sort').addEventListener('change', () => { page = 1; renderTable(); });
    $('previous').addEventListener('click', () => { page--; renderTable(); });
    $('next').addEventListener('click', () => { page++; renderTable(); });
    $('download').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob(['\uFEFF', csvText(tableRows)], {type:'text/csv;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = 'campus-atlas-selected-sales.csv';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('export-status').textContent = `Prepared ${n(tableRows.length)} sales matching the filters and search. Your browser may ask where to save the CSV.`;
    });
    $('dashboard').hidden = false;
    $('sales').hidden = false;
    render();
  } catch (error) {
    console.error(error);
    $('load-status').className = 'error';
    $('load-status').innerHTML = 'The data could not be loaded. Please reload the page, or <a href="data/college_town_home_sales.csv">download the original CSV</a>.';
  }
}
init();
