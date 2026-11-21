/**
 * Main Interactive JS for FDE Learning Portal
 */

// Toast notification helper
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const bgClass = type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";
    
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all transform duration-300 opacity-0 translate-y-2 ${bgClass}`;
    toast.innerHTML = `
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}"></path>
        </svg>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    setTimeout(() => {
        toast.classList.remove("opacity-0", "translate-y-2");
        toast.classList.add("opacity-100", "translate-y-0");
    }, 10);

    // Auto dismiss
    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-2");
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Copy text to clipboard
function copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard!");
        if (buttonElement) {
            const originalText = buttonElement.innerHTML;
            buttonElement.innerHTML = `
                <svg class="w-4 h-4 inline mr-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg> Copied!
            `;
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error("Failed to copy", err);
        showToast("Could not copy text", "error");
    });
}

// Toggle day completion status
async function toggleDayProgress(dayNum, event) {
    if (event) event.stopPropagation();

    try {
        const response = await fetch("/api/progress/toggle_day", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day: dayNum })
        });

        const data = await response.json();
        if (data.success) {
            // Update UI elements across the page
            const checkIcon = document.getElementById(`day-check-${dayNum}`);
            const dayCard = document.getElementById(`day-card-${dayNum}`);
            
            if (checkIcon) {
                if (data.completed) {
                    checkIcon.classList.remove("opacity-0");
                    checkIcon.classList.add("opacity-100");
                } else {
                    checkIcon.classList.remove("opacity-100");
                    checkIcon.classList.add("opacity-0");
                }
            }

            if (dayCard) {
                if (data.completed) {
                    dayCard.classList.add("border-emerald-500/40", "bg-emerald-950/10");
                } else {
                    dayCard.classList.remove("border-emerald-500/40", "bg-emerald-950/10");
                }
            }

            // Update global metrics header
            updateGlobalMetrics(data.metrics);
            showToast(`Day ${dayNum} marked as ${data.completed ? 'completed' : 'in progress'}!`);
        }
    } catch (err) {
        console.error("Error toggling day", err);
        showToast("Failed to update status", "error");
    }
}

// Update topic status
async function updateTopicStatus(topicId, status) {
    try {
        const response = await fetch("/api/progress/set_topic_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic_id: topicId, status: status })
        });
        const data = await response.json();
        if (data.success) {
            updateGlobalMetrics(data.metrics);
            showToast(`Topic ${topicId} marked as ${status.replace('_', ' ')}!`);
        }
    } catch (err) {
        console.error("Error updating topic status", err);
        showToast("Failed to update topic status", "error");
    }
}

// Save day notes
async function saveDayNotes(dayNum) {
    const textarea = document.getElementById(`day-notes-${dayNum}`);
    if (!textarea) return;

    const notes = textarea.value;
    try {
        const response = await fetch("/api/progress/save_day_notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day: dayNum, notes: notes })
        });
        const data = await response.json();
        if (data.success) {
            showToast(`Notes for Day ${dayNum} saved!`);
        }
    } catch (err) {
        console.error("Error saving notes", err);
        showToast("Failed to save notes", "error");
    }
}

// Update header and progress indicators
function updateGlobalMetrics(metrics) {
    if (!metrics) return;

    // Days progress bar and text
    const daysBar = document.getElementById("header-days-bar");
    const daysPercentText = document.getElementById("header-days-percent");
    const daysCountText = document.getElementById("header-days-count");

    if (daysBar) daysBar.style.width = `${metrics.days_percent}%`;
    if (daysPercentText) daysPercentText.innerText = `${metrics.days_percent}%`;
    if (daysCountText) daysCountText.innerText = `${metrics.completed_days}/${metrics.total_days} Days`;

    // Topics progress
    const topicsBar = document.getElementById("header-topics-bar");
    const topicsCountText = document.getElementById("header-topics-count");
    if (topicsBar) topicsBar.style.width = `${metrics.topics_percent}%`;
    if (topicsCountText) topicsCountText.innerText = `${metrics.completed_topics}/${metrics.total_topics} Topics`;
}

// Run KQL Simulation
async function runKqlSimulation(queryId) {
    const resultsContainer = document.getElementById("kql-results-container");
    const resultsTable = document.getElementById("kql-results-table");
    const statusText = document.getElementById("kql-status-text");

    if (!resultsContainer || !resultsTable) return;

    statusText.innerText = "Executing query against mock Log Analytics ingestion...";
    resultsContainer.classList.remove("hidden");

    try {
        const response = await fetch("/api/kql/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query_id: queryId })
        });

        const data = await response.json();
        if (data.success) {
            statusText.innerHTML = `<span class="text-emerald-400 font-semibold">✓ Query executed successfully!</span> Found <strong>${data.count}</strong> correlated event(s) in <code>${data.table}</code>.`;

            // Build dynamic table headers
            let headerHtml = "<tr>";
            data.columns.forEach(col => {
                headerHtml += `<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900 border-b border-gray-800">${col}</th>`;
            });
            headerHtml += "</tr>";

            // Build dynamic table rows
            let rowsHtml = "";
            data.rows.forEach((row, idx) => {
                const bg = idx % 2 === 0 ? "bg-gray-800/40" : "bg-gray-900/40";
                rowsHtml += `<tr class="${bg} hover:bg-gray-700/50 transition">`;
                data.columns.forEach(col => {
                    let val = row[col];
                    let badge = "";
                    if (col === "AlertSeverity" || col === "Result") {
                        const color = val === "Critical" || val === "High" ? "bg-rose-900/60 text-rose-300 border-rose-700" : "bg-emerald-900/60 text-emerald-300 border-emerald-700";
                        badge = `<span class="px-2 py-0.5 text-xs rounded border ${color}">${val}</span>`;
                        rowsHtml += `<td class="px-4 py-3 text-sm">${badge}</td>`;
                    } else {
                        rowsHtml += `<td class="px-4 py-3 text-sm text-gray-300 font-mono text-xs break-all">${val}</td>`;
                    }
                });
                rowsHtml += "</tr>";
            });

            resultsTable.innerHTML = `<thead class="bg-gray-900">${headerHtml}</thead><tbody>${rowsHtml}</tbody>`;
            showToast("KQL query executed against mock logs!");
        }
    } catch (err) {
        console.error("Error executing KQL", err);
        statusText.innerHTML = `<span class="text-rose-400">Error executing query simulation</span>`;
        showToast("Error running query", "error");
    }
}
