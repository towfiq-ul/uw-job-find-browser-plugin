let allJobs = [];
let filteredJobs = [];
let displayedJobs = [];
let currentPage = 0;
const PAGE_SIZE = 10;
let isLoadingMore = false;
let hasMore = true;

// New function: fetch jobs from Upwork based on current filters
async function fetchRealJobs() {
    try {
        // Build query from filter inputs
        let query = '';
        const skills = skillsFilter.value.trim();
        const title = titleFilter.value.trim();

        if (skills) {
            query += skills.replaceAll(',', ' '); // comma to space
        }
        if (title) {
            query = query ? `${query} ${title}` : title;
        }
        if (!query) {
            // Default broad query to get some results
            query = 'developer';
        }

        // Show loading state
        jobsContainer.innerHTML =
            '<div class="loading">Fetching live jobs from Upwork…</div>';
        jobCountSpan.textContent = 'Searching…';

        const freshJobs = await UpworkScraper.fetchJobs(query, 5, 10);
        console.log(`Total fetched: ${freshJobs.length} jobs`);

        if (freshJobs.length === 0) {
            jobsContainer.innerHTML =
                '<div class="no-results">No jobs found for your search. Try different keywords.</div>';
            return [];
        }

        return freshJobs;
    } catch (err) {
        console.error('Failed to fetch jobs:', err);
        jobsContainer.innerHTML =
            '<div class="loading">⚠️ Could not connect to Upwork. Please check your connection and try again.</div>';
        return null;
    }
}

// DOM Elements
const jobsContainer = document.getElementById('jobsContainer');
const loadingMoreDiv = document.getElementById('loadingMore');
const jobCountSpan = document.getElementById('jobCount');
const toggleFilterBtn = document.getElementById('toggleFilterBtn');
const filterPanel = document.getElementById('filterPanel');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearUserSkillsBtn = document.getElementById('clearUserSkillsBtn');
const refreshJobsBtn = document.getElementById('refreshJobsBtn');
const skillsFilter = document.getElementById('skillsFilter');
const titleFilter = document.getElementById('titleFilter');
const tagsFilter = document.getElementById('tagsFilter');
const timeFilter = document.getElementById('timeFilter');
const customDateRange = document.getElementById('customDateRange');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const userSkillsTextarea = document.getElementById('userSkills');
const saveUserSkillsBtn = document.getElementById('saveUserSkillsBtn');
const commonInstructions = document.getElementById('commonInstructions');
const saveInstructionsBtn = document.getElementById('saveInstructionsBtn');
const clearInstructionsBtn = document.getElementById('clearInstructionsBtn');
const proposalModal = document.getElementById('proposalModal');
const proposalText = document.getElementById('proposalText');
const copyProposalBtn = document.getElementById('copyProposalBtn');
const closeModalSpan = document.querySelector('.close-modal');
const jobsTabBtn = document.getElementById('jobsTabBtn');
const settingsTabBtn = document.getElementById('settingsTabBtn');
const jobsTab = document.getElementById('jobsTab');
const settingsTab = document.getElementById('settingsTab');

// ==================== STORAGE ====================
async function saveToStorage(key, value) {
    return new Promise(resolve => chrome.storage.sync.set({[key]: value}, resolve));
}

async function getFromStorage(key, defaultValue) {
    return new Promise(resolve => chrome.storage.sync.get([key], result => resolve(result[key] === undefined ? defaultValue : result[key])));
}

// ==================== PERSIST FILTERS ====================
async function saveFilterState() {
    const filterState = {
        skills: skillsFilter.value,
        title: titleFilter.value,
        tags: tagsFilter.value,
        timeValue: timeFilter.value,
        startDate: startDate.value,
        endDate: endDate.value,
        filterPanelVisible: !filterPanel.classList.contains('hidden')
    };
    await saveToStorage('filterState', filterState);
}

async function loadFilterState() {
    const saved = await getFromStorage('filterState', null);
    if (saved) {
        skillsFilter.value = saved.skills || '';
        titleFilter.value = saved.title || '';
        tagsFilter.value = saved.tags || '';
        timeFilter.value = saved.timeValue || 'all';
        startDate.value = saved.startDate || '';
        endDate.value = saved.endDate || '';
        if (saved.filterPanelVisible === false) {
            filterPanel.classList.add('hidden');
            toggleFilterBtn.textContent = '🔍 Show Filters';
        } else {
            filterPanel.classList.remove('hidden');
            toggleFilterBtn.textContent = '🔽 Hide Filters';
        }
        if (timeFilter.value === 'custom') customDateRange.style.display = 'flex';
        else customDateRange.style.display = 'none';
        await applyFiltersAndResetPagination();
    }
}

// ==================== FILTER LOGIC ====================
function isWithinTimeRange(jobPostTime, filterValue, customStart, customEnd) {
    const now = Date.now();
    const postTime = new Date(jobPostTime);
    switch (filterValue) {
        case '1h':
            return postTime >= new Date(now - 60 * 60 * 1000);
        case '24h':
            return postTime >= new Date(now - 24 * 60 * 60 * 1000);
        case '7d':
            return postTime >= new Date(now - 7 * 24 * 60 * 60 * 1000);
        case '30d':
            return postTime >= new Date(now - 30 * 24 * 60 * 60 * 1000);
        case 'custom':
            if (customStart && customEnd) {
                const start = new Date(customStart);
                const end = new Date(customEnd);
                end.setHours(23, 59, 59);
                return postTime >= start && postTime <= end;
            }
            return true;
        default:
            return true;
    }
}

function filterJobs(jobs) {
    const skillsArr = skillsFilter.value.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
    const title = titleFilter.value.trim().toLowerCase();
    const tagsArr = tagsFilter.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    const timeValue = timeFilter.value;
    const customStart = startDate.value;
    const customEnd = endDate.value;

    return jobs.filter(job => {
        if (skillsArr.length && !skillsArr.some(s => job.skills.some(js => js.toLowerCase().includes(s)))) return false;
        if (title && !job.title.toLowerCase().includes(title)) return false;
        if (tagsArr.length && !tagsArr.some(t => job.tags.some(jt => jt.toLowerCase().includes(t)))) return false;

        return isWithinTimeRange(job.postTime, timeValue, customStart, customEnd);

    });
}

// ==================== RECOMMENDATION SCORE ====================
function calculateRecommendationScore(job, userSkillsArray) {
    let score = 0;
    if (userSkillsArray.length) {
        const matchCount = job.skills.filter(s => userSkillsArray.some(us => s.toLowerCase().includes(us.toLowerCase()) || us.toLowerCase().includes(s.toLowerCase()))).length;
        score += (matchCount / Math.max(job.skills.length, 1)) * 40;
    } else score += 10;
    if (userSkillsArray.some(s => job.title.toLowerCase().includes(s.toLowerCase()))) score += 15;
    const maxBudget = Math.max(...allJobs.map(j => j.budgetNumeric), 10000);
    score += (job.budgetNumeric / maxBudget) * 20;
    const maxSpending = Math.max(...allJobs.map(j => j.clientSpending), 300000);
    score += (job.clientSpending / maxSpending) * 10;
    score += (job.clientRating / 5) * 10;
    const ageHours = (Date.now() - new Date(job.postTime)) / (1000 * 3600);
    score += Math.max(0, 5 - (ageHours / 48) * 5);
    return Math.min(100, Math.round(score));
}

function getRecommendationLabel(score) {
    if (score >= 80) return '🔥 Top Match';
    if (score >= 65) return '⭐ Strong Match';
    if (score >= 50) return '👍 Good Match';
    return '📌 Potential Match';
}

// ==================== INFINITE SCROLL RENDERING ====================
async function applyFiltersAndResetPagination() {
    const userSkills = (await getFromStorage('userSkills', '')).split(',').map(s => s.trim()).filter(s => s);
    filteredJobs = filterJobs(allJobs);
    // Add scores
    filteredJobs = filteredJobs.map(job => ({
        ...job,
        recommendationScore: calculateRecommendationScore(job, userSkills)
    }));
    filteredJobs.sort((a, b) => b.recommendationScore - a.recommendationScore);
    filteredJobs.forEach(job => {
        job.recommendationLabel = getRecommendationLabel(job.recommendationScore);
    });

    currentPage = 0;
    displayedJobs = [];
    hasMore = filteredJobs.length > PAGE_SIZE;
    jobsContainer.innerHTML = '';
    await loadMoreJobs();
    jobCountSpan.textContent = `${filteredJobs.length} jobs`;
    await saveFilterState();
}

async function loadMoreJobs() {
    if (isLoadingMore) return;
    if (!hasMore && currentPage > 0) return;
    isLoadingMore = true;
    loadingMoreDiv.classList.remove('hidden');

    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const newJobs = filteredJobs.slice(start, end);
    if (newJobs.length === 0) {
        hasMore = false;
        loadingMoreDiv.classList.add('hidden');
        isLoadingMore = false;
        return;
    }
    displayedJobs.push(...newJobs);
    currentPage++;
    hasMore = end < filteredJobs.length;
    renderJobsToContainer(displayedJobs);
    loadingMoreDiv.classList.add('hidden');
    isLoadingMore = false;
}

function renderJobsToContainer(jobs) {
    if (filteredJobs.length === 0) {
        jobsContainer.innerHTML = '<div class="no-results">No jobs match your filters. Try adjusting criteria.</div>';
        jobCountSpan.textContent = '0 jobs';
        return;
    }
    // Append new jobs (not replace)
    const fragment = document.createDocumentFragment();
    jobs.slice(-PAGE_SIZE).forEach(job => {
        const jobCard = createJobCard(job);
        fragment.appendChild(jobCard);
    });
    jobsContainer.appendChild(fragment);
}

function createJobCard(job) {
    const div = document.createElement('div');
    div.className = 'job-card';
    div.dataset.jobId = job.id;
    div.innerHTML = `
    <div class="job-title">
      <a href="${job.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.title)}</a>
      <span class="recommendation-badge ${badgeClass}">${job.recommendationLabel}</span>
    </div>
    <div class="job-description">${escapeHtml(job.description.substring(0, 150))}${job.description.length > 150 ? '...' : ''}</div>
    <div class="job-meta">
      <span>💰 ${job.budget}</span>
      <span>⭐ ${job.clientRating} (${job.clientReviews} reviews)</span>
      <span>💼 Client spent: $${job.clientSpending.toLocaleString()}</span>
      <span>🕒 ${formatTimeAgo(job.postTime)}</span>
      <span>📋 ${job.jobType}</span>
    </div>
    <div class="skills-list">
      ${job.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
    </div>
    <button class="generate-proposal-btn" data-job-id="${job.id}">📝 Generate Proposal</button>
  `;
    const btn = div.querySelector('.generate-proposal-btn');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        generateAndShowProposal(job);
    });
    return div;
}

function formatTimeAgo(date) {
    const diffMs = Date.now() - new Date(date);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== PROPOSAL GENERATION ====================
async function generateAndShowProposal(job) {
    const instructions = await getFromStorage('commonInstructions', '');
    const userSkills = await getFromStorage('userSkills', '');
    proposalText.textContent = `Dear Client,\n\nI am excited about your project: "${job.title}".\n\n${job.description.substring(0, 300)}...\n\nMy expertise includes: ${userSkills || "relevant skills"}. I have successfully delivered similar projects.\n\nBudget: ${job.budget}\nTimeline: 2-4 weeks\n\n${instructions}\n\nBest regards,\n[Your Name]`;
    proposalModal.style.display = 'block';
}

// ==================== EVENT LISTENERS & INIT ====================
function setupInfiniteScroll() {
    const scrollContainer = document.querySelector('.jobs-container');
    if (!scrollContainer) return;
    scrollContainer.addEventListener('scroll', () => {
        const {scrollTop, scrollHeight, clientHeight} = scrollContainer;
        if (scrollTop + clientHeight >= scrollHeight * 0.8 && !isLoadingMore && hasMore) {
            loadMoreJobs();
        }
    });
}

async function adjustPopupWidth() {
    const currentWin = await chrome.windows.getCurrent();
    const parentWin = await chrome.windows.getLastFocused({windowTypes: ['normal']});
    if (parentWin && parentWin.id !== currentWin.id) {
        const targetWidth = Math.round(parentWin.width * 0.15);
        const newWidth = Math.min(800, Math.max(400, targetWidth));
        await chrome.windows.update(currentWin.id, {width: newWidth});
    }
}

// Call once when popup opens
adjustPopupWidth();

async function init() {
    allJobs = []; // start empty

    // Load user preferences
    userSkillsTextarea.value = await getFromStorage('userSkills', 'Java, Php, Python, Go');
    commonInstructions.value = await getFromStorage('commonInstructions', 'I am an experienced developer with a strong track record.');
    // Load filters
    await loadFilterState();

    // Tab switching
    jobsTabBtn.addEventListener('click', () => {
        jobsTabBtn.classList.add('active');
        settingsTabBtn.classList.remove('active');
        jobsTab.classList.add('active');
        settingsTab.classList.remove('active');
    });
    settingsTabBtn.addEventListener('click', () => {
        settingsTabBtn.classList.add('active');
        jobsTabBtn.classList.remove('active');
        settingsTab.classList.add('active');
        jobsTab.classList.remove('active');
    });

    toggleFilterBtn.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
        toggleFilterBtn.textContent = filterPanel.classList.contains('hidden') ? '🔍 Show Filters' : '🔽 Hide Filters';
        saveFilterState();
    });
    timeFilter.addEventListener('change', () => {
        customDateRange.style.display = timeFilter.value === 'custom' ? 'flex' : 'none';
        saveFilterState();
    });
    saveInstructionsBtn.addEventListener('click', async () => {
        await saveToStorage('commonInstructions', commonInstructions.value);
        alert('Instructions saved!');
    });
    clearInstructionsBtn.addEventListener('click', async () => {
        commonInstructions.value = '';
        await saveToStorage('commonInstructions', '');
        alert('Instructions cleared');
    });

    // Modal close
    closeModalSpan.onclick = () => proposalModal.style.display = 'none';
    globalThis.onclick = (e) => {
        if (e.target === proposalModal) proposalModal.style.display = 'none';
    };
    copyProposalBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(proposalText.textContent);
        alert('Copied!');
    });

    // Refresh button now triggers real fetch
    refreshJobsBtn.addEventListener('click', async () => {
        const jobs = await fetchRealJobs();
        if (jobs) {
            allJobs = jobs;
            await applyFiltersAndResetPagination();
        }
    });

    // Apply filters button does the same
    applyFiltersBtn.addEventListener('click', async () => {
        const jobs = await fetchRealJobs();
        if (jobs) {
            allJobs = jobs;
            await applyFiltersAndResetPagination();
        }
    });

    // Settings save also triggers re‑fetch (optional)
    saveUserSkillsBtn.addEventListener('click', async () => {
        await saveToStorage('userSkills', userSkillsTextarea.value);
        alert('Skills saved');
        // Refresh with new skills as query
        const jobs = await fetchRealJobs();
        if (jobs) {
            allJobs = jobs;
            await applyFiltersAndResetPagination();
        }
    });

    clearUserSkillsBtn.addEventListener('click', async () => {
        userSkillsTextarea.value = '';
        await saveToStorage('userSkills', '');
        await applyFiltersAndResetPagination();
        alert('Skills cleared');
    });

    // Initial fetch
    const initialJobs = await fetchRealJobs();
    if (initialJobs) {
        allJobs = initialJobs;
        await applyFiltersAndResetPagination();
    }

    setupInfiniteScroll();
    await applyFiltersAndResetPagination();
}

init();