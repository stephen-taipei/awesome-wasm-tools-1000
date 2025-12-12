let currentMode = 'DEC';
let operand1 = null;
let operator = null;
let currentInput = '0';
let isNewInput = true;

const modes = ['HEX', 'DEC', 'OCT', 'BIN'];
const baseMap = { 'HEX': 16, 'DEC': 10, 'OCT': 8, 'BIN': 2 };

// Expose functions to window
window.setMode = setMode;
window.inputDigit = inputDigit;
window.op = op;
window.clearAll = clearAll;
window.backspace = backspace;
window.calc = calc;

function setMode(mode) {
    // Convert current input to new base visual
    // But conceptually, the value is invariant.
    // The calculator displays the value in all bases, but the "input mode" determines which keys are active.
    currentMode = mode;
    modes.forEach(m => {
        const el = document.getElementById('line-' + m.toLowerCase());
        if (m === mode) el.classList.add('active');
        else el.classList.remove('active');
    });
    updateButtons();
}

function updateButtons() {
    const hexBtns = document.querySelectorAll('.hex-btn');

    // Enable all first
    document.querySelectorAll('button').forEach(b => b.disabled = false);

    if (currentMode === 'DEC') {
        hexBtns.forEach(b => b.disabled = true);
    } else if (currentMode === 'OCT') {
        hexBtns.forEach(b => b.disabled = true);
        [8, 9].forEach(n => disableNumBtn(n));
    } else if (currentMode === 'BIN') {
        hexBtns.forEach(b => b.disabled = true);
        [2, 3, 4, 5, 6, 7, 8, 9].forEach(n => disableNumBtn(n));
    }
}

function disableNumBtn(n) {
    const btns = document.querySelectorAll('button');
    btns.forEach(b => {
        if (b.textContent === String(n)) b.disabled = true;
    });
}

function getCurrentVal() {
    try {
        if (currentInput === '') return 0n;
        return BigInt(parseInt(currentInput, baseMap[currentMode]));
    } catch (e) {
        return 0n;
    }
}

function updateDisplays(val) {
    // val is BigInt
    let hex = val.toString(16).toUpperCase();
    let dec = val.toString(10);
    let oct = val.toString(8);
    let bin = val.toString(2);

    // Handle negative display roughly
    if (val < 0n) {
        // Simple display
    }

    document.getElementById('disp-hex').textContent = hex;
    document.getElementById('disp-dec').textContent = dec;
    document.getElementById('disp-oct').textContent = oct;
    document.getElementById('disp-bin').textContent = bin;
}

function inputDigit(digit) {
    if (isNewInput) {
        currentInput = digit;
        isNewInput = false;
    } else {
        if (currentInput === '0') currentInput = digit;
        else currentInput += digit;
    }

    // Update display immediately
    // We assume the user is typing in the current base
    try {
        const val = BigInt(parseInt(currentInput, baseMap[currentMode]));
        updateDisplays(val);
    } catch (e) {
        // ignore incomplete
    }
}

function op(opKey) {
    const val = getCurrentVal();

    if (operand1 === null) {
        operand1 = val;
    } else if (operator) {
        // Chain calculation
        operand1 = calculate(operand1, operator, val);
        updateDisplays(operand1);
    }

    operator = opKey;
    isNewInput = true;
}

function calculate(a, op, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0n ? 0n : a / b;
        case '%': return b === 0n ? 0n : a % b;
        case '&': return a & b;
        case '|': return a | b;
        case '^': return a ^ b;
        case '<<': return a << b;
        case '>>': return a >> b;
        // Logic NOT/NEG is unary, handled differently usually.
        // But here we might treat '~' as a unary op on current input?
        // The UI has '~' as a button.
        default: return b;
    }
}

function calc() {
    if (operand1 !== null && operator) {
        const val = getCurrentVal();
        const res = calculate(operand1, operator, val);
        updateDisplays(res);
        operand1 = null;
        operator = null;
        currentInput = res.toString(baseMap[currentMode]); // Reset input to result in current base
        isNewInput = true;
    }
}

function clearAll() {
    operand1 = null;
    operator = null;
    currentInput = '0';
    isNewInput = true;
    updateDisplays(0n);
}

function backspace() {
    if (isNewInput) return;
    if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '') currentInput = '0';

        try {
            const val = BigInt(parseInt(currentInput, baseMap[currentMode]));
            updateDisplays(val);
        } catch (e) {}
    }
}

// Special handling for unary NOT if needed, but current 'op' function expects binary.
// Let's patch op logic for unary ~
const originalOp = op;
window.op = function(opKey) {
    if (opKey === '~') {
        const val = getCurrentVal();
        const res = ~val;
        updateDisplays(res);
        currentInput = res.toString(baseMap[currentMode]);
        isNewInput = true; // result is new start
        return;
    }
    originalOp(opKey);
};

// Initial update
updateButtons();
