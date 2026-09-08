// ===== ENERGY EFFICIENCY CHECKER - SCRIPT =====

// ===== DARK/LIGHT MODE TOGGLE =====
const themeToggle = document.getElementById("themeToggle");
const htmlElement = document.documentElement;

// Initialize theme on page load
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.querySelector(".theme-icon").textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    themeToggle.querySelector(".theme-icon").textContent = "🌙";
  }
}

// Toggle theme function
function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  const isDarkMode = document.body.classList.contains("dark-mode");
  const newTheme = isDarkMode ? "dark" : "light";
  const icon = isDarkMode ? "☀️" : "🌙";

  localStorage.setItem("theme", newTheme);
  themeToggle.querySelector(".theme-icon").textContent = icon;
}

// Theme toggle event listener
themeToggle.addEventListener("click", toggleTheme);

// Initialize theme on load
initializeTheme();

// ===== FEATURE MODAL HANDLING =====
const featureModal = document.getElementById("featureModal");
const modalClose = document.getElementById("modalClose");
const featureItems = document.querySelectorAll(".feature-item");

const featureData = {
  analysis: {
    icon: "📊",
    title: "Detailed Analysis",
    description:
      "Our advanced analysis breaks down your building's energy consumption across multiple factors including HVAC system age, building age, energy cost ratios, and size. Each factor receives a detailed score with specific explanations of how it impacts your overall efficiency rating. Click on any breakdown item to see the exact calculation and understand what you can improve.",
  },
  ai: {
    icon: "🤖",
    title: "AI Recommendations",
    description:
      "Powered by advanced AI models through OpenRouter, our system generates 8+ personalized recommendations tailored to your specific building profile. These aren't generic suggestions—they're based on your exact HVAC type, building age, size, and energy costs. Each recommendation includes specific technical details and estimated energy savings percentages to help you prioritize improvements.",
  },
  savings: {
    icon: "💰",
    title: "Savings Estimate",
    description:
      "Get an instant monthly savings estimate based on implementing energy efficiency improvements. Our calculator factors in current energy costs, potential efficiency gains from recommended upgrades, and typical implementation costs. The more recommendations you implement, the greater your potential savings—often 20-30% reductions in monthly energy bills.",
  },
};

function showFeatureModal(feature) {
  const data = featureData[feature];
  if (!data) return;

  document.getElementById("modalIcon").textContent = data.icon;
  document.getElementById("modalTitle").textContent = data.title;
  document.getElementById("modalDescription").textContent = data.description;

  featureModal.classList.add("active");
}

function closeFeatureModal() {
  featureModal.classList.remove("active");
}

// Feature item click handlers
featureItems.forEach((item) => {
  item.addEventListener("click", () => {
    const feature = item.dataset.feature;
    showFeatureModal(feature);
  });
});

// Modal close handlers
modalClose.addEventListener("click", closeFeatureModal);
featureModal.addEventListener("click", (e) => {
  if (e.target === featureModal) {
    closeFeatureModal();
  }
});

// Close modal on ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && featureModal.classList.contains("active")) {
    closeFeatureModal();
  }
});

// Get form elements
const energyForm = document.getElementById("energyForm");
const resultsContainer = document.getElementById("resultsContainer");
const scoreValue = document.getElementById("scoreValue");
const scoreDescription = document.getElementById("scoreDescription");
const recommendationsList = document.getElementById("recommendationsList");
const savingsAmount = document.getElementById("savingsAmount");
const analyzeAgain = document.getElementById("analyzeAgain");
const scoreCircle = document.getElementById("scoreCircle");

// ===== OPENROUTER API CONFIGURATION =====
// IMPORTANT: Replace the API key below with your actual OpenRouter API key
// Get your free API key at: https://openrouter.ai
// ===== FORM SUBMIT EVENT =====
energyForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Show analyzing overlay
  const analyzingOverlay = document.getElementById("analyzingOverlay");
  analyzingOverlay.classList.add("active");

  try {
    // Get input values
    const buildingSize = parseFloat(
      document.getElementById("buildingSize").value,
    );
    const floors = parseFloat(document.getElementById("floors").value);
    const hvacType = document.getElementById("hvacType").value;
    const buildingAge = parseFloat(
      document.getElementById("buildingAge").value,
    );
    const energyBill = parseFloat(document.getElementById("energyBill").value);

    // Calculate score and get breakdown
    const scoreData = calculateScore(
      buildingSize,
      floors,
      hvacType,
      buildingAge,
      energyBill,
    );

    // Get AI-powered recommendations from OpenRouter
    const recommendations = await getAIRecommendations(
      hvacType,
      buildingAge,
      buildingSize,
      energyBill,
      scoreData.score,
    );

    // Calculate estimated savings
    const savings = calculateSavings(scoreData.score, energyBill);

    // Hide analyzing overlay
    analyzingOverlay.classList.remove("active");

    // Display results
    displayResults(scoreData, recommendations, savings);
  } catch (error) {
    console.error("Error during analysis:", error);
    analyzingOverlay.classList.remove("active");
    alert("An error occurred during analysis. Please try again.");
  }
});

// ===== CALCULATE SCORE =====
function calculateScore(
  buildingSize,
  floors,
  hvacType,
  buildingAge,
  energyBill,
) {
  let score = 100;
  const breakdown = [];

  // HVAC system deductions
  let hvacDeduction = 0;
  if (hvacType === "old") {
    hvacDeduction = 30;
    breakdown.push({
      label: "Old HVAC System",
      value: -30,
      explanation:
        "Your HVAC system is over 15 years old, which indicates reduced efficiency compared to modern standards. Older systems typically operate at 70-80% efficiency.",
      calculation:
        "Base efficiency score: 100 points → Old HVAC penalty: -30 points = Lower efficiency rating",
    });
  } else if (hvacType === "mid") {
    hvacDeduction = 15;
    breakdown.push({
      label: "Mid-Age HVAC System",
      value: -15,
      explanation:
        "Your HVAC system is 5-15 years old. While still functional, it operates below the efficiency of modern systems (typically 80-85% efficiency).",
      calculation:
        "Base efficiency score: 100 points → Mid-age HVAC penalty: -15 points = Moderate efficiency rating",
    });
  } else if (hvacType === "modern") {
    hvacDeduction = 0;
    breakdown.push({
      label: "Modern HVAC System",
      value: 0,
      explanation:
        "Your HVAC system is less than 5 years old and operates at modern efficiency standards (SEER2 16+, 90%+ efficiency).",
      calculation:
        "Base efficiency score: 100 points → Modern HVAC bonus: 0 points deducted = Optimal efficiency",
    });
  }
  score -= hvacDeduction;

  // Building age deductions
  let ageDeduction = 0;
  if (buildingAge > 30) {
    ageDeduction = 20;
    breakdown.push({
      label: "Building Age (30+ years)",
      value: -20,
      explanation:
        "Older buildings often have poor insulation, air leakage issues, and outdated envelope design. A 30+ year old building loses significantly more energy than modern construction.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction) +
        " points → Building age penalty: -20 points (due to poor insulation and air infiltration)",
    });
  } else if (buildingAge > 15) {
    ageDeduction = 10;
    breakdown.push({
      label: "Building Age (15-30 years)",
      value: -10,
      explanation:
        "Buildings in this age range typically have moderate insulation and some air leakage. Energy efficiency standards have improved significantly since their construction.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction) +
        " points → Building age penalty: -10 points (due to moderate envelope degradation)",
    });
  } else if (buildingAge > 5) {
    ageDeduction = 5;
    breakdown.push({
      label: "Building Age (5-15 years)",
      value: -5,
      explanation:
        "Your building is relatively modern but still predates the latest energy efficiency standards and materials.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction) +
        " points → Building age penalty: -5 points (minor efficiency gap)",
    });
  } else {
    breakdown.push({
      label: "Building Age (New)",
      value: 0,
      explanation:
        "Your building was constructed with modern energy efficiency standards, likely including current insulation codes and air-sealing practices.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction) +
        " points → Building age bonus: 0 points deducted (new construction standards)",
    });
  }
  score -= ageDeduction;

  // Energy bill vs building size ratio
  const billPerSqft = energyBill / buildingSize;
  let energyDeduction = 0;
  if (billPerSqft > 0.5) {
    energyDeduction = 20;
    breakdown.push({
      label: "High Energy Cost per Sq Ft",
      value: -20,
      explanation:
        "Your energy cost of $" +
        billPerSqft.toFixed(2) +
        " per sq ft is significantly higher than the industry average of $0.15-0.30. This indicates excess energy consumption.",
      calculation:
        "Energy efficiency ratio: $" +
        energyBill +
        " ÷ " +
        buildingSize +
        " sq ft = $" +
        billPerSqft.toFixed(2) +
        "/sq ft → High cost penalty: -20 points",
    });
  } else if (billPerSqft > 0.3) {
    energyDeduction = 10;
    breakdown.push({
      label: "Moderate Energy Cost per Sq Ft",
      value: -10,
      explanation:
        "Your energy cost of $" +
        billPerSqft.toFixed(2) +
        " per sq ft is above the industry average, suggesting room for efficiency improvements.",
      calculation:
        "Energy efficiency ratio: $" +
        energyBill +
        " ÷ " +
        buildingSize +
        " sq ft = $" +
        billPerSqft.toFixed(2) +
        "/sq ft → Moderate cost penalty: -10 points",
    });
  } else if (billPerSqft > 0.15) {
    energyDeduction = 5;
    breakdown.push({
      label: "Average Energy Cost per Sq Ft",
      value: -5,
      explanation:
        "Your energy cost of $" +
        billPerSqft.toFixed(2) +
        " per sq ft is within normal range but has minor optimization potential.",
      calculation:
        "Energy efficiency ratio: $" +
        energyBill +
        " ÷ " +
        buildingSize +
        " sq ft = $" +
        billPerSqft.toFixed(2) +
        "/sq ft → Minor cost penalty: -5 points",
    });
  } else {
    breakdown.push({
      label: "Low Energy Cost per Sq Ft",
      value: 0,
      explanation:
        "Your energy cost of $" +
        billPerSqft.toFixed(2) +
        " per sq ft is excellent and well below the industry average, indicating good energy efficiency.",
      calculation:
        "Energy efficiency ratio: $" +
        energyBill +
        " ÷ " +
        buildingSize +
        " sq ft = $" +
        billPerSqft.toFixed(2) +
        "/sq ft → Excellent efficiency: 0 points deducted",
    });
  }
  score -= energyDeduction;

  // Floors deduction
  let floorsDeduction = 0;
  if (floors > 10) {
    floorsDeduction = 10;
    breakdown.push({
      label: "Building Size (10+ floors)",
      value: -10,
      explanation:
        "Larger buildings (10+ floors) have greater surface area exposure and more complex HVAC distribution systems, leading to higher energy losses.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction - ageDeduction - energyDeduction) +
        " points → Building size penalty: -10 points (due to increased envelope surface area)",
    });
  } else if (floors > 5) {
    floorsDeduction = 5;
    breakdown.push({
      label: "Building Size (5-10 floors)",
      value: -5,
      explanation:
        "Medium-sized buildings (5-10 floors) have increased energy loss through larger envelope area compared to smaller structures.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction - ageDeduction - energyDeduction) +
        " points → Building size penalty: -5 points (moderate envelope surface area)",
    });
  } else {
    breakdown.push({
      label: "Building Size (< 5 floors)",
      value: 0,
      explanation:
        "Smaller buildings (under 5 floors) have less envelope surface area, resulting in lower relative energy losses.",
      calculation:
        "Current score: " +
        (100 - hvacDeduction - ageDeduction - energyDeduction) +
        " points → Building size bonus: 0 points deducted (minimal envelope area)",
    });
  }
  score -= floorsDeduction;

  // Make sure score stays between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    breakdown: breakdown,
  };
}

// ===== GET RECOMMENDATIONS =====
function getRecommendations(hvacType, buildingAge, buildingSize, energyBill) {
  const recommendations = [];

  // HVAC recommendations
  if (hvacType === "old") {
    recommendations.push(
      "Your HVAC system is over 15 years old. Upgrading to a modern, energy-efficient system could reduce your energy consumption by up to 30% and significantly lower your monthly bills.",
    );
  } else if (hvacType === "mid") {
    recommendations.push(
      "Consider scheduling a professional HVAC tune-up and maintenance check. Regular servicing of a mid-age system can improve efficiency by up to 15% and extend its lifespan.",
    );
  }

  // Building age recommendations
  if (buildingAge > 30) {
    recommendations.push(
      "Older buildings often have poor insulation and air leakage issues. Investing in modern insulation, weather stripping, and window upgrades can dramatically reduce heating and cooling costs.",
    );
  } else if (buildingAge > 15) {
    recommendations.push(
      "Consider an energy audit to identify air leaks and insulation gaps in your building. Sealing these gaps is a low-cost improvement that can reduce energy waste by up to 20%.",
    );
  }

  // Energy bill recommendations
  const billPerSqft = energyBill / buildingSize;
  if (billPerSqft > 0.3) {
    recommendations.push(
      "Your energy cost per square foot is higher than average for commercial buildings. Installing smart energy management systems and LED lighting throughout the building could reduce consumption by up to 25%.",
    );
  } else if (billPerSqft > 0.15) {
    recommendations.push(
      "Consider installing occupancy sensors and programmable thermostats to automatically reduce energy usage in unoccupied areas of the building during off-hours.",
    );
  }

  // General recommendations always shown
  recommendations.push(
    "Switching to LED lighting throughout the building is one of the fastest and most cost-effective ways to reduce energy consumption, cutting lighting costs by up to 75% compared to traditional lighting.",
  );

  recommendations.push(
    "Implementing a regular energy monitoring routine — tracking usage weekly or monthly — helps identify unusual spikes early and keeps energy costs under control over time.",
  );

  // Return all recommendations (not limited to 3)
  return recommendations;
}

function buildContextualFallbackRecommendations(
  hvacType,
  buildingAge,
  buildingSize,
  energyBill,
  score,
) {
  const recommendations = [];

  if (hvacType === "old") {
    recommendations.push(
      "💡 Replace or significantly retrofit the aging HVAC system with a high-efficiency unit sized for this building to improve seasonal performance and reduce cooling and heating waste.",
    );
  } else if (hvacType === "mid") {
    recommendations.push(
      "🔧 Tune up and optimize the current HVAC system with variable-speed controls, coil cleaning, and recalibrated controls to improve efficiency without a full replacement.",
    );
  } else {
    recommendations.push(
      "🔧 Keep the modern HVAC system performing at peak efficiency by using smart scheduling, filter replacement, and commissioning checks to avoid unnecessary load cycles.",
    );
  }

  if (buildingAge > 30) {
    recommendations.push(
      "🏗️ Prioritize envelope upgrades such as insulation, air sealing, and window retrofits because an older structure is likely losing significant conditioned air through leaks and weak barriers.",
    );
  } else if (buildingAge > 15) {
    recommendations.push(
      "🏠 Conduct a targeted building envelope audit to identify insulation gaps and air leaks that are driving unnecessary heating and cooling losses in this mid-age structure.",
    );
  } else {
    recommendations.push(
      "🏠 Review recent envelope performance and seal any penetrations, duct joints, and small leaks to prevent avoidable air loss and improve system efficiency.",
    );
  }

  const billPerSqft = energyBill / Math.max(buildingSize, 1);
  if (billPerSqft > 0.35) {
    recommendations.push(
      "📉 Install a building energy management system with submetering and automated setpoints to reduce costly peak demand and optimize usage across this larger utility load.",
    );
  } else if (billPerSqft > 0.2) {
    recommendations.push(
      "📊 Add programmable thermostats and occupancy sensors to reduce unnecessary conditioning in lower-use periods and areas across the building.",
    );
  } else {
    recommendations.push(
      "📊 Use interval energy monitoring and monthly trend reviews to catch small inefficiencies early before they become significant cost drains.",
    );
  }

  if (score < 50) {
    recommendations.push(
      "⚡ Replace outdated lighting with LED fixtures and controls, especially in high-use zones, to immediately reduce electrical demand and improve brightness efficiency.",
    );
  } else {
    recommendations.push(
      "💡 Upgrade remaining non-LED fixtures and install daylight controls where practical to reduce lighting energy use without sacrificing comfort.",
    );
  }

  recommendations.push(
    "🔍 Schedule a professional energy audit tailored to this building profile to identify the highest-impact measures based on the actual operating conditions and utility profile.",
  );

  return recommendations.slice(0, 6);
}

// ===== GET AI-POWERED RECOMMENDATIONS =====
async function getAIRecommendations(
  hvacType,
  buildingAge,
  buildingSize,
  energyBill,
  score,
) {
  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hvacType,
        buildingAge,
        buildingSize,
        energyBill,
        score,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error("Error fetching AI recommendations:", error);
    return buildContextualFallbackRecommendations(
      hvacType,
      buildingAge,
      buildingSize,
      energyBill,
      score,
    );
  }
}

// ===== CALCULATE SAVINGS =====
function calculateSavings(score, energyBill) {
  let savingsPercentage = 0;

  if (score < 30) {
    savingsPercentage = 0.3;
  } else if (score < 50) {
    savingsPercentage = 0.2;
  } else if (score < 70) {
    savingsPercentage = 0.12;
  } else if (score < 85) {
    savingsPercentage = 0.06;
  } else {
    savingsPercentage = 0.02;
  }

  const savings = energyBill * savingsPercentage;
  return savings.toFixed(2);
}

// ===== DISPLAY RESULTS =====
function displayResults(scoreData, recommendations, savings) {
  // Extract score from the scoreData object
  const score = scoreData.score;
  const breakdown = scoreData.breakdown;

  // Set score
  scoreValue.textContent = score;

  // Set score color and description based on score range
  if (score >= 85) {
    scoreCircle.style.background = "linear-gradient(135deg, #28a745, #1e7e34)";
    scoreCircle.style.boxShadow = "0 8px 25px rgba(40, 167, 69, 0.3)";
    scoreDescription.textContent =
      "🌟 Excellent! Your building is highly energy efficient.";
  } else if (score >= 70) {
    scoreCircle.style.background = "linear-gradient(135deg, #5cb85c, #4cae4c)";
    scoreCircle.style.boxShadow = "0 8px 25px rgba(92, 184, 92, 0.3)";
    scoreDescription.textContent =
      "👍 Good! Your building is reasonably efficient with room for improvement.";
  } else if (score >= 50) {
    scoreCircle.style.background = "linear-gradient(135deg, #f0ad4e, #ec971f)";
    scoreCircle.style.boxShadow = "0 8px 25px rgba(240, 173, 78, 0.3)";
    scoreDescription.textContent =
      "⚠️ Average. There are several areas where efficiency can be improved.";
  } else if (score >= 30) {
    scoreCircle.style.background = "linear-gradient(135deg, #e8251a, #b01d13)";
    scoreCircle.style.boxShadow = "0 8px 25px rgba(232, 37, 26, 0.3)";
    scoreDescription.textContent =
      "❌ Poor. Your building has significant energy efficiency issues that need attention.";
  } else {
    scoreCircle.style.background = "linear-gradient(135deg, #c0392b, #922b21)";
    scoreCircle.style.boxShadow = "0 8px 25px rgba(192, 57, 43, 0.3)";
    scoreDescription.textContent =
      "🚨 Critical. Immediate action is strongly recommended to address major energy inefficiencies.";
  }

  // Display score breakdown
  const breakdownList = document.getElementById("breakdownList");
  breakdownList.innerHTML = "";
  breakdown.forEach(function (item, index) {
    const breakdownItem = document.createElement("div");
    breakdownItem.className = "breakdown-item";
    breakdownItem.setAttribute("data-expanded", "false");

    breakdownItem.innerHTML = `
      <div class="breakdown-header">
        <div class="breakdown-info">
          <span class="breakdown-label">${item.label}</span>
          <span class="breakdown-value">${item.value >= 0 ? "+" : ""}${item.value}</span>
        </div>
        <span class="breakdown-toggle">▼</span>
      </div>
      <div class="breakdown-details" style="display: none;">
        <div class="breakdown-explanation">${item.explanation}</div>
        <div class="breakdown-calculation"><strong>Calculation:</strong> ${item.calculation}</div>
      </div>
    `;

    // Add click handler for toggling details
    breakdownItem.addEventListener("click", function (e) {
      if (e.target.closest(".breakdown-header")) {
        const detailsDiv = breakdownItem.querySelector(".breakdown-details");
        const toggle = breakdownItem.querySelector(".breakdown-toggle");
        const isExpanded =
          breakdownItem.getAttribute("data-expanded") === "true";

        if (isExpanded) {
          detailsDiv.style.display = "none";
          breakdownItem.setAttribute("data-expanded", "false");
          toggle.style.transform = "rotate(0deg)";
        } else {
          detailsDiv.style.display = "block";
          breakdownItem.setAttribute("data-expanded", "true");
          toggle.style.transform = "rotate(180deg)";
        }
      }
    });

    breakdownList.appendChild(breakdownItem);
  });

  // Set recommendations
  recommendationsList.innerHTML = "";
  recommendations.forEach(function (rec, index) {
    const li = document.createElement("li");
    li.textContent = rec;
    li.style.animationDelay = `${0.3 + index * 0.1}s`;
    recommendationsList.appendChild(li);
  });

  // Set savings
  savingsAmount.textContent = "$" + savings + " per month";

  // Show results and hide form
  document.querySelector(".form-container").style.display = "none";
  resultsContainer.style.display = "block";

  // Scroll to results
  resultsContainer.scrollIntoView({ behavior: "smooth" });
}

// ===== ANALYZE AGAIN BUTTON =====
analyzeAgain.addEventListener("click", function () {
  // Reset form
  energyForm.reset();

  // Hide results and show form
  resultsContainer.style.display = "none";
  document.querySelector(".form-container").style.display = "block";

  // Reset score circle color
  scoreCircle.style.background = "linear-gradient(135deg, #e8251a, #b01d13)";
  scoreCircle.style.boxShadow = "0 8px 25px rgba(232, 37, 26, 0.3)";

  // Scroll back to top
  window.scrollTo({ top: 0, behavior: "smooth" });
});
