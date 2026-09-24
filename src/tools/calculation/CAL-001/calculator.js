import { evaluateExpression } from '../../../utils/expression.js';
let memory = 0;

function appendNumber(num) {
    const display = document.getElementById('display');
    if (display.value === '0' && num !== '.') {
        display.value = num;
    } else {
        display.value += num;
    }
}

function appendOperator(op) {
    const display = document.getElementById('display');
    display.value += op;
}

function appendFunc(func) {
    const display = document.getElementById('display');
    if (display.value === '0') {
        display.value = func;
    } else {
        display.value += func;
    }
}

function appendConstant(constName) {
    const display = document.getElementById('display');
    let val = '';
    if (constName === 'PI') val = 'PI'; // Will replace with Math.PI in calc
    else if (constName === 'E') val = 'E';

    if (display.value === '0') {
        display.value = val;
    } else {
        display.value += val;
    }
}

function clearDisplay() {
    document.getElementById('display').value = '0';
}

function deleteChar() {
    const display = document.getElementById('display');
    display.value = display.value.slice(0, -1);
    if (display.value === '') display.value = '0';
}

function memoryStore() {
    try {
        memory = evalSafe(document.getElementById('display').value);
    } catch (e) {
        // ignore
    }
}

function memoryRecall() {
    const display = document.getElementById('display');
    if (display.value === '0') display.value = memory;
    else display.value += memory;
}

function memoryClear() {
    memory = 0;
}

function calculate() {
    const display = document.getElementById('display');
    const expression = display.value;
    try {
        const result = evalSafe(expression);
        addToHistory(expression, result);
        display.value = result;
    } catch (e) {
        display.value = 'Error';
    }
}

function evalSafe(expr) { return evaluateExpression(String(expr)); }

function addToHistory(expr, result) {
    const history = document.getElementById('history');
    const item = document.createElement('div');
    item.className = 'history-item';
    const label = document.createElement('span'); label.textContent = expr;
    const value = document.createElement('span'); value.textContent = `= ${result}`;
    item.append(label, value);
    item.onclick = () => {
        document.getElementById('display').value = expr;
    };
    history.insertBefore(item, history.firstChild);
    while (history.children.length > 50) history.lastElementChild.remove();
}
window.appendFunc = appendFunc; window.appendOperator = appendOperator; window.appendNumber = appendNumber; window.clearDisplay = clearDisplay; window.deleteChar = deleteChar; window.memoryStore = memoryStore; window.memoryRecall = memoryRecall; window.memoryClear = memoryClear; window.calculate = calculate; window.appendConstant = appendConstant;
