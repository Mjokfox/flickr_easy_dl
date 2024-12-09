// ==UserScript==
// @name         flickr easy download
// @version      1.0.5
// @description  download the highest resolution image on flickr with just one click!
// @author       Mjokfox
// @updateURL    https://gitinthebutt.ofafox.com/Mjokfox/flickr_photostream_dl/raw/branch/main/flickrezdl.user.js
// @license      GPLv3
// @match        https://www.flickr.com/*
// @match        https://flickr.com/*
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
        let largesti = 0;
        let maxHref = null;

        // instead of doing arithmatic, exploit the standard page layout
        if (smallElements[0].textContent == "(75 × 75)") {
            largesti = smallElements.length - 1;
        } else if (smallElements[1].parentElement.querySelector(':scope > a').innerHTML == "Original"){
            largesti = 1;
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

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // download the image
    const MAX_RETRIES = 3;
    
    async function downloadImage(url) {
        var tries = 0;
        var waittime = 5000;
        while(tries < MAX_RETRIES){
            await fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    if(blob.size < 100){
                        throw { type: 'Rate_limited', message: `received a ${blob.size} byte file, which probably isnt right` };
                    }
                    const burl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = burl;
                    a.download = url.split('/').pop() || 'download';
                    a.click();
                    URL.revokeObjectURL(burl);
                    tries = MAX_RETRIES;
                })
            .catch((error) => {
                if (error.type === 'Rate_limited') {
                    tries += 1;
                    waittime = 5000 + Math.round(Math.random()*5000);
                    console.log(`Rate limited, waiting ${waittime/1000} seconds before retrying: ${tries}/${MAX_RETRIES}`);
                }
                else{
                    console.error(`Failed to download image for: ${url}: ${error}`)
                }});
            if (tries < MAX_RETRIES){
                await sleep(waittime)
            }
        }
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
                await downloadImage(imageUrl);
            } else {
                console.error('Failed to find the image URL.');
            }
        } else {
            console.error('Failed to download the HTML page.');
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function downloadAll(buttonelement) {
        buttonelement.disabled = true
        const elements = document.querySelectorAll("a.overlay");

        for (const element of elements) {
        downloadLargestFlickrImage(element)
        await delay(500 + Math.floor(Math.random() * 500));
        }
        buttonelement.disabled = false
    }

    // Add a global floating button so it can be added and removed without querying
    function makeButton(text, clickHandler) {
        const button = document.createElement('button');
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.height = "32px";
        button.style.fontFamily = "Proxima Nova, helvetica neue, helvetica, arial, sans-serif";
        button.style.fontWeight = "600";
        button.style.padding = '0px 20px';
        button.style.zIndex = '1000';
        button.style.backgroundColor = '#1c9be9';
        button.style.color = '#FFF';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.fontSize = '16px';
        button.id = "amogus";

        button.innerHTML = text;

        button.addEventListener('click', clickHandler);

        return button;
    }
    const buttonSingle = makeButton('Download Image', downloadLargestFlickrImage);
    buttonSingle.style.cursor = "pointer"
    const buttonAll = makeButton('Download All Images', function() {
        downloadAll(buttonAll);
    });


    function addFloatingButton(){
        if (document.getElementById('amogus')){document.body.removeChild(document.getElementById('amogus'));}
        if (document.documentElement.classList.contains('html-photo-page-scrappy-view') || window.location.href.includes("sizes")) {
                document.body.appendChild(buttonSingle);
        } else if (document.documentElement.classList.contains('html-search-photos-unified-page-view')) {
                document.body.appendChild(buttonAll);
        }
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
        a.style.cursor = "wait"
        a.style.backgroundColor = "#0a0"
        a.style.border = "2px solid white"
        downloadLargestFlickrImage(element).then(() => {
            a.style.cursor = "inherit";
        })
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
    const style = document.createElement('style');
    style.innerHTML = `
        #amogus:disabled {
            cursor: wait !important;
            opacity: 0.6;
        }
    `;
    document.head.appendChild(style);
        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(observerCallback);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        // maybe some already exist on load
        document.querySelectorAll('div.engagement').forEach(addDownloadButton);

})();