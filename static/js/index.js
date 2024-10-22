
import { plotAntiTapping, plotBalanceTest, plotDotCounting, plotFaceNameRecognition, plotFingerTapping, plotFlankerTest, plotReactionTime, plotRunningDotTest, plotTremorsTest, plotWalkTest } from './plotFunctions.js';

function updateGraphArea(userFilterValue, testFilterValue, plotData) {
  const placeholder = document.getElementById('graph-placeholder');
  
  if (testFilterValue) {
    placeholder.style.display = 'none';

    switch(testFilterValue) {
        case "AntiTapping":
            plotAntiTapping(plotData, userFilterValue);
            break;
        case "BalanceTest":
            plotBalanceTest(plotData, userFilterValue);
            break;
        case "DotCounting":
            plotDotCounting(plotData, userFilterValue);
            break;
        case "FaceNameRecognition":
            plotFaceNameRecognition(plotData, userFilterValue);
            break;
        case "FingerTapping":
            plotFingerTapping(plotData, userFilterValue);
            break;
        case "FlankerTest":
            plotFlankerTest(plotData, userFilterValue);
            break;
        case "ReactionTime":
            plotReactionTime(plotData, userFilterValue);
            break;
        case "RunningDotTest":
            plotRunningDotTest(plotData, userFilterValue);
            break;
        case "TremorsTest":
            plotTremorsTest(plotData, userFilterValue);
            break;
        case "WalkTest":
            plotWalkTest(plotData, userFilterValue);
            break;
        default:
            console.error("Test not recognized:", testFilterValue);
            // Show placeholder if the test is not recognized
            placeholder.style.display = 'block';
            placeholder.textContent = "Test not recognized. Please select a valid test.";
    }
} else {
    // If no test filter value is present, show the placeholder
    placeholder.style.display = 'block';
    placeholder.textContent = "Select filters to visualize data";
    d3.select("#graph-area").selectAll("svg").remove();
}

}



function populateDropdown(dropdownId, options, defaultOptionText) {
  const dropdown = document.getElementById(dropdownId);
  dropdown.innerHTML = ''; // Clear existing options
  dropdown.add(new Option(defaultOptionText, '', true, true)); // Add the default option

  options.forEach(option => {
      dropdown.add(new Option(option, option));
  });
}

function updateTotalUsersText(data, userFilter, testFilter) {
  let usersText = "0 Users";

  if (userFilter && testFilter) {
      // Assuming the data structure includes an array of sessions for this specific case
      // Count the sessions or tests entries
      const sessionsOrTestsCount = data && data[userFilter] && data[userFilter][testFilter] ? data[userFilter][testFilter].length : 0;
      usersText = sessionsOrTestsCount > 0 ? `${sessionsOrTestsCount} Sessions` : "No sessions found";
  } else if (userFilter) {
      // When only a user filter is applied, count the tests for that user
      const testCount = data && data[userFilter] ? Object.keys(data[userFilter]).length : 0;
      usersText = `${testCount} Tests`;
  } else if (testFilter) {
      // When only a test filter is applied, count the users who have taken the test
      const userCount = Object.keys(data).length;
      usersText = `${userCount} Users`;
  } else {
      // When no filters are selected, show the total number of users
      const totalUsers = data.users ? data.users.length : 0;
      usersText = `${totalUsers} Users`;
  }

  document.getElementById('total-users').innerText = usersText;
}

function displayRawData(data) {
  const dataTable = document.getElementById('data-table');
  dataTable.innerHTML = ''; // Clear previous content

  // Create and append the heading
  const heading = document.createElement('p');
  heading.textContent = "Raw Data";
  heading.className = "raw-data-heading"; // Use class for styling
  dataTable.appendChild(heading);

  // Create a div for the scrollable content
  const scrollableDiv = document.createElement('div');
  scrollableDiv.className = "scrollable-content"; // Use class for styling

  // Create the pretty-printed JSON string and append it to the scrollable div
  const prettyData = JSON.stringify(data, null, 2);
  const preElement = document.createElement('pre');
  preElement.textContent = prettyData;
  scrollableDiv.appendChild(preElement);

  // Append the scrollable div to the data-table
  dataTable.appendChild(scrollableDiv);
}

function processChartData(data, userFilter, testFilter) {
    let processedData = [];

    if (!userFilter && !testFilter) {
        // When no filters are selected, use the 'tests' object for counts of different tests
        Object.entries(data.tests).forEach(([testName, count]) => {
            processedData.push({ testName, value: count });
        });
    } else if (userFilter && !testFilter) {
        // When user filter is selected, use the counts of different tests for the user
        Object.entries(data[userFilter]).forEach(([testName, count]) => {
            processedData.push({ testName, value: count });
        });
    } else if (!userFilter && testFilter) {
        // When test filter is selected, aggregate counts of the test for each user
        Object.entries(data).forEach(([userId, sessions]) => {
          processedData.push({ testName: userId, value: sessions.length });
      });
    }
    return processedData;
}

function renderChart(data, userFilter, testFilter) {
  // Obtain the width of the 'tests-card' to set the SVG dimensions
  const cardWidth = document.getElementById('tests-card').clientWidth;
  const margin = {top: 10, right: 20, bottom: 50, left: 20}; // Adjusted margin to fit the title
  const width = cardWidth - margin.left - margin.right;
  const barHeight = 40; // Height of the bar within the SVG
  const height = barHeight + margin.top + margin.bottom; // Total SVG height including margins

  // Remove any existing SVG content
  d3.select("#tests-chart").selectAll("*").remove();

  // Create SVG and append it to the #tests-chart element
  const svg = d3.select("#tests-chart")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Process the data to fit the stacked bar chart format
  let processedData = processChartData(data, userFilter, testFilter);

  // Define the scale for the X axis
  const x = d3.scaleLinear()
      .range([0, width])
      .domain([0, d3.sum(processedData, d => d.value)]);

  // Append the title to the SVG
  let titleText = "Distribution of tests taken by all the users"; // Default title
  if (userFilter && !testFilter) {
      titleText = `Distribution of tests taken by ${userFilter}`;
  } else if (!userFilter && testFilter) {
      titleText = `Distribution of users performing ${testFilter}`;
  }

  svg.append("text")
      .attr("x", (width / 2))             
      .attr("y", 0 - (margin.top / 2) + 20) // Adjust to ensure the title fits without cutting off
      .attr("text-anchor", "middle")  
      .style("font-size", "16px") 
      .style('fill', 'white')
      .text(titleText+ " (hover to see details)");

  // Define the div for the tooltip
  const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);


  // Create the stacked bar by appending 'rect' elements for each segment
  let cumulative = 0;
  svg.selectAll(".segment")
      .data(processedData)
    .enter().append("rect")
      .attr("class", "segment")
      .attr("x", d => {
          let xPosition = cumulative;
          cumulative += x(d.value);
          return xPosition;
      })
      .attr("y", (height - barHeight) / 2)
      .attr("width", d => x(d.value))
      .attr("height", barHeight)
      .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
      .on("mouseover", function(event) {
          // Use the current index to access the data from the processedData array
          const i = svg.selectAll(".segment").nodes().indexOf(this);
          const d = processedData[i];

          // Get the bounding rectangle of the SVG to adjust tooltip positioning
          const svgRect = svg.node().getBoundingClientRect();

          tooltip.transition()
              .duration(200)
              .style("opacity", 0.9);
          tooltip.html(`${d.testName}: ${d.value}`)
              .style("left", (svgRect.left) + "px") // Adjusted for SVG position
              .style("top", (svgRect.top - 20) + "px"); // Adjusted for SVG position
      })
      .on("mouseout", function(d) {
          tooltip.transition()
              .duration(500)
              .style("opacity", 0);
      });

  // Style for the tooltip
  d3.select(".tooltip").style("background-color", "lightsteelblue")
      .style("padding", "6px")
      .style("border-radius", "4px")
      .style("text-align", "center")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("pointer-events", "none"); // Tooltip should not interfere with mouse events
}

async function loadDropdownKeys() {
    try {
        const response = await fetch('/get-all-collections');
        const keys = await response.json();
        const dropdown = document.getElementById('key-dropdown');
        dropdown.innerHTML = '<option value="" disabled selected>Select Collection</option>';

        keys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.text = key;
            dropdown.appendChild(option);
        });

        dropdown.value = 'PROD_PDAPP';
    } catch (error) {
        console.error('Error loading dropdown keys:', error);
    }
}

function loadUsersAndTests() {
    const collectionKeyValue = document.getElementById('key-dropdown').value || "PROD_PDAPP";
  const userFilterValue = document.getElementById('user-filter').value || "";
  const testFilterValue = document.getElementById('test-filter').value || "";

  fetch(`/get-users-tests?user=${userFilterValue}&test=${testFilterValue}&collection-key=${collectionKeyValue}`)
      .then(response => response.json())
      .then(response_data => {
          const plotData = response_data['plot_data'];
          const data = response_data['raw_data'];
          if (!userFilterValue && !testFilterValue) {
              // When no filters are selected, populate both dropdowns
              populateDropdown('user-filter', data.users, 'Filter by User');
              populateDropdown('test-filter', Object.keys(data.tests), 'Filter by Test Name');
          }
          updateTotalUsersText(data, userFilterValue, testFilterValue);
          displayRawData(data);
          renderChart(data, userFilterValue, testFilterValue);
          updateGraphArea(userFilterValue, testFilterValue, plotData);
      })
      .catch(error => console.error('Error fetching users and tests:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    loadDropdownKeys();
    loadUsersAndTests();

    // Add event listeners to dropdowns for filter change
    document.getElementById('key-dropdown').addEventListener('change', loadUsersAndTests);
    document.getElementById('user-filter').addEventListener('change', loadUsersAndTests);
    document.getElementById('test-filter').addEventListener('change', loadUsersAndTests);
});