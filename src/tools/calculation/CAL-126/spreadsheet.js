import { createSheetEvaluator, csvCell } from '../../../utils/spreadsheet.js';

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
    const evaluator = createSheetEvaluator(sheetData);
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
                    const res = evaluator.cell(id);
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

function exportCSV() {
    let csv = '';
    for (let r = 1; r <= ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const id = String.fromCharCode(65 + c) + r;
            const val = document.getElementById(id).value;
            row.push(csvCell(val));
        }
        csv += row.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheet.csv';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resetSheet() {
    for (const key in sheetData) delete sheetData[key];
    evaluateSheet();
}

window.addEventListener('DOMContentLoaded', init);

Object.assign(window, { exportCSV, resetSheet });
