document.addEventListener('DOMContentLoaded', function() {
    const links = {
        'settings-link': 'https://www.roblox.com/my/account?rovalra=info#!/info',
        'github-link': 'https://github.com/4sapp/ufi',
        'github-footer': 'https://github.com/4sapp/ufi'
    };

    function addLinkListener(id, url) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', () => {
                if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.create({ url });
                } else {
                    window.open(url, '_blank');
                }
            });
        }
    }

    for (const id in links) {
        addLinkListener(id, links[id]);
    }
});