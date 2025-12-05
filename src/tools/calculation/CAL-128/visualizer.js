
const samples = {
    treemap: {
        name: "Portfolio",
        children: [
            {
                name: "Tech",
                children: [
                    { name: "Apple", value: 40 },
                    { name: "Google", value: 30 },
                    { name: "Microsoft", value: 25 }
                ]
            },
            {
                name: "Finance",
                children: [
                    { name: "Visa", value: 20 },
                    { name: "JPM", value: 15 }
                ]
            },
            {
                name: "Energy",
                children: [
                    { name: "Exxon", value: 10 },
                    { name: "Chevron", value: 8 }
                ]
            }
        ]
    },
    heatmap: [
        { x: "A", y: "Mon", value: 30 }, { x: "A", y: "Tue", value: 50 }, { x: "A", y: "Wed", value: 10 },
        { x: "B", y: "Mon", value: 10 }, { x: "B", y: "Tue", value: 20 }, { x: "B", y: "Wed", value: 80 },
        { x: "C", y: "Mon", value: 60 }, { x: "C", y: "Tue", value: 30 }, { x: "C", y: "Wed", value: 40 }
    ]
};

function init() {
    document.getElementById('render-btn').addEventListener('click', renderChart);
    loadSample('treemap'); // Default
}

function loadSample(type) {
    document.getElementById('data-input').value = JSON.stringify(samples[type], null, 2);
    document.getElementById('chart-type').value = type;
}

function renderChart() {
    const type = document.getElementById('chart-type').value;
    const input = document.getElementById('data-input').value;
    const container = document.getElementById('chart-area');
    
    container.innerHTML = ''; // Clear previous

    let data;
    try {
        data = JSON.parse(input);
    } catch (e) {
        container.innerHTML = `<p style="color: red;">Error parsing JSON: ${e.message}</p>`;
        return;
    }

    // Setup SVG
    const width = container.clientWidth || 800;
    const height = 500;
    
    const svg = d3.select("#chart-area")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("font", "12px sans-serif");

    if (type === 'treemap') {
        renderTreemap(svg, data, width, height);
    } else if (type === 'heatmap') {
        renderHeatmap(svg, data, width, height);
    }
}

function renderTreemap(svg, data, width, height) {
    const root = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .padding(1)
        (root);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const leaf = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    leaf.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("fill-opacity", 0.6)
        .on("mouseover", function(event, d) {
            showTooltip(event, `${d.data.name}: ${d.data.value}`);
            d3.select(this).attr("fill-opacity", 1);
        })
        .on("mouseout", function() {
            hideTooltip();
            d3.select(this).attr("fill-opacity", 0.6);
        });

    leaf.append("text")
        .attr("x", 3)
        .attr("y", 13)
        .text(d => d.data.name)
        .attr("fill", "black");
}

function renderHeatmap(svg, data, width, height) {
    const margin = { top: 30, right: 30, bottom: 30, left: 30 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xVars = Array.from(new Set(data.map(d => d.x)));
    const yVars = Array.from(new Set(data.map(d => d.y)));

    const x = d3.scaleBand()
        .range([0, chartWidth])
        .domain(xVars)
        .padding(0.01);

    const y = d3.scaleBand()
        .range([chartHeight, 0])
        .domain(yVars)
        .padding(0.01);

    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    const color = d3.scaleSequential()
        .interpolator(d3.interpolateInferno)
        .domain([0, d3.max(data, d => d.value)]);

    g.selectAll()
        .data(data, d => d.x + ':' + d.y)
        .join("rect")
        .attr("x", d => x(d.x))
        .attr("y", d => y(d.y))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.value))
        .on("mouseover", (event, d) => showTooltip(event, `Value: ${d.value}`))
        .on("mouseout", hideTooltip);
}

function showTooltip(event, text) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = text;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
}

// Expose global for HTML
window.loadSample = loadSample;
window.addEventListener('DOMContentLoaded', init);
