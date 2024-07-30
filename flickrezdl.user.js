// ==UserScript==
// @name         flickr easy download
// @version      1.0.3
// @description  download the highest resolution image on flickr with just one click!
// @author       Mjokfox
// @license      GPLv3
// @match        https://www.flickr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=flickr.com
// @grant        none
// @inject-into  content
// ==/UserScript==

(function() {
    'use strict';

    // Function to fetch HTML content
    async function fetchHtml(url) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            console.error(`Error fetching the HTML page for ${url}: ${error}`);
            return null;
        }
    }

    // Function to find the image URL from HTML content
    function findImageUrl(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const element = doc.querySelector('div#allsizes-photo img'); // child of div.allsizes-photo with type <img>
        return element ? element.src : null;
    }

    // Function to find the largest resolution image URL
    async function findLargestResolution(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const smallElements = doc.querySelectorAll('small');
        let maxResolution = 0;
        let largesti = 0;
        let maxHref = null;

        // instead of doing arithmatic, exploit the standard page layout
        if (smallElements[0].textContent == "(75 × 75)") {
            largesti = smallElements.length - 1;
        } else {
            largesti = 0;
        }

        // find the next page url to the largest image
        const parent = smallElements[largesti].parentElement;
        if (parent) {
            const link = parent.querySelector(':scope > a'); // single layer depth
            maxHref = link ? link.href : null; // if there is no <a> element, we are already on the largest size page
        }
        if (smallElements[largesti].textContent == "(All sizes of this photo are available for download under a Creative Commons license)") {
            return maxHref // stupid edge case
        }
        if (maxHref) { // If it's not null, fetch the HTML for the larger image
            html = await fetchHtml(maxHref);
            return findImageUrl(html);
        }
        return findImageUrl(html);
    }

    // download the image
    function downloadImage(url) {
        fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const burl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = burl;
            a.download = url.split('/').pop();;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch((error) => console.error(`Failed to download image for: ${url}: ${error}`));
    }

    // remove everything after /in/ because that can sometimes be in the url
    function stripAfterIn(url) {
        var index = url.indexOf("/in/");
        if (index !== -1) {
            return url.substring(0, index);
        }
        return url;
    }

    // main function
    async function downloadLargestFlickrImage(element) {
        let pageUrl = "";
        if (element.type != "click"){pageUrl = element.parentElement.parentElement.querySelector('a').href;}
        else{pageUrl = window.location.href;}
        if (!pageUrl){console.error("url not found"); return}
        pageUrl = stripAfterIn(pageUrl);

        // add "sizes" to the url
        if (!pageUrl.includes("sizes")) {
                pageUrl += pageUrl.endsWith("/") ? "sizes/" : "/sizes/"
        }
        const html = await fetchHtml(pageUrl);
        if (html) {
            const imageUrl = await findLargestResolution(html);
            if (imageUrl) {
                downloadImage(imageUrl);
            } else {
                console.error('Failed to find the image URL.');
            }
        } else {
            console.error('Failed to download the HTML page.');
        }
    }

    // Add a global floating button so it can be added and removed without querying
    const button = document.createElement('button');
        button.innerHTML = 'Download Image';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.height = "32px";
        button.style.fontFamily = "Proxima Nova,helvetica neue,helvetica,arial,sans-serif";
        button.style.fontWeight = "600";
        button.style.padding = '0px 20px';
        button.style.zIndex = '1000';
        button.style.backgroundColor = '#1c9be9';
        button.style.color = '#FFF';
        button.style.cursor = 'pointer';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.fontSize = '16px';
        button.className = "amogus"; // empty classname that wont be used by normal pages

    function addFloatingButton(){
    if (document.documentElement.classList.contains('html-photo-page-scrappy-view') || window.location.href.includes("sizes")) {
        if (!document.querySelector('button.amogus')){
            document.body.appendChild(button);
            button.addEventListener('click', downloadLargestFlickrImage);
        }
    } else if (document.querySelector('button.amogus')){document.body.removeChild(button);}
    }

    // in photostream download button
    function addDownloadButton(element) {
    if(element.querySelector('a.engagement-item.download')){return} // skip if it already exists
    const a = document.createElement('a');
    a.className = 'engagement-item download';
    a.title = "Download this photo";
    const i = document.createElement('i');
    i.className = 'ui-icon-download'; // use the page built in icon
    a.appendChild(i);

    a.addEventListener('click', function() {
        downloadLargestFlickrImage(element);
    });

    element.appendChild(a);
    }

    // Callback function to execute when mutations are observed
    const observerCallback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.engagement')) {
                        addDownloadButton(node);
                    }
                    // check descendants
                    const overlayElements = node.querySelectorAll && node.querySelectorAll('div.engagement');
                    if (overlayElements) {overlayElements.forEach(addDownloadButton);}
                }
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                addFloatingButton()
            }
        }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(observerCallback);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    // maybe some already exist on load
    document.querySelectorAll('div.engagement').forEach(addDownloadButton);

})();