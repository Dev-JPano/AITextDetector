document.addEventListener("DOMContentLoaded", () => {
    // -------- UI Elements --------
    const html = document.documentElement;
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const slider = document.getElementById("test-slider");
    const sliderValue = document.getElementById("slider-value");
    const predictBtn = document.getElementById("predict-btn");
    const stopBtn = document.getElementById("stop-btn");
    const textarea = document.getElementById("input-text");
    const copyBtn = document.getElementById("copy-btn");
    const clearBtn = document.getElementById("clear-btn");
    const terminalBody = document.querySelector("#terminal-table tbody");
    const reportBody = document.querySelector("#report-table tbody");
    const finalResult = document.getElementById("final-result");
    const loadingBar = document.getElementById("loading-bar");
    const progressText = document.getElementById("progress-text");
    const disclaimerEl = document.getElementById("disclaimer");

    // Weight Inputs
    const wNB = document.getElementById("w-nb");
    const wLSVM = document.getElementById("w-lsvm");
    const wLR = document.getElementById("w-lr");
    const weightStatus = document.getElementById("weight-status");

    let stopSimulation = false;
    let simulationResults = [];

    const disclaimers = [
        "         Use NB for best, use LSVM for long texts, and use LR for a balanced result. Adjust weights and iterations for optimal performance.",
        "AI detection is probabilistic and may produce false positives.",
        "Results are estimates based on linguistic patterns, not absolute proof.",
        "Machine learning models can misinterpret highly technical human writing.",
        "Note: AI writing styles evolve faster than detection models can update.",
        "This analysis is a guide; human judgment should always be the final step.",
        "High confidence scores do not guarantee 100% accuracy in all contexts.",
        "Linguistic nuances can occasionally trigger false flags for AI content.",
        "Models are trained on limited data; results may vary by topic.",
        "Creative human writing sometimes mimics AI structures, causing errors.",
        "Always cross-reference these results with the context of the writing.",
        "Algorithms look for patterns, but humans look for intent.",
        "Short paragraphs may result in less accurate confidence ratings.",
        "Statistical analysis is a powerful tool, but it is not infallible.",
        "Non-native English writing may sometimes be flagged incorrectly.",
        "Use this data as a starting point for further investigation.",
        "AI-generated text is designed to sound human, complicating detection.",
        "This tool analyzes structure and entropy, not the truth of the text.",
        "No AI detector is currently 100% accurate across all writing styles.",
        "Formal academic writing can sometimes be mistaken for AI-generated text.",
        "Consider the tone and purpose of the text alongside these metrics."
    ];

    // -------- Theme Logic --------
    const savedTheme = localStorage.getItem("theme") || "light";
    html.setAttribute("data-theme", savedTheme);
    themeIcon.textContent = savedTheme === "light" ? "🌞" : "🌙";

    themeToggle.addEventListener("click", () => {
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        html.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        themeIcon.textContent = newTheme === "light" ? "🌞" : "🌙";
    });

    // -------- Weight Validation (Integer Only) --------
    function validateWeights() {
        const valNB = parseInt(wNB.value, 10) || 0;
        const valLSVM = parseInt(wLSVM.value, 10) || 0;
        const valLR = parseInt(wLR.value, 10) || 0;
        const total = valNB + valLSVM + valLR;

        if (total === 100) {
            weightStatus.className = "status-indicator status-success";
            weightStatus.textContent = "✅ 100%";
            predictBtn.disabled = false;
        } else {
            weightStatus.className = "status-indicator status-error";
            weightStatus.textContent = `❌ ${total}%`;
            predictBtn.disabled = true;
        }
    }

    [wNB, wLSVM, wLR].forEach(input => input.addEventListener("input", validateWeights));

    // -------- Helpers --------
    slider.addEventListener("input", () => { sliderValue.textContent = slider.value; });

    copyBtn.addEventListener("click", () => {
        if (!textarea.value) return;
        navigator.clipboard.writeText(textarea.value);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = "✅ Copied!";
        setTimeout(() => copyBtn.innerHTML = originalText, 2000);
    });

    clearBtn.addEventListener("click", () => {
        textarea.value = "";
        resetUI();
    });

    function resetUI() {
        terminalBody.innerHTML = "";
        reportBody.innerHTML = "";
        finalResult.textContent = "Awaiting Input...";
        finalResult.style.color = "var(--text-muted)";
        loadingBar.style.transition = "none";
        loadingBar.style.width = "0%";
        void loadingBar.offsetWidth;
        loadingBar.style.transition = "width 0.1s linear";
        progressText.textContent = "Ready to analyze";
    }

    // -------- The Math Engine --------
    const calculateWeighted = (nb, lsvm, lr) => {
        const fNB = (parseInt(wNB.value, 10) || 0) / 100;
        const fLSVM = (parseInt(wLSVM.value, 10) || 0) / 100;
        const fLR = (parseInt(wLR.value, 10) || 0) / 100;
        return (nb * fNB + lsvm * fLSVM + lr * fLR);
    };

    const getVerdict = (cr) => {
        let percent = 0;
        let label = "";
        if (cr <= 0.50) {
            label = "Human Content";
            percent = ((0.50 - cr) / 0.50) * 100;
        } else {
            label = "AI Content";
            percent = ((cr - 0.51) / 0.49) * 100;
        }
        return { label, percent: Math.max(0, Math.min(100, percent)).toFixed(1) };
    };

    function addTerminalRow(counter, nb, lsvm, lr) {
        const row = document.createElement("tr");
        const cr = calculateWeighted(nb, lsvm, lr);
        const verdict = getVerdict(cr);
        const color = cr > 0.50 ? "var(--danger)" : "var(--accent)";

        row.innerHTML = `
            <td>${counter}</td>
            <td>${(nb * 100).toFixed(1)}%</td>
            <td>${(lsvm * 100).toFixed(1)}%</td>
            <td>${(lr * 100).toFixed(1)}%</td>
            <td style="color:${color}; font-weight:600;">${verdict.percent}% (${verdict.label.split(' ')[0]})</td>
        `;
        terminalBody.appendChild(row);
        const container = document.querySelector('.terminal-container');
        container.scrollTop = container.scrollHeight;
        simulationResults.push({ nb, lsvm, lr, cr });
    }

    function updateSummary() {
        if (simulationResults.length === 0) return;

        // Calculate averages from all iterations
        const avgNB = simulationResults.reduce((s, r) => s + r.nb, 0) / simulationResults.length;
        const avgLSVM = simulationResults.reduce((s, r) => s + r.lsvm, 0) / simulationResults.length;
        const avgLR = simulationResults.reduce((s, r) => s + r.lr, 0) / simulationResults.length;

        const finalCr = calculateWeighted(avgNB, avgLSVM, avgLR);
        const verdict = getVerdict(finalCr);

        // UI Updates for Final Result
        finalResult.textContent = `${verdict.label} (${verdict.percent}%)`;
        finalResult.style.color = finalCr > 0.50 ? "var(--danger)" : "var(--accent)";

        // Get current integer weights from inputs
        const valNB = parseInt(wNB.value, 10) || 0;
        const valLSVM = parseInt(wLSVM.value, 10) || 0;
        const valLR = parseInt(wLR.value, 10) || 0;

        // CRITICAL FIX: Explicitly write all 3 rows into the table
        reportBody.innerHTML = `
            <tr>
                <td>Naive Bayes</td>
                <td>${valNB}%</td>
                <td>${avgNB.toFixed(3)}</td>
                <td>${(avgNB * valNB).toFixed(1)}%</td>
            </tr>
            <tr>
                <td>Linear SVM</td>
                <td>${valLSVM}%</td>
                <td>${avgLSVM.toFixed(3)}</td>
                <td>${(avgLSVM * valLSVM).toFixed(1)}%</td>
            </tr>
            <tr>
                <td>Logistic Regression</td>
                <td>${valLR}%</td>
                <td>${avgLR.toFixed(3)}</td>
                <td>${(avgLR * valLR).toFixed(1)}%</td>
            </tr>
        `;
    }

    // -------- Main Analysis Loop --------
    async function startAnalysis() {
        if (!textarea.value.trim()) return alert("Please paste text first.");
        if (textarea.value.trim().length < 20) {
            alert("Please enter a full sentence. Short phrases provide too little data for accurate detection.");
            return;
        }
        
        resetUI();
        disclaimerEl.textContent = disclaimers[Math.floor(Math.random() * disclaimers.length)];
        stopSimulation = false;
        predictBtn.disabled = true;
        predictBtn.textContent = "Analyzing...";
        simulationResults = [];

        const iterations = parseInt(slider.value);
        for (let i = 1; i <= iterations; i++) {
            if (stopSimulation) break;
            try {
                const response = await fetch("/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: textarea.value })
                });
                const data = await response.json();
                addTerminalRow(i, data.nb, data.lsvm, data.lr);
                loadingBar.style.width = `${(i / iterations) * 100}%`;
                progressText.textContent = `Processing: ${i} / ${iterations}`;
            } catch (err) {
                console.error(err);
                break;
            }
        }
        updateSummary();
        predictBtn.disabled = false;
        predictBtn.textContent = "Predict Analysis";
        if (!stopSimulation) progressText.textContent = "Analysis Complete";
    }

    predictBtn.addEventListener("click", startAnalysis);
    stopBtn.addEventListener("click", () => {
        stopSimulation = true;
        progressText.textContent = "Halted";
        predictBtn.disabled = false;
        predictBtn.textContent = "Predict Analysis";
    });

    validateWeights(); // Run once on load
});
