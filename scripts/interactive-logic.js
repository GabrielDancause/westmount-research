<script>
document.addEventListener('DOMContentLoaded', () => {
    // Data injected directly here in generate script
    const theData = window.__APP_DATA__ || [];
    const meta = window.__APP_META__ || {};

    // UI Elements
    const statsContainer = document.getElementById('stats-container');
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search');
    const quadrantFilter = document.getElementById('quadrant-filter');
    const ths = document.querySelectorAll('th[data-sort]');

    // State
    let currentSort = { column: 'ticker', asc: true };
    let filteredData = [...theData];

    // Stats
    const sweetCount = theData.filter(d => d.quadrant === 'High Yield / High Growth').length;
    const trapCount = theData.filter(d => d.quadrant === 'High Yield / Low Growth').length;

    const fmtPct = (val) => val === null ? 'N/A' : (val * 100).toFixed(2) + '%';
    const fmtCap = (val) => val === null ? 'N/A' : '$' + val.toFixed(1) + 'B';

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${sweetCount}</div>
            <div class="stat-label">Sweet Spots</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${trapCount}</div>
            <div class="stat-label">Yield Traps</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${fmtPct(meta.medianYield)}</div>
            <div class="stat-label">Median Yield</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${fmtPct(meta.medianGrowth)}</div>
            <div class="stat-label">Median 5Yr Growth</div>
        </div>
    `;

    // Render Table
    const renderTable = () => {
        tableBody.innerHTML = '';

        if (filteredData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #8a9bb0;">No results found.</td></tr>';
            return;
        }

        filteredData.forEach(d => {
            const tr = document.createElement('tr');

            let qBadgeClass = 'badge-low';
            if (d.quadrant === 'High Yield / High Growth') qBadgeClass = 'badge-sweet';
            if (d.quadrant === 'High Yield / Low Growth') qBadgeClass = 'badge-trap';
            if (d.quadrant === 'Low Yield / High Growth') qBadgeClass = 'badge-grower';

            let qLabel = d.quadrant;
            if (d.quadrant === 'High Yield / High Growth') qLabel = 'Sweet Spot';
            if (d.quadrant === 'High Yield / Low Growth') qLabel = 'Yield Trap';
            if (d.quadrant === 'Low Yield / High Growth') qLabel = 'Grower';
            if (d.quadrant === 'Low Yield / Low Growth') qLabel = 'Low / Low';

            tr.innerHTML = `
                <td>
                    <span class="ticker">${d.ticker}</span>
                    <span class="company-name">${d.company}</span>
                    <span class="sector">${d.sector}</span>
                </td>
                <td class="mono" style="color: ${d.dividendYield > meta.medianYield ? '#2ecc71' : '#c8d0de'}">${fmtPct(d.dividendYield)}</td>
                <td class="mono" style="color: ${(d.divGrowth5yr || 0) > meta.medianGrowth ? '#3498db' : '#c8d0de'}">${fmtPct(d.divGrowth5yr)}</td>
                <td><span class="badge ${qBadgeClass}">${qLabel}</span></td>
                <td class="mono">${fmtPct(d.payoutRatio)}</td>
                <td class="mono">${fmtCap(d.marketCapB)}</td>
            `;
            tableBody.appendChild(tr);
        });
    };

    // Sorting
    const sortData = () => {
        const { column, asc } = currentSort;
        filteredData.sort((a, b) => {
            let valA, valB;
            switch(column) {
                case 'ticker': valA = a.ticker; valB = b.ticker; break;
                case 'yield': valA = a.dividendYield || 0; valB = b.dividendYield || 0; break;
                case 'growth': valA = a.divGrowth5yr || -999; valB = b.divGrowth5yr || -999; break;
                case 'quadrant': valA = a.quadrant || ''; valB = b.quadrant || ''; break;
                case 'payout': valA = a.payoutRatio || 0; valB = b.payoutRatio || 0; break;
                case 'marketcap': valA = a.marketCapB || 0; valB = b.marketCapB || 0; break;
            }
            if (valA < valB) return asc ? -1 : 1;
            if (valA > valB) return asc ? 1 : -1;
            return 0;
        });
    };

    ths.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.column === col) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.column = col;
                currentSort.asc = true;
            }

            ths.forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
            th.classList.add(currentSort.asc ? 'sort-asc' : 'sort-desc');

            sortData();
            renderTable();
        });
    });

    // Filtering & Searching
    const applyFilters = () => {
        const term = searchInput.value.toLowerCase();
        const qFilter = quadrantFilter.value;

        filteredData = theData.filter(d => {
            const matchesSearch = d.ticker.toLowerCase().includes(term) || d.company.toLowerCase().includes(term);

            let matchesQuadrant = true;
            if (qFilter === 'sweet') matchesQuadrant = d.quadrant === 'High Yield / High Growth';
            if (qFilter === 'trap') matchesQuadrant = d.quadrant === 'High Yield / Low Growth';
            if (qFilter === 'grower') matchesQuadrant = d.quadrant === 'Low Yield / High Growth';
            if (qFilter === 'low') matchesQuadrant = d.quadrant === 'Low Yield / Low Growth';

            return matchesSearch && matchesQuadrant;
        });

        sortData();
        renderTable();
    };

    searchInput.addEventListener('input', applyFilters);
    quadrantFilter.addEventListener('change', applyFilters);

    // Initial render
    sortData();
    renderTable();
});
</script>
