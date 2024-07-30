// ==UserScript==
// @name         flickr photostream dl js part
// @version      1.0.0
// @description  download all ids on a flickr photostream page to a json
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
        const element = doc.querySelector('div#allsizes-photo img');
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
//        for (let i = 0; i < smallElements.length; i++) {
//            const text = smallElements[i].textContent;
//            const match = text.match(/\((\d+) × (\d+)\)/);
//            if (match) {
//                const [width, height] = [parseInt(match[1]), parseInt(match[2])];
//                const resolution = width * height;
//                if (resolution > maxResolution) {
//                    maxResolution = resolution;
//                    largesti = i;
//                }
 //           }
 //       }
        if (smallElements[0].textContent == "(75 × 75)") {
            largesti = smallElements.length - 1;
        } else {
            largesti = 0;
        }
        const parent = smallElements[largesti].parentElement;
        if (parent && parent.tagName.toLowerCase() === 'a') {
            maxHref = parent.href;
        } else if (parent) {
            const link = parent.querySelector('a');
            maxHref = link ? link.href : null;
        }
        if (smallElements[largesti].textContent == "(All sizes of this photo are available for download under a Creative Commons license)") {
            return maxHref
        }
        if (maxHref) { // If it's not null, fetch the HTML for the larger image
            html = await fetchHtml(maxHref);
            return findImageUrl(html);
        }
        return findImageUrl(html);
    }

    // Function to download image
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

    // Main function to execute the script
    async function downloadLargestFlickrImage() {
//        const userId = window.location.pathname.split('/')[2];
//        const imageId = window.location.pathname.split('/')[3];
//        const sizesPageUrl = `https://www.flickr.com/photos/${userId}/${imageId}/sizes/`;
        let pageUrl = window.location.href
        if (!pageUrl.includes("sizes")) {
           // if(pageUrl.endsWith("/")) {
                pageUrl += pageUrl.endsWith("/") ? "sizes/" : "/sizes/"
         //   } else{
            //    pageUrl += "/sizes/"
            //}
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

    // Add a button to trigger the download
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
    document.body.appendChild(button);
    button.addEventListener('click', downloadLargestFlickrImage);

function addDownloadButton(element) {
        // Create the download button
        const button = document.createElement('button');
        button.textContent = 'Download';
        button.style.position = 'absolute'; // Positioning the button
        button.style.top = '10px'; // Adjust as needed
        button.style.right = '-10px'; // Adjust as needed
        button.style.zIndex = '1000'; // Ensure the button is on top of the image

        // Attach the download function to the button
        button.addEventListener('click', function() {
            downloadLargestFlickrImage(element);
        });

        // Append the button to the overlay element
        element.style.position = 'relative'; // Ensure the container is positioned relative for the button to be absolute
        element.appendChild(button);
    }

    // Callback function to execute when mutations are observed
    const observerCallback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('a.overlay')) {
                        addDownloadButton(node);
                    }
                    // If the new node doesn't match, we should also check its descendants
                    const overlayElements = node.querySelectorAll && node.querySelectorAll('a.overlay');
                    overlayElements.forEach(addDownloadButton);
                }
            }
        }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(observerCallback);

    // Start observing the document for added nodes
    observer.observe(document.body, { childList: true, subtree: true });

    // Initially add the button to any existing <a> elements with class 'overlay'
    document.querySelectorAll('a.overlay').forEach(addDownloadButton);

})();