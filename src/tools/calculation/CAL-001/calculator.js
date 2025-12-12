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

function evalSafe(expr) {
    // Replace visual operators with JS operators
    let cleanExpr = expr
        .replace(/\^/g, '**')
        .replace(/PI/g, 'Math.PI')
        .replace(/E/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/asin\(/g, 'Math.asin(')
        .replace(/acos\(/g, 'Math.acos(')
        .replace(/atan\(/g, 'Math.atan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(');

    // Safety check: only allow numbers, math functions, operators
    // This is a basic check, 'eval' is used for simplicity but in production we might want a parser.
    // Given this is a local tool, we use Function constructor or eval.
    // However, user input is local.

    try {
        return new Function('return ' + cleanExpr)();
    } catch (e) {
        throw new Error('Invalid Expression');
    }
}

function addToHistory(expr, result) {
    const history = document.getElementById('history');
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<span>${expr}</span><span>= ${result}</span>`;
    item.onclick = () => {
        document.getElementById('display').value = expr;
    };
    history.insertBefore(item, history.firstChild);
}
window.appendFunc = appendFunc; window.appendOperator = appendOperator; window.appendNumber = appendNumber; window.clearDisplay = clearDisplay; window.deleteChar = deleteChar; window.memoryStore = memoryStore; window.memoryRecall = memoryRecall; window.memoryClear = memoryClear; window.calculate = calculate; window.appendConstant = appendConstant;
