
const ROWS = 20;
const COLS = 10; // A-J
const sheetData = {}; // Stores raw values/formulas
let activeCellId = null;

function init() {
    renderSheet();
    document.getElementById('formula-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && activeCellId) {
            updateCell(activeCellId, e.target.value);
            evaluateSheet();
            e.target.blur();
        }
    });
}

function renderSheet() {
    const table = document.getElementById('sheet');
    table.innerHTML = '';

    // Header Row (A, B, C...)
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Corner
    for (let c = 0; c < COLS; c++) {
        const th = document.createElement('th');
        th.textContent = String.fromCharCode(65 + c);
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    // Rows
    for (let r = 1; r <= ROWS; r++) {
        const tr = document.createElement('tr');
        
        // Row Number
        const th = document.createElement('th');
        th.textContent = r;
        tr.appendChild(th);

        // Cells
        for (let c = 0; c < COLS; c++) {
            const colChar = String.fromCharCode(65 + c);
            const cellId = `${colChar}${r}`;
            const td = document.createElement('td');
            const input = document.createElement('input');
            
            input.id = cellId;
            input.addEventListener('focus', () => setActiveCell(cellId));
            input.addEventListener('blur', () => {
                // Optional: auto-save on blur if needed, but we rely on Enter or formula bar for now to be explicit
            });
            input.addEventListener('keydown', (e) => {
                if(e.key === 'Enter') {
                    updateCell(cellId, input.value);
                    evaluateSheet();
                    moveSelection(r, c, e.shiftKey);
                }
            });

            td.appendChild(input);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}

function setActiveCell(id) {
    activeCellId = id;
    document.getElementById('active-cell-label').textContent = id;
    const rawValue = sheetData[id] || '';
    document.getElementById('formula-input').value = rawValue;
}

function updateCell(id, value) {
    sheetData[id] = value;
    // Visual update happens in evaluateSheet
}

function moveSelection(row, col, isUp) {
    // Simple logic to move focus down on enter
    const nextRow = isUp ? row - 1 : row + 1;
    if (nextRow > 0 && nextRow <= ROWS) {
        const colChar = String.fromCharCode(65 + col);
        const nextId = `${colChar}${nextRow}`;
        document.getElementById(nextId).focus();
    }
}

function evaluateSheet() {
    // Naive re-evaluation of all cells
    // In a real app, use a dependency graph.
    
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const colChar = String.fromCharCode(65 + c);
            const id = `${colChar}${r}`;
            const raw = sheetData[id];
            const input = document.getElementById(id);

            if (raw && raw.startsWith('=')) {
                try {
                    const res = evaluateFormula(raw.substring(1));
                    input.value = res;
                } catch (e) {
                    input.value = '#ERROR';
                }
            } else {
                input.value = raw || '';
            }
        }
    }
}

function evaluateFormula(formula) {
    // Supports basic math and cell refs (e.g. A1 + B2)
    // And SUM(A1:A3), AVG(A1:A3)
    
    let parsed = formula.toUpperCase();

    // Handle Ranges like SUM(A1:A3)
    parsed = parsed.replace(/(SUM|AVG|MAX|MIN)\((\[A-Z\][0-9]+):(\[A-Z\][0-9]+)\)/g, (match, func, start, end) => {
        const values = getRangeValues(start, end);
        if (func === 'SUM') return values.reduce((a, b) => a + b, 0);
        if (func === 'AVG') return values.reduce((a, b) => a + b, 0) / values.length;
        if (func === 'MAX') return Math.max(...values);
        if (func === 'MIN') return Math.min(...values);
        return 0;
    });

    // Handle individual cell refs (A1, B2...)
    // Replace cell IDs with their evaluated numeric values
    parsed = parsed.replace(/[A-Z][0-9]+/g, (match) => {
        const val = getCellValue(match);
        return val;
    });

    // Safe eval
    // Only allow digits, operators, parens, and decimal points
    if (/[^0-9+\-*/().\s]/.test(parsed)) {
         return '#ERR';
    }

    return new Function('return ' + parsed)();
}

function getCellValue(id) {
    let val = sheetData[id];
    if (!val) return 0;
    if (val.startsWith('=')) {
        // prevent infinite recursion in a real app, but here we just return 0 or simple recursion
        // For simplicity, we won't support recursive formulas in this basic version
        return 0; 
    }
    return parseFloat(val) || 0;
}

function getRangeValues(start, end) {
    const startCol = start.charCodeAt(0);
    const startRow = parseInt(start.substring(1));
    const endCol = end.charCodeAt(0);
    const endRow = parseInt(end.substring(1));

    const values = [];
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            const id = String.fromCharCode(c) + r;
            values.push(getCellValue(id));
        }
    }
    return values;
}

function exportCSV() {
    let csv = '';
    for (let r = 1; r <= ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const id = String.fromCharCode(65 + c) + r;
            const val = document.getElementById(id).value;
            row.push(val);
        }
        csv += row.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheet.csv';
    a.click();
}

function resetSheet() {
    for (const key in sheetData) delete sheetData[key];
    evaluateSheet();
}

window.addEventListener('DOMContentLoaded', init);
