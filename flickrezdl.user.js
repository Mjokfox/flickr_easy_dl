// ==UserScript==
// @name         flickr easy download
// @version      1.0.9
// @description  download the highest resolution image on flickr with just one click!
// @author       Mjokfox
// @updateURL    https://github.com/Mjokfox/flickr_easy_dl/raw/refs/heads/main/flickrezdl.user.js
// @license      GPLv3
// @match        https://www.flickr.com/*
// @match        https://flickr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=flickr.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @inject-into  content
// ==/UserScript==

(function() {
    'use strict';

    let findafox_upload = GM_getValue("findafox_upload", false);

    function toggleFeature() {
        findafox_upload = !findafox_upload;
        GM_setValue("findafox_upload", findafox_upload);

        if (findafox_upload) {
            document.querySelectorAll('div.photo-list-photo-interaction').forEach(el => {add_findafox_dl_button(el.querySelector(".engagement"));});
        } else {
            document.querySelectorAll('a.findafox').forEach(el => {el.remove()});
        }
        alert(findafox_upload ? "Enabled!" : "Disabled!")
    }

    GM_registerMenuCommand((findafox_upload ? "Disable" : "Enable") + " the findafox upload button" , toggleFeature);

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    var canceled = false;
    var loop_canceled = false;
    var url_array = [];
    var selecting = false;
    var running = 0;

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
        } else if (smallElements[1].parentElement.firstElementChild.innerHTML == "Original"){
            largesti = 1;
        } else {
            largesti = 0;
        }

        // find the next page url to the largest image
        const parent = smallElements[largesti].parentElement;
        if (parent) {
            const link = parent.firstElementChild; 
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
    const MAX_RETRIES = 3;
    
    async function downloadImage(url) {
        var tries = 0;
        var waittime = 5000;
        while(tries < MAX_RETRIES){
            await fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    if(canceled) {
                        tries = MAX_RETRIES;
                    }
                    if(blob.size < 512){
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
                await delay(waittime)
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
    async function downloadFromButton(element, blocking=false) {
        let pageUrl = "";
        if (element.type != "click"){pageUrl = element.parentElement.parentElement.querySelector('a').href;}
        else{pageUrl = window.location.href;}
        if (!pageUrl){console.error("url not found"); return}
        blocking ? await downloadLargestImage(pageUrl) : downloadLargestImage(pageUrl);
    };
    
    async function downloadLargestImage(pageUrl){
        running++;
        pageUrl = stripAfterIn(pageUrl);

        // add "sizes" to the url
        if (!pageUrl.includes("sizes")) {
                pageUrl += pageUrl.endsWith("/") ? "sizes/" : "/sizes/"
        }
        const html = await fetchHtml(pageUrl);
        if(!canceled) {
            if (html) {
                const imageUrl = await findLargestResolution(html);
                if(!canceled) {
                    if (imageUrl) {
                        await downloadImage(imageUrl);
                    } else {
                        console.error('Failed to find the image URL.');
                    }
                }
            } else {
                console.error('Failed to download the HTML page.');
            }
        }
        running--;
        if(canceled && running <= 0) {
            canceled = false;
            console.log("All downloads stopped")
        }
    }

    async function downloadAll(buttonelement) {
        buttonelement.disabled = true
        const elements = document.querySelectorAll("a.overlay");
        buttonCancel.style.display = "unset";

        for (const element of elements) {
            if (loop_canceled){loop_canceled=false; break;}
            downloadFromButton(element)
            await delay(500 + Math.floor(Math.random() * 500));
        }
        buttonCancel.style.display = "none";
        buttonelement.disabled = false
    }

    async function uploadFromButton(el) {
        let pageUrl = "";
        if (el.type != "click"){pageUrl = el.parentElement.parentElement.querySelector('a').href;}
        else{pageUrl = window.location.href;}
        if (!pageUrl){console.error("url not found"); return}
        let strippedPageUrl = stripAfterIn(pageUrl);

        // add "sizes" to the url
        if (!strippedPageUrl.includes("sizes")) {
            strippedPageUrl += strippedPageUrl.endsWith("/") ? "sizes/" : "/sizes/"
        }
        const html = await fetchHtml(strippedPageUrl);
        if (html) {
            const imageUrl = await findLargestResolution(html);
            const data = {
                media: imageUrl,
                sourcejs: pageUrl
            };
            const params = new URLSearchParams(data);
            const url = "https://findafox.net/upload?&" + params.toString();
            GM_openInTab(url);
        }
    }

    // Add a global floating button so it can be added and removed without querying
    function makeButton(text, clickHandler,bg_color=null,hidden=false) {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.addEventListener('click', clickHandler);
        if (hidden) button.style.display="none";
        if (bg_color) button.style.backgroundColor = bg_color;
        return button;
    }
    function makeSelectionPanel(buttons) {
        const div = document.createElement('div');
        div.style.display = "flex";
        div.style.flexDirection = 'column';
        div.style.gap = "2px";
        for (const button of buttons){
            div.appendChild(button);
        }
        
        return div;
    }
    const buttonSingle = makeButton('Download Image', downloadFromButton);
    buttonSingle.style.cursor = "pointer"
    const findafoxButton = makeButton("Upload to findafox",uploadFromButton,"#F70");
    const buttonAll = makeButton('Download All Images', function() {downloadAll(buttonAll);},"orchid");
    const buttonSelect = makeButton('Select images', toggleSelect);
    const buttonSelectStop = makeButton('stop selecting', toggleSelect,"red",true);
    const buttonSelectInvert = makeButton('Invert selection', invertSelection);
    const buttonSelectAll = makeButton('Select all', selectAll);
    const buttonSelectNone = makeButton('Select none', selectNone);
    const buttonDownloadSelect = makeButton('Download selection', downloadSelection,"green");
    const selectionPanel = makeSelectionPanel([buttonSelect,buttonSelectStop,buttonSelectInvert,buttonSelectAll,buttonSelectNone,buttonDownloadSelect]);
    const buttonCancel = makeButton('Cancel download!', function() {console.log("canceling downloads!");canceled=true;loop_canceled=true},"red",true);
    
    function toggleSelect() {
        selecting = !selecting;
        if (selecting){
            buttonSelect.style.display = "none";
            buttonSelectStop.style.display = "unset";
            document.querySelectorAll('div.photo-list-photo-interaction').forEach(el => {el.firstElementChild.addEventListener("click",select);});
        } else{
            buttonSelect.style.display = "unset";
            buttonSelectStop.style.display = "none";
            document.querySelectorAll('div.photo-list-photo-interaction').forEach(el => {el.firstElementChild.removeEventListener("click",select);});
        }
    }

    const amogus = document.createElement('div');
    amogus.id = "amogus";
    amogus.style.display = 'flex';
    amogus.style.flexDirection = 'column';
    amogus.style.gap = "2px";
    amogus.style.position = 'fixed';
    amogus.style.bottom = '10px';
    amogus.style.right = '10px';
    document.body.appendChild(amogus)

    let prev = [false, false];
    function addFloatingButton() {
        const isPhotoPage = document.documentElement.classList.contains('html-photo-page-scrappy-view') 
            || window.location.href.includes("sizes");
        const isSearchPage = document.documentElement.classList.contains('html-search-photos-unified-page-view')
            || document.documentElement.classList.contains('html-group-pool-page-view')
            || document.documentElement.classList.contains('html-album-page-view')
            || document.documentElement.classList.contains('html-photostream-page-view');
        
        const cur = [isPhotoPage, isSearchPage];

        // only if theres a change in page
        if (cur[0] !== prev[0] || cur[1] !== prev[1]) {
            if (amogus.lastChild) {
                amogus.innerHTML = "";
            }

            if (isPhotoPage) {
                amogus.appendChild(buttonSingle);
                if (findafox_upload) {
                    amogus.appendChild(findafoxButton);
                }
            } else if (isSearchPage) {
                amogus.appendChild(selectionPanel);
                amogus.appendChild(buttonAll);
                amogus.appendChild(buttonCancel);
            }

            prev = cur;
        }
    }

    // in photostream download button
    function addDownloadButton(element) {
        const el = element.querySelector(".engagement");
        if(el.querySelector('a.engagement-item.download'))return; // skip if it already exists
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
            downloadFromButton(el,true).then(() => {
                a.style.cursor = "inherit";
            })
        });

        el.appendChild(a);

        if (findafox_upload) {
            add_findafox_dl_button(el);
        }
    }

    function add_findafox_dl_button(el) {
        const a = document.createElement('a');
        a.className = 'engagement-item download findafox';
        a.title = "Upload to findafox";
        const img = document.createElement('img');
        img.src = 'https://findafox.net/favicon.ico';
        img.style.width = "16px";
        img.style.height = "16px";
        a.appendChild(img);

        a.addEventListener('click', function() {
            a.style.cursor = "wait";
            a.style.backgroundColor = "#0a0";
            a.style.border = "2px solid white";
            uploadFromButton(el,true).then(() => {
                a.style.cursor = "inherit";
            })
        });

        el.appendChild(a);
    }
    
    function invert_single(el){
        const url = el.href
        const i = url_array.indexOf(url)
        if (i > -1) {
            url_array.splice(i,1);
            el.closest(".photo-list-photo-view").classList.remove("suslected")
        }
        else {
            url_array.push(url);
            el.closest(".photo-list-photo-view").classList.add("suslected")
        }
    }
    var lastClick = null;
    function select(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey && lastClick !== null){
            const div = document.querySelector(".photo-list-view");
            if (div && div.childElementCount > 0){
                const children = Array.from(div.querySelectorAll("DIV.photo-list-photo-view"));
        
                const lastIndex = children.indexOf(lastClick);
                const currentIndex = children.indexOf(e.target.closest(".photo-list-photo-view"));
                
                if (lastIndex !== -1 && currentIndex !== -1) {
                    const start = Math.min(lastIndex+1, currentIndex); // do not iterate over lastIndex
                    const end = Math.max(lastIndex-1, currentIndex);
                    for (let i = start; i <= end;i++) {
                        invert_single(children[i].querySelector("a.overlay"));
                    }
                }
            }
        }
        else invert_single(e.target);
        lastClick = e.target.closest(".photo-list-photo-view");
    }

    function invertSelection(){
        document.querySelectorAll("A.overlay").forEach((el) => {
            invert_single(el);
        })
    }

    function selectAll() {
        url_array = [];
        document.querySelectorAll("A.overlay").forEach((el) => {
            url_array.push(el.href)
            el.closest(".photo-list-photo-view").classList.add("suslected")
        })
    }

    function selectNone() {
        url_array = [];
        document.querySelectorAll(".suslected").forEach((el) => {
            el.classList.remove("suslected");
        });
    }

    async function downloadSelection() {
        buttonCancel.style.display = "unset";
        for (const url of url_array) {
            if (loop_canceled){loop_canceled=false; break;}
            downloadLargestImage(url)
            await delay(500 + Math.floor(Math.random() * 500));
        }
        buttonCancel.style.display = "none";
        selectNone();
    }

    // Callback function to execute when mutations are observed
    const observerCallback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.photo-list-photo-interaction')) {
                        addDownloadButton(node)
                        if (selecting)node.firstElementChild.addEventListener("click",select);
                    }
                }
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                addFloatingButton();
            }
        }
    
    };
    const style = document.createElement('style');
    style.innerHTML = `
        #amogus:disabled {
            cursor: wait !important;
            opacity: 0.6;
        }

        DIV.suslected {
            border:3px solid red;
            box-sizing:border-box;
        }
    `;
    addFloatingButton()
    document.head.appendChild(style);

    const observer = new MutationObserver(observerCallback);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    // maybe some already exist on load
    document.querySelectorAll('div.photo-list-photo-interaction').forEach(el => {addDownloadButton(el);});
})();