// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_UPWORK_JOBS') {
        const {url} = message;

        fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            credentials: 'include', // use your Upwork session cookies
        })
            .then(resp => resp.text())
            .then(html => sendResponse({success: true, html}))
            .catch(err => sendResponse({success: false, error: err.message}));

        return true; // indicates async sendResponse
    }
});