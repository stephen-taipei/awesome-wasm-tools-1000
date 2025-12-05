
const defaultKeyMap = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'decimal': '.',
    'add': '+',
    'subtract': '-',
    'multiply': '*',
    'divide': '/',
    'equals': 'Enter',
    'clear': 'Escape',
    'backspace': 'Backspace'
};

let keyMap = loadKeyMap();
let currentExpression = '';

function loadKeyMap() {
    const stored = localStorage.getItem('cal-129-keymap');
    return stored ? JSON.parse(stored) : { ...defaultKeyMap };
}

function saveKeyMap() {
    localStorage.setItem('cal-129-keymap', JSON.stringify(keyMap));
}

function init() {
    renderKeyMap();
    document.addEventListener('keydown', handleGlobalKey);
    document.getElementById('reset-defaults').addEventListener('click', () => {
        keyMap = { ...defaultKeyMap };
        saveKeyMap();
        renderKeyMap();
    });

    // Bind click events for buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            executeAction(action);
            flashButton(btn);
        });
    });
}

function renderKeyMap() {
    const tbody = document.getElementById('key-map-body');
    tbody.innerHTML = '';

    const orderedActions = [
        'clear', 'backspace', 'divide', 'multiply', 'subtract', 'add', 'equals', 'decimal',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];

    orderedActions.forEach(action => {
        const tr = document.createElement('tr');
        const tdAction = document.createElement('td');
        tdAction.textContent = action.charAt(0).toUpperCase() + action.slice(1);
        
        const tdKey = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'key-input';
        input.value = keyMap[action];
        input.readOnly = true;
        input.title = "Click to record new key";
        
        input.addEventListener('focus', () => {
            input.value = 'Press key...';
            input.classList.add('recording');
        });

        input.addEventListener('blur', () => {
            input.classList.remove('recording');
            input.value = keyMap[action]; // Revert if no key pressed
        });

        input.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent triggering calculator logic while binding
            
            let newKey = e.key;
            if (newKey === ' ') newKey = 'Space';
            
            keyMap[action] = newKey;
            saveKeyMap();
            input.value = newKey;
            input.blur();
        });

        tdKey.appendChild(input);
        tr.appendChild(tdAction);
        tr.appendChild(tdKey);
        tbody.appendChild(tr);
    });
}

function handleGlobalKey(e) {
    if (e.target.tagName === 'INPUT') return; // Don't trigger if typing in input

    // Find action matching the key
    const action = Object.keys(keyMap).find(key => keyMap[key].toLowerCase() === e.key.toLowerCase());
    
    if (action) {
        e.preventDefault();
        executeAction(action);
        
        // Visual feedback
        const btn = document.querySelector(`.btn[data-action="${action}"]`);
        if (btn) flashButton(btn);
    }
}

function flashButton(btn) {
    btn.classList.add('active-key');
    setTimeout(() => btn.classList.remove('active-key'), 100);
}

function executeAction(action) {
    const display = document.getElementById('display');

    if (action === 'clear') {
        currentExpression = '';
    } else if (action === 'backspace') {
        currentExpression = currentExpression.slice(0, -1);
    } else if (action === 'equals') {
        try {
            // Safe-ish evaluation for basic math
            // Replace symbols for JS eval
            let evalString = currentExpression
                .replace(/x/g, '*') // Just in case
                .replace(/[^-()\d/*+.]/g, ''); // Sanitize

            if (evalString) {
                const result = new Function('return ' + evalString)();
                currentExpression = String(result);
            }
        } catch (err) {
            currentExpression = 'Error';
        }
    } else {
        // Append number or operator
        const val = (action.length === 1 || action === 'decimal') ? 
            (action === 'decimal' ? '.' : action) : 
            getOperatorSymbol(action);
        
        currentExpression += val;
    }

    display.textContent = currentExpression || '0';
}

function getOperatorSymbol(action) {
    switch(action) {
        case 'add': return '+';
        case 'subtract': return '-';
        case 'multiply': return '*';
        case 'divide': return '/';
        default: return '';
    }
}

window.addEventListener('DOMContentLoaded', init);
