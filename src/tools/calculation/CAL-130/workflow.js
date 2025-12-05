
const operations = [
    { id: 'add', name: 'Add (+)', paramName: 'Value', defaultParam: '5', func: (a, p) => a + parseFloat(p) },
    { id: 'sub', name: 'Subtract (-)', paramName: 'Value', defaultParam: '3', func: (a, p) => a - parseFloat(p) },
    { id: 'mul', name: 'Multiply (*)', paramName: 'Factor', defaultParam: '2', func: (a, p) => a * parseFloat(p) },
    { id: 'div', name: 'Divide (/)', paramName: 'Divisor', defaultParam: '2', func: (a, p) => a / parseFloat(p) },
    { id: 'pow', name: 'Power (^)', paramName: 'Exponent', defaultParam: '2', func: (a, p) => Math.pow(a, parseFloat(p)) },
    { id: 'round', name: 'Round', paramName: 'Decimals', defaultParam: '2', func: (a, p) => Number(a.toFixed(parseInt(p))) },
    { id: 'log', name: 'Logarithm (ln)', paramName: 'None', defaultParam: '0', func: (a) => Math.log(a) }
];

let workflow = [];

function init() {
    renderToolbox();
    document.getElementById('run-btn').addEventListener('click', runWorkflow);
}

function renderToolbox() {
    const container = document.getElementById('tool-list');
    container.innerHTML = '';
    operations.forEach(op => {
        const div = document.createElement('div');
        div.className = 'toolbox-item';
        div.textContent = op.name;
        div.onclick = () => addStep(op);
        container.appendChild(div);
    });
}

function addStep(op) {
    workflow.push({ ...op, param: op.defaultParam, instanceId: Date.now() + Math.random() });
    renderWorkflow();
}

function removeStep(index) {
    workflow.splice(index, 1);
    renderWorkflow();
}

function updateStepParam(index, value) {
    workflow[index].param = value;
}

function renderWorkflow() {
    const container = document.getElementById('workflow-steps');
    container.innerHTML = '';

    if (workflow.length === 0) {
        container.innerHTML = '<p class="placeholder">Click operations on the left to add them here.</p>';
        return;
    }

    workflow.forEach((step, index) => {
        const div = document.createElement('div');
        div.className = 'step';
        
        let inputHtml = '';
        if (step.paramName !== 'None') {
            inputHtml = "`
                <label>${step.paramName}: </label>
                <input type=\"number\" value=\"${step.param}\" onchange=\"updateStepParam(${index}, this.value)\" style=\"width: 60px;">
            `";
        }

        div.innerHTML = "`
            <div class=\"step-content\">
                <strong>${index + 1}. ${step.name}</strong>
                ${inputHtml}
            </div>
            <span class=\"remove-step\" onclick=\"removeStep(${index})">❌</span>
        `";
        container.appendChild(div);
    });
}

async function runWorkflow() {
    const inputVal = parseFloat(document.getElementById('initial-input').value);
    const resultArea = document.getElementById('result-area');
    
    if (isNaN(inputVal)) {
        resultArea.textContent = 'Error: Invalid initial input. Please enter a number.';
        return;
    }

    let currentVal = inputVal;
    let log = `Start: ${currentVal}\n`;

    try {
        for (let i = 0; i < workflow.length; i++) {
            const step = workflow[i];
            const oldVal = currentVal;
            currentVal = step.func(currentVal, step.param);
            log += `Step ${i + 1} (${step.name} ${step.paramName !== 'None' ? step.param : ''}): ${oldVal} -> ${currentVal}\n`;
        }
        log += `\nFinal Result: ${currentVal}`;
        resultArea.textContent = log;
    } catch (e) {
        resultArea.textContent = `Error during execution: ${e.message}`;
    }
}

// Expose functions to global scope for HTML event handlers
window.removeStep = removeStep;
window.updateStepParam = updateStepParam;

window.addEventListener('DOMContentLoaded', init);
