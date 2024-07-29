// ==UserScript==
// @name         flickr photostream dl js part
// @version      1.0.0
// @description  download all ids on a flickr photostream page to a json
// @author       Mjokfox
// @match        https://www.flickr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=flickr.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Add a floating button to the webpage
    const button = document.createElement('button');
    button.innerHTML = 'Extract IDs';
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = 1000;
    button.style.backgroundColor = '#007BFF';
    button.style.color = '#FFF';
    button.style.cursor = 'pointer';
    document.body.appendChild(button);

    button.addEventListener('click', extractAndDownloadIds);

    function extractAndDownloadIds() {
        let links = document.querySelectorAll('a.overlay'); // Adjust the selector to your needs
        let ids = [];

        links.forEach(link => {
            let href = link.getAttribute('href');
            if (href) {
                let parts = href.split('/');
                if (parts.length >= 4) {
                    let userId = parts[2];
                    let imageId = parts[3];
                    ids.push({ userId, imageId});
                }
            }
        });

        downloadJSON(ids, 'extracted_ids.json');
    }

    function downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
})();