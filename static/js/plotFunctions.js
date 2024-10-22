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
        const userSessions = data[userFilterValue]["AntiTapping"];

        // Prepare the session and median distances data
        const sessions = Object.keys(userSessions).sort((a, b) => parseCustomDate(a) - parseCustomDate(b));
        const medianDistances = sessions.map(session => {
            const distancesReleased = userSessions[session].distances_released;
            return d3.median(distancesReleased); // Compute the median for each session
        });

        // Set up scales
        const xScale = d3.scalePoint()
            .domain(sessions)
            .range([0, width])
            .padding(0.5);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(medianDistances)]) // Set the y-domain based on max median
            .nice()
            .range([height, 0]);

        // Define axes
        // const xAxis = d3.axisBottom(xScale);
        // const yAxis = d3.axisLeft(yScale);
        const xAxis = d3.axisBottom(xScale).ticks(medianDistances.length);
        const yAxis = d3.axisLeft(yScale).tickFormat(d => d + ' px');

        // Add x-axis to the graph
        svg.append('g')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("fill", "white");
        svg.select(".domain").attr("stroke", "white");  // Make X-axis line white
        svg.selectAll(".tick line").attr("stroke", "white");  // Make X-axis tick marks white

        // Add y-axis to the graph
        svg.append('g')
            .call(yAxis)
            .selectAll("text")
            .style("fill", "white");
        svg.select(".domain").attr("stroke", "white");  // Make Y-axis line white
        svg.selectAll(".tick line").attr("stroke", "white");  // Make Y-axis tick marks white

        // Add labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2)
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text("Sessions");

        svg.append("text")
            .attr("x", -(height / 2))
            .attr("y", -margin.left / 2)
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text("Median Distance Released (px)");

        // Plot the line graph for median distances
        const line = d3.line()
            .x((d, i) => xScale(sessions[i]))
            .y((d) => yScale(d));

        svg.append("path")
            .datum(medianDistances)
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Add points on the line
        svg.selectAll("circle")
            .data(medianDistances)
            .enter()
            .append("circle")
            .attr("cx", (d, i) => xScale(sessions[i]))
            .attr("cy", d => yScale(d))
            .attr("r", 5)
            .attr("fill", "orange")
            .on("click", (event, d) => {
                // When a session point is clicked, plot the detailed distances for that session
                const clickedSession = sessions[d];
                plotDetailedAntiTapping(userSessions[clickedSession], clickedSession);
            });        
    }
}

function plotDetailedAntiTapping(sessionData, session) {
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth;
    const graphHeight = graphArea.clientHeight;

    const margin = { top: 50, right: 100, bottom: 100, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Clear previous detailed plot
    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

    const distancesReleased = sessionData.distances_released;

    // Set up scales for detailed plot
    const xScale = d3.scaleLinear()
        .domain([0, distancesReleased.length - 1])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(distancesReleased)])
        .nice()
        .range([height, 0]);

    // Define axes
    const xAxis = d3.axisBottom(xScale).ticks(distancesReleased.length);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => d + ' px');

    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis)
        .selectAll("text")
        .style("fill", "white"); // Set x-axis label color to white

    // Add y-axis
    svg.append('g')
        .call(yAxis)
        .selectAll("text")
        .style("fill", "white"); // Set y-axis label color to white

    // Add x-axis line and y-axis line color
    svg.selectAll(".domain")
        .style("stroke", "white");

    // Add labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom / 2)
        .style("text-anchor", "middle")
        .style("fill", "white") // Set label color to white
        .text("Tap Number");

    svg.append("text")
        .attr("x", -(height / 2))
        .attr("y", -margin.left / 2)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .style("fill", "white") // Set label color to white
        .text("Distance Released (px)");

    // Plot the detailed line graph for distances released
    const line = d3.line()
        .x((d, i) => xScale(i))
        .y((d) => yScale(d));

    svg.append("path")
        .datum(distancesReleased)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add points on the line
    svg.selectAll("circle")
        .data(distancesReleased)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => xScale(i))
        .attr("cy", d => yScale(d))
        .attr("r", 5)
        .attr("fill", "orange");
}

function plotBalanceTest(data) {
    console.log("Plotting BalanceTest", data);
    // Placeholder for plotting logic
}

function plotDotCounting(data, userFilterValue) {
    // Setup graph dimensions and SVG container
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth;
    const graphHeight = graphArea.clientHeight;

    const margin = { top: 50, right: 100, bottom: 150, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Clear previous plots
    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Initialize trial data for counting correct responses
    const trialCorrectCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0};
    const trialTotalCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0};

    // Process data for all users or filter by a specific user
    if (!userFilterValue) {
        for (let user in data) {
            for (let session in data[user]) {
                let sessionData = data[user][session][0];

                sessionData.all_trials.forEach(trial => {
                    let trialNum = trial.trial;
                    trialTotalCounts[trialNum]++;
                    if (trial.is_correct) {
                        trialCorrectCounts[trialNum]++;
                    }
                });
            }
        }
    } else {
        let userSessions = data[userFilterValue]["DotCounting"];
        console.log("User sessions: ", userSessions);

        for (let session in userSessions) {
            let sessionData = userSessions[session][0];
            console.log(sessionData);

            sessionData.all_trials.forEach(trial => {
                let trialNum = trial.trial;
                trialTotalCounts[trialNum]++;
                if (trial.is_correct) {
                    trialCorrectCounts[trialNum]++;
                }
            });
        }
    }

    const trialPercentages = [];
    for (let trialNum = 1; trialNum <= 7; trialNum++) {
        const correctCount = trialCorrectCounts[trialNum];
        const totalCount = trialTotalCounts[trialNum];
        const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
        trialPercentages.push({ trial: trialNum, percentage: percentage });
    }

    console.log("Trial Correct Counts: ", trialCorrectCounts);
    console.log("Trial Total Counts: ", trialTotalCounts);
    console.log("Trial Percentages: ", trialPercentages); 

    // Setup xScale and yScale
    let xScale = d3.scaleBand()
        .domain(trialPercentages.map(d => d.trial))
        .range([0, width])
        .padding(0.1);

    let yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // X-Axis
    const xAxisGroup = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d => "Trial " + d));

    // Change x-axis text color to white
    xAxisGroup.selectAll("text")
    .attr("fill", "white");

    // Set x-axis line color to white
    xAxisGroup.select(".domain").attr("stroke", "white"); // Set the axis line color to white
    xAxisGroup.selectAll(".tick line").attr("stroke", "white"); // Set tick lines color to white


    // Y-Axis
    const yAxisGroup = svg.append("g")
    .call(d3.axisLeft(yScale).ticks(10).tickFormat(d => d + "%"));

    // Change y-axis text color to white
    yAxisGroup.selectAll("text")
    .attr("fill", "white");

    // Set y-axis line color to white
    yAxisGroup.select(".domain").attr("stroke", "white"); // Set the axis line color to white
    yAxisGroup.selectAll(".tick line").attr("stroke", "white"); // Set tick lines color to white

        
    // Create bars for the bar chart
    svg.selectAll(".bar")
        .data(trialPercentages)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.trial))
        .attr("y", d => yScale(d.percentage))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.percentage))
        .attr("fill", "steelblue");

    // Add percentages on top of the bars
    svg.selectAll(".percentage-label")
        .data(trialPercentages)
        .enter()
        .append("text")
        .attr("class", "percentage-label")
        .attr("x", d => xScale(d.trial) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.percentage) - 5) // Position above the bar
        .attr("text-anchor", "middle")
        .attr("fill", "white") // Set label color to white
        .text(d => d.percentage.toFixed(1) + "%"); // Display percentage with one decimal place

    // Optional: Add titles, labels, and additional formatting
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "white") // Set title color to white
        .text(userFilterValue ? `Dot Counting - User: ${userFilterValue}` : "Dot Counting - All Users");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .attr("fill", "white") // Set x-axis label color to white
        .text("Trial Number");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white") // Set y-axis label color to white
        .text("Percentage Correct (%)");

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 100}, 0)`);

    legend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "steelblue");

    legend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text("Percentage Correct")
        .attr("fill", "white"); // Set legend text color to white
}

function plotFaceNameRecognition(data, userFilterValue) {
    console.log("Plotting FaceNameRecognition", data);
    
    // Graph configuration
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

        svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "white") // Set title color to white
        .text(userFilterValue ? `Face-Name recognition - User: ${userFilterValue}` : "Face-Name Recognition - All Users");

    let trialsData = [];
    
    // Utility function to calculate correctness for bins
    function calculateBinCorrectness(trials) {
        const bins = [[], [], []]; // Three bins: [1-8], [9-16], [17-24]

        trials.forEach((trial, index) => {
            if (index < 8) {
                bins[0].push(trial.is_correct);
            } else if (index < 16) {
                bins[1].push(trial.is_correct);
            } else {
                bins[2].push(trial.is_correct);
            }
        });

        return bins.map(bin => {
            const correctCount = bin.filter(correct => correct).length;
            return (correctCount / bin.length) * 100; // Return percentage of correct trials in each bin
        });
    }

    // Prepare trends data based on user filter
    if (userFilterValue) {
        // Filter data for the specific user
        const userData = data[userFilterValue]['FaceNameRecognition'];
        let sessionCorrectnessTrends = {
            bin1: [],
            bin2: [],
            bin3: []
        };

        if (userData) {
            Object.keys(userData).forEach(sessionKey => {
                const sessionArray = userData[sessionKey];
                sessionArray.forEach(session => {
                    const trials = session.all_trials;
                    const [bin1Correctness, bin2Correctness, bin3Correctness] = calculateBinCorrectness(trials);
                    sessionCorrectnessTrends.bin1.push(bin1Correctness);
                    sessionCorrectnessTrends.bin2.push(bin2Correctness);
                    sessionCorrectnessTrends.bin3.push(bin3Correctness);
                });
            });
            
            // Plot trends for the user (line graph)
            plotCorrectnessTrends(sessionCorrectnessTrends);
        }
    } else {
        // Aggregate trials for all users when no user filter is provided
        for (const user in data) {
            const userData = data[user];
            if (userData) {
                Object.keys(userData).forEach(sessionKey => {
                    const sessionArray = userData[sessionKey];
                    sessionArray.forEach(session => {
                        const trials = session.all_trials;
                        trialsData = trialsData.concat(trials);
                    });
                });
            }
        }

        // Aggregate all trials into bins
        const [bin1Correctness, bin2Correctness, bin3Correctness] = calculateBinCorrectness(trialsData);

        // Plot correctness across all users (bar graph)
        plotCorrectnessBars([bin1Correctness, bin2Correctness, bin3Correctness]);
    }

    // Function to plot correctness trends as line plots for a user
    function plotCorrectnessTrends(trends) {
        const sessions = trends.bin1.length; // Number of sessions
    
        // Debugging: Check trends data structure
        console.log("Plotting trends for bin1, bin2, bin3", trends);
    
        // Ensure that there are sessions and data available
        if (!sessions || sessions <= 0) {
            console.log("No sessions data found.");
            return;
        }
    
        // Set up scales
        const xScale = d3.scaleLinear()
            .domain([0, sessions - 1]) // Map sessions to x-axis
            .range([0, width]);
    
        const yScale = d3.scaleLinear()
            .domain([0, 100]) // Correctness percentage range (0-100%)
            .range([height, 0]);
    
        // Colors for different bins
        const colors = ["#008080", "#FF6F61", "#FFD700"];
    
        // Function to add jitter to coordinates
        const jitter = (value, offset = 2) => value + (Math.random() * offset - offset / 2);
    
        // Plot points for each bin
        ["bin1", "bin2", "bin3"].forEach((bin, idx) => {
            const data = trends[bin];
    
            // Plot a point for each data value
            data.forEach((d, i) => {
                svg.append("circle")
                    .attr("cx", jitter(xScale(i))) // Apply jitter to the x position
                    .attr("cy", jitter(yScale(d))) // Apply jitter to the y position
                    .attr("r", 5) // Radius of the circle
                    .attr("fill", colors[idx]); // Color based on bin
            });
    
            // If you want to connect points with a line when there are multiple points:
            if (data.length > 1) {
                const line = d3.line()
                    .x((d, i) => xScale(i))
                    .y(d => yScale(d));
    
                svg.append("path")
                    .datum(data)
                    .attr("fill", "none")
                    .attr("stroke", colors[idx])
                    .attr("stroke-width", 2)
                    .attr("d", line);
            }
        });
    
        // Add axes
        const xAxis = d3.axisBottom(xScale).ticks(sessions);
        const yAxis = d3.axisLeft(yScale);
    
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis);
        
        const yAxisGroup = svg.append("g")
            .call(yAxis);
    
        // Set the axis lines to white
        xAxisGroup.select("path").attr("stroke", "white");
        yAxisGroup.select("path").attr("stroke", "white");
    
        xAxisGroup.selectAll("text")
            .attr("fill", "white"); // Change x-axis text color to white
        
        yAxisGroup.selectAll("text")
            .attr("fill", "white"); // Change y-axis text color to white
    
        // Add axis labels
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom / 2})`)
            .text("Sessions")
            .attr("fill", "white"); // Change x-axis label color to white
    
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${-margin.left / 2}, ${height / 2}) rotate(-90)`)
            .text("Correctness (%)")
            .attr("fill", "white"); // Change y-axis label color to white
    
        // Add legend
        svg.append("circle").attr("cx", width + 20).attr("cy", 20).attr("r", 6).style("fill", colors[0]);
        svg.append("text").attr("x", width + 30).attr("y", 20).text("Bin 1 (1-8)").style("font-size", "15px").attr("alignment-baseline", "middle").attr("fill", "white");
        svg.append("circle").attr("cx", width + 20).attr("cy", 40).attr("r", 6).style("fill", colors[1]);
        svg.append("text").attr("x", width + 30).attr("y", 40).text("Bin 2 (9-16)").style("font-size", "15px").attr("alignment-baseline", "middle").attr("fill", "white");
        svg.append("circle").attr("cx", width + 20).attr("cy", 60).attr("r", 6).style("fill", colors[2]);
        svg.append("text").attr("x", width + 30).attr("y", 60).text("Bin 3 (17-24)").style("font-size", "15px").attr("alignment-baseline", "middle").attr("fill", "white");
    }
    
          

    // Function to plot correctness bars for all users
    function plotCorrectnessBars(correctness) {
        console.log("Correctness:", correctness);
        // Set up scales
        const xScale = d3.scaleBand()
            .domain([0, 1, 2]) // 3 bins: Bin 1, Bin 2, Bin 3
            .range([0, width])
            .padding(0.3);
    
        const yScale = d3.scaleLinear()
            .domain([0, 100]) // Correctness percentage range (0-100%)
            .range([height, 0]);
    
        // Colors for the bins
        const colors = ["#008080", "#FF6F61", "#FFD700"]; // Teal, Coral, Golden Yellow
    
        // Ensure correctness data is valid and numeric
        const validCorrectness = correctness.map(d => (isNaN(d) ? 0 : d));
    
        // Bar plot
        svg.selectAll(".bar")
            .data(validCorrectness) // Use the validated data
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d, i) => xScale(i)) // Position based on the bin index
            .attr("y", d => yScale(d)) // Y position based on correctness value
            .attr("width", xScale.bandwidth()) // Bar width
            .attr("height", d => height - yScale(d)) // Bar height
            .attr("fill", (d, i) => colors[i]); // Color for each bin
    
        // Add axes
        const xAxis = d3.axisBottom(xScale).tickFormat((d, i) => `Bin ${i + 1}`);
        const yAxis = d3.axisLeft(yScale);
    
        // Append X-axis
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis);
    
        // Append Y-axis
        const yAxisGroup = svg.append("g")
            .call(yAxis);
    
        // Set the color of the axes to white
        xAxisGroup.selectAll("text").attr("fill", "white"); // X-axis text color
        yAxisGroup.selectAll("text").attr("fill", "white"); // Y-axis text color
        xAxisGroup.select("path").attr("stroke", "white"); // X-axis line color
        yAxisGroup.select("path").attr("stroke", "white"); // Y-axis line color
    
        // Add axis labels
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom / 2})`)
            .text("Index of Face-Name trials (Bins)")
            .attr("fill", "white"); // X-axis label color
    
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${-margin.left / 2}, ${height / 2}) rotate(-90)`)
            .text("Correctness (%)")
            .attr("fill", "white"); // Y-axis label color
    
        // Add legend
        const legend = svg.append("g")
            .attr("transform", `translate(${width + 30}, 20)`); // Position of the legend
    
        colors.forEach((color, i) => {
            // Create legend items
            legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 20) // Vertical spacing
                .attr("width", 15)
                .attr("height", 15)
                .style("fill", color);
    
            legend.append("text")
                .attr("x", 20)
                .attr("y", i * 20 + 12) // Center the text vertically
                .text(`${(i * 8) + 1} - ${((i * 8) + 7) + 1}`) // Legend label
                .attr("fill", "white"); // Change legend text color to white
        });
    }
    
    
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

    // Function to style axes and their ticks
    const styleAxes = (xAxisGroup, yAxisGroup) => {
        xAxisGroup.select(".domain").attr("stroke", "white");  // X-axis line
        xAxisGroup.selectAll(".tick line").attr("stroke", "white"); // X-axis tick marks
        yAxisGroup.select(".domain").attr("stroke", "white");  // Y-axis line
        yAxisGroup.selectAll(".tick line").attr("stroke", "white"); // Y-axis tick marks

        xAxisGroup.selectAll("text").style("fill", "white"); // X-axis text
        yAxisGroup.selectAll("text").style("fill", "white"); // Y-axis text
    };

    if (!userFilterValue) {
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
            .domain([0, d3.max([leftTapCountStats.max, rightTapCountStats.max])])
            .range([height, 0])
            .nice();

        const xScale = d3.scaleBand()
            .domain(allStats.map(d => d.label))
            .range([0, width])
            .padding(0.1);

        // Add the X and Y axis to the svg
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        const yAxisGroup = svg.append("g")
            .call(d3.axisLeft(yScale));

        // Style the axes
        styleAxes(xAxisGroup, yAxisGroup);

        // Draw the box plots
        allStats.forEach(stat => {
            let color = stat.color;
            let label = stat.label;
            let white = "#ffffff";
            drawBoxPlot(svg, stat, { xScale, yScale, color, medianColor: white, category: label });
        });

        // Optional: Add the title
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Finger Tapping Data Distribution")
            .style("fill", "white");

        // Add Legend
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 100}, 20)`); // Adjust position as needed

        allStats.forEach((stat, index) => {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", index * 20) // Space out legend items
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", stat.color);

            legend.append("text")
                .attr("x", 20)
                .attr("y", index * 20 + 12) // Center text vertically
                .style("fill", "white")
                .text(stat.label);
        });

    } else {
        console.log("Plotting FingerTapping for specific user:", userFilterValue);
        const sessionsData = data[userFilterValue].FingerTapping;
        let avgReactionTimes = [];

        // Prepare data with session keys and sort by session label
        Object.keys(sessionsData).sort((a, b) => parseCustomDate(a) - parseCustomDate(b))
            .forEach(sessionLabel => {
                const session = sessionsData[sessionLabel];
                let leftTimes = session.LeftHand?.LeftButton || [];
                let rightTimes = session.RightHand?.RightButton || [];
                let allTimes = leftTimes.concat(rightTimes);

                const avgTime = d3.median(allTimes);
                avgReactionTimes.push({ session: sessionLabel, avgTime: avgTime });
            });

        // Set up scales for the average plot
        const xScale = d3.scalePoint()
            .domain(avgReactionTimes.map(d => d.session)) // Use session keys
            .range([0, width])
            .padding(0.5);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(avgReactionTimes, d => d.avgTime)])
            .range([height, 0])
            .nice();

        // Add X-axis
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        // Style the axes
        styleAxes(xAxisGroup, svg.append("g").call(d3.axisLeft(yScale)));

        // Add X-axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)  // Position below the axis
            .style("fill", "white")
            .text("Sessions");  // X-axis label text

        // Add Y-axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")  // Rotate to align with Y-axis
            .attr("x", -height / 2)  // Center along Y-axis
            .attr("y", -margin.left + 20)  // Position to the left of the Y-axis
            .style("fill", "white")
            .text("Time (milliseconds)");  // Y-axis label text

        // Line generator for average reaction times
        const lineGenerator = d3.line()
            .x(d => xScale(d.session))  // Use the session key for x-axis
            .y(d => yScale(d.avgTime));

        // Draw the line for average reaction times
        svg.append("path")
            .datum(avgReactionTimes)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        // Add circles for each session point
        svg.selectAll("circle")
            .data(avgReactionTimes)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.session))  // Use session key for circle position
            .attr("cy", d => yScale(d.avgTime))
            .attr("r", 5)
            .attr("fill", "orange")
            .on("click", (event, d) => plotFingerTappingSessionDetails(data, userFilterValue, avgReactionTimes[d].session)); // Pass correct session key

        // Title for the average reaction time plot
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Average Reaction Time for Each Session")
            .style("fill", "white");

        // Add Legend for Average Reaction Time
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 100}, 20)`); // Adjust position as needed

        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", "orange");

        legend.append("text")
            .attr("x", 20)
            .attr("y", 12) // Center text vertically
            .style("fill", "white")
            .text("Average Reaction Time (ms)");
    }
}

function plotFingerTappingSessionDetails(data, userFilterValue, sessionLabel) {
    console.log("Plotting session details for:", sessionLabel);

    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth;
    const graphHeight = graphArea.clientHeight;

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

    const session = data[userFilterValue].FingerTapping[sessionLabel];

    const leftData = session.LeftHand && session.LeftHand.LeftButton !== undefined ? session.LeftHand.LeftButton.map((time, i) => ({ index: i, time })) : [];
    // console.log("left", leftData);
    const rightData = session.RightHand && session.RightHand.RightButton !== undefined ? session.RightHand.RightButton.map((time, i) => ({ index: i, time })) : [];
    // console.log("right", rightData);
    
    const xScale = d3.scaleLinear()
        .domain([0, Math.max(leftData.length, rightData.length)])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max([...leftData.map(d => d.time), ...rightData.map(d => d.time)])])
        .range([height, 0])
        .nice();

    // Add X and Y axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("fill", "white");

    svg.select(".domain").attr("stroke", "white");  // Make X-axis line white
    svg.selectAll(".tick line").attr("stroke", "white");  // Make X-axis tick marks white
    
    svg.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("fill", "white");

    svg.selectAll(".domain").attr("stroke", "white");  // Make Y-axis line white
    svg.selectAll(".tick line").attr("stroke", "white");  // Make Y-axis tick marks white        

    // Add X-axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)  // Position below the axis
        .style("fill", "white")
        .text("Tap Count");

    // Add Y-axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")  // Rotate to align with Y-axis
        .attr("x", -height / 2)  // Center along Y-axis
        .attr("y", -margin.left + 20)  // Position to the left of the Y-axis
        .style("fill", "white")
        .text("Time (milliseconds)");

    // Line generator
    const lineGenerator = d3.line()
        .x(d => xScale(d.index))
        .y(d => yScale(d.time));

    // Draw the line for left hand
    if (leftData.length > 0) {
        svg.append("path")
            .datum(leftData)
            .attr("fill", "none")
            .attr("stroke", "green")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);
    }

    // Draw the line for right hand
    if (rightData.length > 0) {
        svg.append("path")
            .datum(rightData)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);
    }

    // Add title for the session detail plot
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .text(`Session ${sessionLabel} - Left vs Right Hand Reaction Time`)
        .style("fill", "white");

    // Add a legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 100}, 30)`);

    // Legend for the left hand (green)
    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "green");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("fill", "white")
        .text("Left Hand");

    // Legend for the right hand (blue)
    legend.append("rect")
        .attr("x", 0)
        .attr("y", 20)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "blue");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 30)
        .style("fill", "white")
        .text("Right Hand");

}

function plotFlankerTest(data, userFilterValue) {
    console.log("Plotting FlankerTest", data);
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth;
    const graphHeight = graphArea.clientHeight;

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

    const averageData = Array.from({ length: 60 }, () => ({ avgTime: 0, avgCorrectness: 0, count: 0 }));

    let sessions = [];

    if (userFilterValue) {
        sessions = Object.keys(data[userFilterValue]['FlankerTest']);
        const sessionData = [];

        sessions.forEach(sessionKey => {
            const session = data[userFilterValue]['FlankerTest'][sessionKey][0];
            const allTrials = session.all_trials;

            let totalTime = 0;
            let correctTrials = 0;
            let trialCount = allTrials.length;

            allTrials.forEach(trial => {
                totalTime += trial.reaction_time;
                if (trial.is_correct) correctTrials++;
            });

            const avgTime = totalTime / trialCount;
            const correctness = (correctTrials / trialCount) * 100;

            sessionData.push({
                sessionKey: sessionKey,
                avgTime: avgTime,
                correctness: correctness,
                allTrials: allTrials
            });
        });

        const xScale = d3.scaleLinear()
            .domain([0, sessions.length - 1])
            .range([0, width]);

        const yScaleTime = d3.scaleLinear()
            .domain([0, d3.max(sessionData, d => d.avgTime) || 0])
            .range([height, 0]);

        const yScaleCorrectness = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

        // Add axes with white labels
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).ticks(sessions.length))
            .selectAll('text')
            .style('fill', 'white');

        svg.append('g')
            .attr('class', 'y-axis-time')
            .call(d3.axisLeft(yScaleTime).ticks(10)) // Specify the number of ticks
            .selectAll('text')
            .style('fill', 'white');

        svg.append('g')
            .attr('class', 'y-axis-correctness')
            .attr('transform', `translate(${width}, 0)`)
            .call(d3.axisRight(yScaleCorrectness).ticks(10)) // Specify the number of ticks
            .selectAll('text')
            .style('fill', 'white');

        // Add labels to axes
        svg.append('text') // X-axis label
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'white')
            .text('Session');

        // Line for average reaction times
        svg.append('path')
            .datum(sessionData)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1.5)
            .attr('d', d3.line()
                .x((d, i) => xScale(i))
                .y(d => yScaleTime(d.avgTime))
            );

        // Line for average correctness
        svg.append('path')
            .datum(sessionData)
            .attr('fill', 'none')
            .attr('stroke', 'orange')
            .attr('stroke-width', 1.5)
            .attr('d', d3.line()
                .x((d, i) => xScale(i))
                .y(d => yScaleCorrectness(d.correctness))
            );

        // Add points for sessions
        svg.selectAll(".session-point")
            .data(sessionData)
            .enter()
            .append("circle")
            .attr("cx", (d, i) => xScale(i))
            .attr("cy", d => yScaleTime(d.avgTime))
            .attr("r", 5)
            .attr("fill", "steelblue")
            .on('click', function(event, d) {
                console.log("Clicked session", sessionData[d].sessionKey);
                plotTrialDetails(sessionData[d].allTrials, sessionData[d].sessionKey);
            });

        // Add title for session-level plot
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '24px')
            .style('fill', 'white')
            .text(`Average Reaction Times and Correctness for ${userFilterValue}`);

        // Add Legend
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 90}, 10)`);

        // Legend for Average Reaction Time
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", "steelblue");

        legend.append("text")
            .attr("x", 25)
            .attr("y", 10)
            .text("Average Reaction Time (ms)")
            .style("fill", "white");

        // Legend for Average Correctness
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 20)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", "orange");

        legend.append("text")
            .attr("x", 25)
            .attr("y", 30)
            .text("Average Correctness (%)")
            .style("fill", "white");

    } else {
        const users = Object.keys(data);

        users.forEach(user => {
            const userSessions = Object.keys(data[user]);
            userSessions.forEach(sessionKey => {
                const sessionData = data[user][sessionKey][0];
                const allTrials = sessionData.all_trials;

                allTrials.forEach(trial => {
                    const trialIndex = trial.trial - 1;
                    averageData[trialIndex].avgTime += trial.reaction_time;
                    averageData[trialIndex].avgCorrectness += trial.is_correct ? 1 : 0;
                    averageData[trialIndex].count += 1;
                });
            });
        });

        averageData.forEach(trial => {
            if (trial.count > 0) {
                trial.avgTime /= trial.count;
                trial.avgCorrectness = (trial.avgCorrectness / trial.count) * 100;
            }
        });

        const xScale = d3.scaleLinear()
            .domain([1, 60])
            .range([0, width]);

        const yScaleTime = d3.scaleLinear()
            .domain([0, d3.max(averageData, d => d.avgTime) || 0])
            .range([height, 0]);

        const yScaleCorrectness = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).ticks(60))
            .selectAll('text')
            .style('fill', 'white');

        svg.append('g')
            .attr('class', 'y-axis-time')
            .call(d3.axisLeft(yScaleTime).ticks(10))
            .selectAll('text')
            .style('fill', 'white');

        svg.append('g')
            .attr('class', 'y-axis-correctness')
            .attr('transform', `translate(${width}, 0)`)
            .call(d3.axisRight(yScaleCorrectness).ticks(10))
            .selectAll('text')
            .style('fill', 'white');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'white')
            .text('Trial Number');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', -margin.left / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .style('fill', 'white')
            .text('Average Reaction Time (ms)');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', width + margin.right / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .style('fill', 'white')
            .text('Average Correctness (%)');

        // Line for average reaction times
        svg.append('path')
            .datum(averageData)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1.5)
            .attr('d', d3.line()
                .x((d, i) => xScale(i + 1)) // Adjust for 1-based index
                .y(d => yScaleTime(d.avgTime))
            );

        // Line for average correctness
        svg.append('path')
            .datum(averageData)
            .attr('fill', 'none')
            .attr('stroke', 'orange')
            .attr('stroke-width', 1.5)
            .attr('d', d3.line()
                .x((d, i) => xScale(i + 1)) // Adjust for 1-based index
                .y(d => yScaleCorrectness(d.avgCorrectness))
            );

        // Add points for trials
        svg.selectAll(".trial-point")
            .data(averageData)
            .enter()
            .append("circle")
            .attr("cx", (d, i) => xScale(i + 1)) // Adjust for 1-based index
            .attr("cy", d => yScaleTime(d.avgTime))
            .attr("r", 5)
            .attr("fill", "steelblue");

        // Add title for overall plot
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '24px')
            .style('fill', 'white')
            .text(`Overall Average Reaction Times and Correctness`);

        // Add Legend
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 90}, 10)`);

        // Legend for Average Reaction Time
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", "steelblue");

        legend.append("text")
            .attr("x", 25)
            .attr("y", 10)
            .text("Average Reaction Time (ms)")
            .style("fill", "white");

        // Legend for Average Correctness
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 20)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", "orange");

        legend.append("text")
            .attr("x", 25)
            .attr("y", 30)
            .text("Average Correctness (%)")
            .style("fill", "white");
    }
}

function plotTrialDetails(allTrials, sessionKey) {
    console.log("Plotting trial details for session", sessionKey);
    const trialGraphArea = document.getElementById('graph-area');
    const trialGraphWidth = trialGraphArea.clientWidth;
    const trialGraphHeight = trialGraphArea.clientHeight;

    const trialMargin = { top: 20, right: 20, bottom: 60, left: 50 }; // Increased bottom margin for x-axis label
    const trialWidth = trialGraphWidth - trialMargin.left - trialMargin.right;
    const trialHeight = trialGraphHeight - trialMargin.top - trialMargin.bottom;

    d3.select("#graph-area").selectAll("svg").remove();

    const trialSvg = d3.select('#graph-area').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${trialGraphWidth} ${trialGraphHeight}`)
        .append('g')
        .attr('transform', `translate(${trialMargin.left},${trialMargin.top})`);

    const xScale = d3.scaleLinear()
        .domain([0, allTrials.length])
        .range([0, trialWidth]);

    const yScaleTime = d3.scaleLinear()
        .domain([0, d3.max(allTrials, d => d.reaction_time)])
        .range([trialHeight, 0]);

    trialSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${trialHeight})`)
        .call(d3.axisBottom(xScale).ticks(allTrials.length))
        .selectAll('text')
        .style('fill', 'white');

    trialSvg.append('g')
        .attr('class', 'y-axis-time')
        .call(d3.axisLeft(yScaleTime))
        .selectAll('text')
        .style('fill', 'white');

    trialSvg.append('path')
        .datum(allTrials)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 1.5)
        .attr('d', d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScaleTime(d.reaction_time))
        );

    // Add labels for axes
    trialSvg.append('text') // X-axis label
        .attr('class', 'axis-label')
        .attr('x', trialWidth / 2)
        .attr('y', trialHeight + trialMargin.bottom / 2)
        .attr('text-anchor', 'middle')
        .style('fill', 'white')
        .text('Trial Number');


    trialSvg.append('text')
        .attr('x', trialWidth / 2)
        .attr('y', -trialMargin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('fill', 'white')
        .text(`Reaction Times (ms) for Trials in Session: ${sessionKey}`);


    const legend = trialSvg.append("g")
            .attr("transform", `translate(${width - 90}, 10)`);

        // Legend for Average Reaction Time
    legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", "steelblue");

    legend.append("text")
            .attr("x", 25)
            .attr("y", 10)
            .text("Average Reaction Time (ms)")
            .style("fill", "white");
}

function plotReactionTime(data, userFilterValue) {
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth;
    const graphHeight = graphArea.clientHeight;
    
    const margin = { top: 50, right: 100, bottom: 150, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Clear previous plots
    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`)
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

        const allStats = [
            { label: "Pressed", stats: pressedStats },
            { label: "Released", stats: releasedStats }
        ];

        const yScale = d3.scaleLinear()
            .domain([0, Math.max(pressedStats.max, releasedStats.max)])
            .nice()
            .range([height, 0]);
        
        // Y-axis with units
        svg.append("g")
            .call(d3.axisLeft(yScale).tickFormat(d => d + " ms")) // Adding units (milliseconds)
            .selectAll("path, line, text")
            .style("stroke", "white")
            .style("fill", "white")
            .style("font-size", "14px");

        const xScale = d3.scaleBand()
            .domain(allStats.map(d => d.label))
            .range([0, width])
            .padding(0.2);
        
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("fill", "white")
            .style("font-size", "14px");

        svg.selectAll(".domain, .tick line")
            .style("stroke", "white");

        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")  
            .style("font-size", "20px")
            .text("Reaction Times (ms) for All Users")
            .style("fill", "white");
        
        // Add labels for axes
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "white")
            .text("Reaction Type (Pressed / Released)");

        svg.append("text")
            .attr("x", -(height / 2))
            .attr("y", -margin.left + 40)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "white")
            .text("Reaction Time (ms)");

        // Plot the box plots
        allStats.forEach((d, i) => {
            drawBoxPlot(svg, d, {
                xScale: xScale,
                yScale: yScale,
                color: i === 0 ? "#69b3a2" : "#404080", // Different colors for pressed/released
                category: d.label
            });
        });

        // Add legend
        const legendData = [
            { label: "Pressed", color: "#69b3a2" },
            { label: "Released", color: "#404080" }
        ];

        const legend = svg.append("g")
            .attr("transform", `translate(${width - 100}, ${-20})`);

        legend.selectAll("rect")
            .data(legendData)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => d.color);

        legend.selectAll("text")
            .data(legendData)
            .enter()
            .append("text")
            .attr("x", 20)
            .attr("y", (d, i) => i * 20 + 12)
            .style("fill", "white")
            .text(d => d.label);
    }
    else {
        // Filtered user-specific plotting
        console.log("in user filter of reaction time");

        const sessionsData = data[userFilterValue].ReactionTime;
        let allData = sessionsData.flatMap(typeData =>
            typeData.flatMap(session => Object.values(session))
        );

        let globalMin = d3.min(allData, d => d3.min(d));
        let globalMax = d3.max(allData, d => d3.max(d));

        let categories = [];
        sessionsData.forEach((typeData, typeIndex) => {
            typeData.forEach((_, sessionIndex) => {
                categories.push(`Session_${sessionIndex+1}_${typeIndex === 0 ? 'Pressed' : 'Released'}`);
            });
        });

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

        sessionsData.forEach((typeData, typeIndex) => {
            typeData.forEach((sessionData, sessionIndex) => {
                const sessionTimes = Object.values(sessionData)[0];
                const stats = boxplotStats(sessionTimes);

                drawBoxPlot(svg, {
                    label: `Session ${sessionIndex+1} - ${typeIndex === 0 ? 'Pressed' : 'Released'}`,
                    stats: stats
                }, {
                    xScale: xScale,
                    yScale: yScale,
                    color: typeIndex === 0 ? "#69b3a2" : "#404080",
                    category: `Session_${sessionIndex+1}_${typeIndex === 0 ? 'Pressed' : 'Released'}`
                });
            });
        });

        const xAxis = svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("fill", "white")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        const yAxis = svg.append("g").call(d3.axisLeft(yScale).tickFormat(d => d + " ms"));
        yAxis.selectAll("text").style("fill", "white");
        yAxis.selectAll("line").style("stroke", "white");
        yAxis.selectAll(".domain").style("stroke", "white");

        // Add legend for user-specific plots
        const legendData = [
            { label: "Pressed", color: "#69b3a2" },
            { label: "Released", color: "#404080" }
        ];

        const legend = svg.append("g")
            .attr("transform", `translate(${width - 100}, ${-20})`);

        legend.selectAll("rect")
            .data(legendData)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => d.color);

        legend.selectAll("text")
            .data(legendData)
            .enter()
            .append("text")
            .attr("x", 20)
            .attr("y", (d, i) => i * 20 + 12)
            .style("fill", "white")
            .text(d => d.label);
    }
}

function plotRunningDotTest(data, userFilterValue) {
    console.log("Plotting RunningDotTest", data);

    // Setup graph dimensions and SVG container
    const graphArea = document.getElementById('graph-area');
    const graphWidth = graphArea.clientWidth;
    const graphHeight = graphArea.clientHeight;

    const margin = { top: 50, right: 100, bottom: 150, left: 100 };
    const width = graphWidth - margin.left - margin.right;
    const height = graphHeight - margin.top - margin.bottom;

    // Clear previous plots
    d3.select("#graph-area").selectAll("svg").remove();

    const svg = d3.select('#graph-area').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Initialize arrays for trials for each dot count
    const dotCounts = [2, 3, 4, 5];
    const correctnessData = {
        2: [],
        3: [],
        4: [],
        5: []
    };

    // Check if userFilterValue is provided
    if (userFilterValue) {
        // Plot for a specific user
        const userSessions = data[userFilterValue]['RunningDotTest'];

        if (userSessions) {
            for (const session in userSessions) {
                userSessions[session].forEach(trial => {
                    trial.all_trials.forEach((t) => {
                        if (correctnessData[t.dot_count] !== undefined) {
                            correctnessData[t.dot_count].push(t.is_correct);
                        }
                    });
                });
            }

            // Calculate average correctness for each dot count
            const lineData = dotCounts.map(count => {
                const trials = correctnessData[count];
                const totalCorrect = trials.reduce((sum, correct) => sum + (correct ? 1 : 0), 0);
                return {
                    dot_count: count,
                    average_correctness: (totalCorrect / trials.length) * 100 // Convert to percentage
                };
            });

            // Set up scales for the line chart
            const xScale = d3.scaleBand()
                .domain(lineData.map(d => d.dot_count))
                .range([0, width])
                .padding(0.1);

            const yScale = d3.scaleLinear()
                .domain([0, 100]) // Change to percentage scale
                .range([height, 0]);

            // Create line chart for the specified user
            const line = d3.line()
                .x(d => xScale(d.dot_count) + xScale.bandwidth() / 2)
                .y(d => yScale(d.average_correctness));

            svg.append("path")
                .datum(lineData)
                .attr("fill", "none")
                .attr("stroke", "#FFD700")
                .attr("stroke-width", 2)
                .attr("d", line);

            // Add points for each dot count
            svg.selectAll(".point")
                .data(lineData)
                .enter()
                .append("circle")
                .attr("class", "point")
                .attr("cx", d => xScale(d.dot_count) + xScale.bandwidth() / 2)
                .attr("cy", d => yScale(d.average_correctness))
                .attr("r", 5)
                .attr("fill", "#FFD700");

        } else {
            console.log(`No data found for user: ${userFilterValue}`);
            return;
        }

    } else {
        // Aggregate all sessions for all users
        for (const user in data) {
            const userSessions = data[user];
            for (const session in userSessions) {
                userSessions[session].forEach(trial => {
                    trial.all_trials.forEach((t) => {
                        if (correctnessData[t.dot_count] !== undefined) {
                            correctnessData[t.dot_count].push(t.is_correct);
                        }
                    });
                });
            }
        }

        // Set up scales for the bar chart
        const xScale = d3.scaleBand()
            .domain(dotCounts)
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 100]) // Change to percentage scale
            .range([height, 0]);

        // Bar chart for aggregated correctness
        dotCounts.forEach(count => {
            const trials = correctnessData[count];
            const totalCorrect = trials.reduce((sum, correct) => sum + (correct ? 1 : 0), 0);
            const averageCorrectness = (totalCorrect / trials.length) * 100; // Convert to percentage

            svg.append("rect")
                .attr("class", "bar")
                .attr("x", xScale(count))
                .attr("y", yScale(averageCorrectness))
                .attr("width", xScale.bandwidth())
                .attr("height", height - yScale(averageCorrectness))
                .attr("fill", "#FFD700");
        });
    }

    // Add axes
    const xAxis = d3.axisBottom(d3.scaleBand()
        .domain(dotCounts) // Dot counts (2, 3, 4, 5)
        .range([0, width])
        .padding(0.1));

    const yAxis = d3.axisLeft(d3.scaleLinear()
        .domain([0, 100]) // Change to percentage scale
        .range([height, 0]))
        .ticks(10) // Optional: Add tick marks for clarity
        .tickFormat(d => d + "%"); // Format ticks as percentages

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis)
        .selectAll("text") // Change x-axis text color to white
        .attr("fill", "white");

    svg.select(".domain").attr("stroke", "white");
    svg.selectAll(".tick line").attr("stroke", "white");

    svg.append("g")
        .call(yAxis)
        .selectAll("text") // Change y-axis text color to white
        .attr("fill", "white");

    svg.select(".domain").attr("stroke", "white"); // Set the axis line color
    svg.selectAll(".tick line").attr("stroke", "white"); // Set tick lines color

    // Add axis labels
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom / 2})`)
        .attr("fill", "white") // Change label color to white
        .text("Dot Count");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${-margin.left / 2}, ${height / 2}) rotate(-90)`)
        .attr("fill", "white") // Change label color to white
        .text("Average Correctness (%)"); // Add percentage to label

    // Add legend
    const legendGroup = svg.append("g")
        .attr("transform", `translate(${width - 100}, 0)`); // Position legend

    legendGroup.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#FFD700");

    legendGroup.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .attr("fill", "white") // Change legend text color to white
        .text("Average Correctness (%)"); // Add percentage to legend

    // Optional: Add a title to the plot
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("fill", "white") // Change title color to white
        .style("font-size", "16px")
        .text("Running Dot Test Results");
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
