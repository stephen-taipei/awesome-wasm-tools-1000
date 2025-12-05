
let chartInstance = null;

const sampleData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [{
        label: 'Sales 2025',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
        ],
        borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
    }]
};

function init() {
    document.getElementById('load-sample').addEventListener('click', loadSample);
    document.getElementById('render-btn').addEventListener('click', renderChart);
    document.getElementById('download-btn').addEventListener('click', downloadChart);
    
    // Load initial sample
    loadSample();
    renderChart();
}

function loadSample() {
    document.getElementById('data-input').value = JSON.stringify(sampleData, null, 2);
}

function renderChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    const type = document.getElementById('chart-type').value;
    const inputStr = document.getElementById('data-input').value;

    let data;
    try {
        data = JSON.parse(inputStr);
    } catch (e) {
        alert('Invalid JSON Data: ' + e.message);
        return;
    }

    // Destroy previous chart if exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function downloadChart() {
    const canvas = document.getElementById('myChart');
    const link = document.createElement('a');
    link.download = 'chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

window.addEventListener('DOMContentLoaded', init);
