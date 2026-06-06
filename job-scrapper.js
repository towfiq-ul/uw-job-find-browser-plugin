// job-scrapper.js
const UpworkScraper = {
    BASE_URL: 'https://www.upwork.com/nx/search/jobs/',

    /**
     * Build an Upwork search URL with the given query and pagination.
     */
    buildSearchUrl(query, page = 1, perPage = 10) {
        const params = new URLSearchParams({
            q: query,
            page,
            per_page: perPage,
            sort: 'recency'
        });
        return `${this.BASE_URL}?${params.toString()}`;
    },

    /**
     * Fetch a single search results page (includes user cookies).
     */
    async fetchPage(url) {
        const resp = await fetch(url, { credentials: 'include' });
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        return resp.text();
    },

    /**
     * Parse an HTML string and return an array of job objects.
     */
    parseJobsFromHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Primary selector: Upwork's React SSR data-test attributes
        let nodes = doc.querySelectorAll(
            "[data-test='job-tile-list'] li, li[data-test='job-tile-list-item']"
        );
        if (nodes.length === 0) {
            // Fallback: any <li> that contains a link to a job
            const allLi = doc.querySelectorAll('li');
            nodes = Array.from(allLi).filter(li =>
                li.querySelector("a[href*='/jobs/']")
            );
        }

        const jobs = Array.from(nodes)
            .map(node => this.extractJobFromNode(node))
            .filter(job => job !== null);
        return jobs;
    },

    /**
     * Extract a single job object from a DOM node.
     */
    extractJobFromNode(node) {
        // Title & URL
        const titleEl =
            node.querySelector("a[data-test='job-tile-title'], a[href*='/jobs/']") ||
            node.querySelector('h2 a, h3 a');
        if (!titleEl || !titleEl.textContent.trim()) return null;

        const title = titleEl.textContent.trim();
        const href = titleEl.getAttribute('href');
        const url = href.startsWith('http')
            ? href
            : new URL(href, 'https://www.upwork.com').href;

        const text = node.textContent;

        // Payment type
        let paymentType = '';
        if (text.includes('Hourly')) paymentType = 'Hourly';
        else if (text.includes('Fixed Price') || text.includes('Fixed'))
            paymentType = 'Fixed Price';

        // Budget
        const budgetRegex =
            /\$[\d,]+(\.\d{2})?(\s*-\s*\$[\d,]+(\.\d{2})?)?|\$[\d,]+\+/;
        const budgetMatch = text.match(budgetRegex);
        const budget = budgetMatch ? budgetMatch[0] : '';

        // Skill level
        let skillLevel = '';
        if (text.includes('Entry')) skillLevel = 'Entry';
        else if (text.includes('Intermediate')) skillLevel = 'Intermediate';
        else if (text.includes('Expert')) skillLevel = 'Expert';

        // Proposals
        const proposalsMatch = text.match(/Proposals?:\s*(\d+)/i);
        const proposals = proposalsMatch ? parseInt(proposalsMatch[1], 10) : null;

        // Location
        const locationRegex =
            /\b(United States|United Kingdom|Canada|Australia|Germany|France|India|Pakistan|Bangladesh|Philippines|Brazil|Spain|Italy|Netherlands|UAE|Saudi Arabia|Singapore|New Zealand|Poland|Mexico|Turkey|Japan|China|South Korea|South Africa)\b/i;
        const locationMatch = text.match(locationRegex);
        const location = locationMatch ? locationMatch[1] : '';

        // Rating
        const ratingMatch =
            text.match(/(\d\.\d{1,2})\s*\/\s*5/) || text.match(/\b(\d\.\d{1,2})\b/);
        let rating = null;
        if (ratingMatch) {
            const val = parseFloat(ratingMatch[1]);
            if (val >= 0 && val <= 5) rating = val;
        }

        // Time posted
        const postedTextMatch = text.match(
            /(\d+\s+(minute|hour|day|week|month)s?\s+ago)/i
        );
        const postedText = postedTextMatch ? postedTextMatch[0] : '';
        const postTime = this.parseRelativeTime(postedText);

        // Description
        const descEl = node.querySelector(
            "[data-test='job-description-text'], p, .text-body-sm"
        );
        const description = descEl ? descEl.textContent.trim() : '';

        // Skills
        const skillNodes =
            node.querySelectorAll("[data-test='token']") ||
            node.querySelectorAll(
                "a[href*='/o/profiles/skills/'], .o-tag-skill, .up-skill-badge"
            );
        const skills = Array.from(skillNodes)
            .map(s => s.textContent.trim())
            .filter(s => s.length > 0);

        // Job ID from URL
        const idMatch = url.match(/(\d{7,})/);
        const jobId = idMatch ? idMatch[1] : '';

        // Total spent (e.g. "$4,588 spent" or "Total spent $4,588")
        const spentMatch = text.match(
            /\$[\d,]+(\.\d{2})?\s*(spent|total spent)/i
        );
        let totalSpent = null;
        if (spentMatch) {
            const spentNum = parseFloat(spentMatch[0].replace(/[$,]/g, ''));
            if (!isNaN(spentNum)) totalSpent = spentNum;
        }

        // Reviews count (e.g. "(120 reviews)")
        const reviewsMatch = text.match(/\((\d+)\s+reviews?\)/i);
        const clientReviews = reviewsMatch ? parseInt(reviewsMatch[1], 10) : null;

        return {
            id: jobId,
            title,
            description,
            skills,
            tags: [...skills], // reuse skills as tags for filtering
            budget,
            budgetNumeric: this.extractBudgetNumeric(budget, paymentType),
            postTime: postTime || new Date(),
            clientSpending: totalSpent || 0,
            clientRating: rating || 0,
            clientReviews: clientReviews || 0,
            jobType: paymentType,
            url
        };
    },

    /**
     * Convert a budget string like "$200 - $400" to a single number.
     */
    extractBudgetNumeric(budgetStr, paymentType) {
        const numbers = budgetStr.match(/\d[\d,]*/g);
        if (!numbers || numbers.length === 0) return 0;
        const nums = numbers.map(n => parseInt(n.replace(/,/g, ''), 10));
        if (paymentType === 'Hourly') {
            // Use the lower end for hourly
            return nums[0];
        }
        // Fixed price: average if range, else single value
        if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
        return nums[0];
    },

    /**
     * Convert a relative time string ("3 hours ago") to a Date.
     */
    parseRelativeTime(text) {
        if (!text) return new Date();
        const numMatch = text.match(/(\d+)/);
        if (!numMatch) return new Date();
        const num = parseInt(numMatch[1], 10);
        const lower = text.toLowerCase();
        const now = new Date();
        if (lower.includes('minute')) return new Date(now - num * 60000);
        if (lower.includes('hour')) return new Date(now - num * 3600000);
        if (lower.includes('day')) return new Date(now - num * 86400000);
        if (lower.includes('week')) return new Date(now - num * 604800000);
        if (lower.includes('month')) return new Date(now - num * 2592000000);
        return now;
    },

    /**
     * Fetch multiple pages of search results and return all parsed jobs.
     */
    async fetchJobs(query, pages = 3, perPage = 20) {
        const allJobs = [];
        for (let page = 1; page <= pages; page++) {
            const url = this.buildSearchUrl(query, page, perPage);
            try {
                const html = await this.fetchPage(url);
                const jobs = this.parseJobsFromHtml(html);
                allJobs.push(...jobs);
                console.log(`Fetched ${jobs.length} jobs from page ${page}`);
            } catch (err) {
                console.warn(`Page ${page} failed:`, err.message);
            }
        }
        return allJobs;
    }
};