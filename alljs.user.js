// ==UserScript==
// @name         flickr photostream dl js part another one
// @version      1.0.1
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
        if (maxHref) { // If it's not null, fetch the HTML for the larger image
            html = await fetchHtml(maxHref);
            return findImageUrl(html);
        return findImageUrl(html);
        }
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
        })
        .catch(() => alert('Failed to download image'));
    }

    // Main function to execute the script
    async function downloadLargestFlickrImage() {
        const userId = window.location.pathname.split('/')[2];
        const imageId = window.location.pathname.split('/')[3];
        const sizesPageUrl = `https://www.flickr.com/photos/${userId}/${imageId}/sizes/`;
        const html = await fetchHtml(sizesPageUrl);
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
    button.innerHTML = 'Download Largest Image';
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '1000';
    button.style.backgroundColor = '#007BFF';
    button.style.color = '#FFF';
    button.style.cursor = 'pointer';
    button.style.padding = '10px 20px';
    button.style.fontSize = '16px';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    document.body.appendChild(button);

    button.addEventListener('click', downloadLargestFlickrImage);
})();