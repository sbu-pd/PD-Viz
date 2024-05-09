function boxplotStats(values) {
    for (var i = 0; i < values.length; i++) {
        console.log(values[i]);
      }
    const sorted = values.sort();
    console.log(sorted);
    const q1 = d3.quantile(sorted, 0.25);
    const median = d3.quantile(sorted, 0.5);
    const q3 = d3.quantile(sorted, 0.75);
    const iqr = q3 - q1; // Interquartile range
    const min = d3.min(sorted);
    const max = d3.max(sorted);

    // Calculate the whiskers
    const lowerWhisker = q1 - 1.5 * iqr;
    const upperWhisker = q3 + 1.5 * iqr;

    // Identify outliers
    const outliers = sorted.filter(x => x < lowerWhisker || x > upperWhisker);

    // Adjust the min and max to exclude outliers
    const adjustedMin = sorted.find(x => x >= lowerWhisker);
    const adjustedMax = sorted.reverse().find(x => x <= upperWhisker);

    return {
        q1: q1, median: median, q3: q3, min: min, max: max, whiskers: [adjustedMin, adjustedMax], outliers: outliers
    };
}

function updateLegend(svg, options) {
    const { color, category, width } = options;
    
    // Calculate right alignment based on SVG width
    const svgWidth = svg.node().getBoundingClientRect().width;
    const legendPositionX = svgWidth - 160; // Adjust this value to fit your layout

    let legends = svg.node().dataset.legends ? new Set(svg.node().dataset.legends.split(',')) : new Set();

    if (!legends.has(category)) {
        const legendYOffset = legends.size * 25; // Spacing between legends

        const legend = svg.append('g')
            .attr('class', `legend ${category}`)
            .attr('transform', `translate(${legendPositionX}, ${20 + legendYOffset})`);

        legend.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .style('fill', color);

        legend.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .style('text-anchor', 'start')
            .style('fill', 'white')
            .text(category);

        legends.add(category);
        svg.node().dataset.legends = Array.from(legends).join(',');
    }
}

function drawBoxPlot(svg, data, options) {
    const { xScale, yScale, color, medianColor, category } = options;
    const { label, stats } = data;
    const xPos = xScale(category);

    // Box for the interquartile range (IQR)
    svg.append("rect")
        .attr("x", xPos)    
        .attr("y", yScale(stats.q3))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale(stats.q1) - yScale(stats.q3))
        .attr("fill", color)
        .attr("stroke", "white");

    // Median line
    svg.append("line")
        .attr("x1", xPos)
        .attr("x2", xPos + xScale.bandwidth())
        .attr("y1", yScale(stats.median))
        .attr("y2", yScale(stats.median))
        .attr("stroke", medianColor || "white")
        .attr("stroke-width", 2);

    // Whiskers from min to max
    svg.append("line")
        .attr("x1", xPos + xScale.bandwidth() / 2)
        .attr("x2", xPos + xScale.bandwidth() / 2)
        .attr("y1", yScale(stats.max))
        .attr("y2", yScale(stats.min))
        .attr("stroke", "white");

    // Horizontal lines at the min and max ends
    svg.append("line")
        .attr("x1", xPos)
        .attr("x2", xPos + xScale.bandwidth())
        .attr("y1", yScale(stats.max))
        .attr("y2", yScale(stats.max))
        .attr("stroke", "white");

    svg.append("line")
        .attr("x1", xPos)
        .attr("x2", xPos + xScale.bandwidth())
        .attr("y1", yScale(stats.min))
        .attr("y2", yScale(stats.min))
        .attr("stroke", "white");

    // Outliers
    if (stats.outliers.length > 0) {
        svg.selectAll(`.outlier-${category}`)
            .data(stats.outliers)
            .enter()
            .append("circle")
            .attr("cx", xPos + xScale.bandwidth() / 2)
            .attr("cy", d => yScale(d))
            .attr("r", 3)
            .attr("fill", "red")
            .attr("clip-path", `url(#clip-${category})`);

        // Add clipping path
        svg.append("clipPath")
            .attr("id", `clip-${category}`)
            .append("rect")
            .attr("x", xPos)
            .attr("y", yScale(stats.max))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale(stats.min) - yScale(stats.max) + 20); // Extend space for outliers
    }
}

function plotAntiTapping(data, userFilterValue) {
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth; // Full width of the graph-area
    const graphHeight = graphArea.clientHeight; // Full height of the graph-area
    
    const margin = { top: 50, right: 100, bottom: 100, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Clear previous plots
    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
    .attr('width', '100%') // Use 100% to make it responsive
    .attr('height', '100%') // Use 100% to make it responsive
    .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`) // Ensure this matches the intended dimensions
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

    if (!userFilterValue) {
        let allDistances = [];
        Object.values(data).forEach(user => {
            Object.values(user).forEach(session => {
                allDistances = allDistances.concat(session.distances_released);
            });
        });

        const stats = boxplotStats(allDistances);
        const allStats = [{ label: "All Users", stats: stats }];

        console.log(stats);

        const yScale = d3.scaleLinear()
            .domain([0, stats.max])
            .nice()
            .range([height, 0]);

        const xScale = d3.scaleBand()
            .domain(allStats.map(d => d.label))
            .range([0, width])
            .padding(0.1);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("fill", "white");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .style("fill", "white");

        allStats.forEach((d, i) => {
            drawBoxPlot(svg, d, {
                xScale: xScale,
                yScale: yScale,
                color: "#69b3a2",
                category: d.label
            });
        });
    } else {
        // let sessionData = data[userFilterValue].AntiTapping;
        // let sessionDistances = Object.entries(sessionData).map(([session, values]) => {
        //     return { session: session, stats: boxplotStats(values.distances_released) };
        // });

        // const yScale = d3.scaleLinear()
        //     .domain([0, d3.max(sessionDistances.map(d => d.stats.max))])
        //     .nice()
        //     .range([height, 0]);

        // const xScale = d3.scaleBand()
        //     .domain(sessionDistances.map(d => d.session))
        //     .range([0, width])
        //     .padding(0.1);

        // svg.append("g")
        //     .attr("transform", `translate(0,${height})`)
        //     .call(d3.axisBottom(xScale))
        //     .selectAll("text")
        //     .style("fill", "white");

        // svg.append("g")
        //     .call(d3.axisLeft(yScale))
        //     .selectAll("text")
        //     .style("fill", "white");

        // sessionDistances.forEach((d, i) => {
        //     drawBoxPlot(svg, d, {
        //         xScale: xScale,
        //         yScale: yScale,
        //         color: "#404080", // Custom color for sessions
        //         category: d.session
        //     });
        // });
    }
}


function plotBalanceTest(data) {
    console.log("Plotting BalanceTest", data);
    // Placeholder for plotting logic
}

function plotDotCounting(data) {
    console.log("Plotting DotCounting", data);
    // Placeholder for plotting logic
}

function plotFaceNameRecognition(data) {
    console.log("Plotting FaceNameRecognition", data);
    // Placeholder for plotting logic
}

function parseCustomDate(dateString) {
    // Split the string by spaces to isolate parts
    const parts = dateString.split(' ');
    let i = 0;
    if(parts.length == 7){
        i = 1;
    }
    const dayOfWeek = parts[0];
    const month = parts[1];
    const day = parseInt(parts[2+i], 10);
    const time = parts[3+i];
    const year = parseInt(parts[5+i], 10);

    // Reconstruct the date string in a standard format
    const date = new Date(`${month} ${day}, ${year} ${time}`);
    return date;
}

function plotFingerTapping(data, userFilterValue) {
    console.log("Plotting FingerTapping");
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth; // Full width of the graph-area
    const graphHeight = graphArea.clientHeight; // Full height of the graph-area
    
    const margin = { top: 50, right: 100, bottom: 100, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
    .attr('width', '100%') 
    .attr('height', '100%') 
    .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`) 
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

    if (!userFilterValue){
        let leftHandData = [];
        let rightHandData = [];
        let LeftTapCountData = [];
        let RightTapCountData = [];
        
        Object.values(data).forEach(user => {
            Object.values(user).forEach(session => {
              if (session.LeftHand && session.LeftHand.LeftButton) {
                leftHandData = leftHandData.concat(session.LeftHand.LeftButton);
                if (session.LeftHand && session.LeftHand.TapCount !== undefined) {
                    LeftTapCountData = LeftTapCountData.concat(session.LeftHand.TapCount);
                }
              }
              if (session.RightHand && session.RightHand.RightButton) {
                rightHandData = rightHandData.concat(session.RightHand.RightButton);
                if (session.RightHand && session.RightHand.TapCount !== undefined) {
                    RightTapCountData = RightTapCountData.concat(session.RightHand.TapCount);
                }
              }
            });
          });
        const leftHandStats = boxplotStats(leftHandData);
        const rightHandStats = boxplotStats(rightHandData);
        const leftTapCountStats = boxplotStats(LeftTapCountData);
        const rightTapCountStats = boxplotStats(RightTapCountData);

        const allStats = [
            { label: "Left Tap Count", stats: leftTapCountStats, color: "#404080" },
            { label: "Right Tap Count", stats: rightTapCountStats, color: "#FFA07A" }
        ];


        const yScale = d3.scaleLinear()
        .domain([
          0,
          d3.max([
            leftTapCountStats.max, rightTapCountStats.max
          ])
        ])
        .range([height, 0])
        .nice();
      
      const xScale = d3.scaleBand()
        .domain(allStats.map(d => d.label))
        .range([0, width])
        .padding(0.1);
      
      // Add the X and Y axis to the svg
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", "rotate(-65)")
          .attr("stroke", "white");
      
      svg.append("g")
        .call(d3.axisLeft(yScale))
        .style("stroke", "white");
      
      // Draw the box plots
      allStats.forEach(stat => {
        let color = stat.color;
        let label = stat.label;
        let white = "#ffffff"
        drawBoxPlot(svg, stat, {xScale, yScale, color, medianColor: white, category: label});
      });
      
      // Optional: Add the title
      svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "20px")
        .text("Finger Tapping Data Distribution")
        .style("fill", "white");

    }
else {
    console.log("Plotting FingerTapping for specific user:", userFilterValue);
    const sessionsData = data[userFilterValue].FingerTapping;

    let leftData = [];
    let rightData = [];

    // Prepare data and sort by session label
    Object.keys(sessionsData).sort((a, b) => parseCustomDate(a) - parseCustomDate(b))
        .forEach(sessionLabel => {
            const session = sessionsData[sessionLabel];
            leftData.push({
                session: sessionLabel,
                count: session.LeftHand && session.LeftHand.TapCount !== undefined ? session.LeftHand.TapCount : null
            });
            rightData.push({
                session: sessionLabel,
                count: session.RightHand && session.RightHand.TapCount !== undefined ? session.RightHand.TapCount : null
            });
        });

    const xScale = d3.scalePoint()
        .domain(leftData.map(d => d.session))
        .range([0, width])
        .padding(0.5);

    const maxCount = Math.max(
        ...leftData.concat(rightData).map(d => d.count).filter(count => count !== null)
    );

    const yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([height, 0])
        .nice();

        svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("fill", "white")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    
        // Select and style the path (the main axis line) and line elements (ticks)
        svg.selectAll(".domain, .tick line")
            .style("stroke", "white");
    

    svg.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("fill", "white");

    const lineGenerator = d3.line()
        .x(d => xScale(d.session))
        .y(d => yScale(d.count));

    // Function to draw lines only between non-null consecutive points
    const drawLines = (data, color) => {
        let prev = null;
        data.forEach((current, i) => {
            if (current.count !== null && prev && prev.count !== null) {
                svg.append("path")
                    .datum(data.slice(prev.index, i + 1))
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 1.5)
                    .attr("d", lineGenerator);
            }
            if (current.count !== null) {
                prev = { ...current, index: i };
            }
        });
    };

    drawLines(leftData, "#69b3a2");
    drawLines(rightData, "#404080");

    // Assuming colors and categories are defined
const categories = [
    { name: "Left Tap Counts", color: "#69b3a2" },
    { name: "Right Tap Counts", color: "#404080" }
];

// Add legend to the SVG
const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 120}, ${margin.top})`); // Adjust position as needed

categories.forEach((category, index) => {
    const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${index * 20})`); // Offset each legend item

    legendItem.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", category.color);

    legendItem.append("text")
        .attr("x", 15) // Offset text a bit right of the rectangle
        .attr("y", 10) // Align text with the box
        .text(category.name)
        .style("font-size", "12px")
        .style("fill", "white");
});



    const yAxis = svg.append("g").call(d3.axisLeft(yScale));
    yAxis.selectAll("text").style("fill", "white");
    yAxis.selectAll("line").style("stroke", "white");
    yAxis.selectAll(".domain").style("stroke", "white");
    // Title
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .text(`Finger Tapping - User ${userFilterValue} Session Data`)
        .style("fill", "white");
}


}

function plotFlankerTest(data) {
    console.log("Plotting FlankerTest", data);
    // Placeholder for plotting logic
}

function plotReactionTime(data, userFilterValue) {
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth; // Full width of the graph-area
    const graphHeight = graphArea.clientHeight; // Full height of the graph-area
    
    const margin = { top: 50, right: 100, bottom: 100, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Clear previous plots
    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
    .attr('width', '100%') // Use 100% to make it responsive
    .attr('height', '100%') // Use 100% to make it responsive
    .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`) // Ensure this matches the intended dimensions
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);


    if (!userFilterValue) {
        let pressedTimes = [];
        let releasedTimes = [];

        Object.values(data).forEach(user => {
            user[0].forEach(session => {
                Object.values(session).forEach(times => {
                    pressedTimes = pressedTimes.concat(times);
                });
            });
            user[1].forEach(session => {
                Object.values(session).forEach(times => {
                    releasedTimes = releasedTimes.concat(times);
                });
            });
        });

        const pressedStats = boxplotStats(pressedTimes);
        const releasedStats = boxplotStats(releasedTimes);

        // Create an array of stats to easily map through it
        const allStats = [
            { label: "Pressed", stats: pressedStats },
            { label: "Released", stats: releasedStats }
        ];

        // Create y scale
        const yScale = d3.scaleLinear()
            .domain([0, Math.max(pressedStats.max, releasedStats.max)])
            .nice()
            .range([height, 0]);
        

        // Add y axis
        svg.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("path, line")
            .style("stroke", "white")
            .style("font-size", "14px");

        svg.select(".domain")
        .style("stroke", "white");

        svg.selectAll("text")
        .style("fill", "white");

        // Create x scale
        const xScale = d3.scaleBand()
            .domain(allStats.map(d => d.label))
            .range([0, width])
            .padding(0.2);
        
        // Add x axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickSize(0))
            .selectAll("text")
            .style("fill", "white")
            .style("font-size", "14px");

        svg.selectAll(".domain, .tick line")
            .style("stroke", "white");


        svg.select(".domain")
            .style("stroke", "white");
         
        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")  
            .style("font-size", "20px")
            .text("Reaction Times in ms. for all users")
            .style("fill", "white");
        
     
        allStats.forEach((d, i) => {
            drawBoxPlot(svg, d, {
                xScale: xScale,
                yScale: yScale,
                color: i === 0 ? "#69b3a2" : "#404080", // different colors for pressed and released
                category: d.label
            });
        });
    }
    else {
        console.log("in user filter of reaction time");
        const sessionsData = data[userFilterValue].ReactionTime;
        
        let allData = sessionsData.flatMap(typeData =>
            typeData.flatMap(session => Object.values(session))
        );
    
        // Calculate global min and max for y-scale
        let globalMin = d3.min(allData, d => d3.min(d));
        let globalMax = d3.max(allData, d => d3.max(d));
    
        // Construct a combined session-category label array for xScale
        let categories = [];
        sessionsData.forEach((typeData, typeIndex) => {
            typeData.forEach((_, sessionIndex) => {
                categories.push(`Session_${sessionIndex+1}_${typeIndex === 0 ? 'Pressed' : 'Released'}`);
            });
        });
    
        // Scales
        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(categories)
            .padding(0.1);
        const yScale = d3.scaleLinear()
            .domain([globalMin, globalMax])
            .range([height, 0]);
    
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("fill", "white")
            .text("Session Reaction Times");
    
        // Draw box plots for each session for each type (pressed and released)
        sessionsData.forEach((typeData, typeIndex) => {
            typeData.forEach((sessionData, sessionIndex) => {
                const sessionTimes = Object.values(sessionData)[0];
                const stats = boxplotStats(sessionTimes);
    
                drawBoxPlot(svg, {label: `Session ${sessionIndex+1} - ${typeIndex === 0 ? 'Pressed' : 'Released'}`, stats: stats}, {
                    xScale: xScale,
                    yScale: yScale,
                    color: typeIndex === 0 ? "#69b3a2" : "#404080",
                    medianColor: typeIndex === 0 ? "#ffffff" : "#804055",
                    category: `Session_${sessionIndex+1}_${typeIndex === 0 ? 'Pressed' : 'Released'}`
                });
            });
        });
    
        // Axes
        const xAxis = svg.append("g")
                        .attr("transform", `translate(0, ${height})`)
                        .call(d3.axisBottom(xScale))
                        .selectAll("text")
                        .style("fill", "white")
                        .attr("transform", "rotate(-45)")
                        .style("text-anchor", "end");
    
        const yAxis = svg.append("g").call(d3.axisLeft(yScale));
        yAxis.selectAll("text").style("fill", "white");
        yAxis.selectAll("line").style("stroke", "white");
        yAxis.selectAll(".domain").style("stroke", "white");
    }
    
}

function plotRunningDotTest(data) {
    console.log("Plotting RunningDotTest", data);
    // Placeholder for plotting logic
}

function plotTremorsTest(data) {
    console.log("Plotting TremorsTest", data);
    // Placeholder for plotting logic
}

function plotWalkTest(data) {
    console.log("Plotting WalkTest", data);
    // Placeholder for plotting logic
}

// Export the functions to use them in index.js
export { plotAntiTapping, plotBalanceTest, plotDotCounting, plotFaceNameRecognition, plotFingerTapping, plotFlankerTest, plotReactionTime, plotRunningDotTest, plotTremorsTest, plotWalkTest };
