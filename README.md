# flickr_photostream_dl
Download whole photostreams or just single images in highest quality available from a flickr url or using the provided userscript.

## For full photostreams:

### Installation

1. Install a [Userscript Manager](https://en.wikipedia.org/wiki/Userscript_manager) of your choice. We recommend [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
    > - [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)<br>
    > - [Tampermonkey for Firefox](https://addons.mozilla.org/en/firefox/addon/tampermonkey/)<br>
    > - [Tampermonkey for Opera](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)<br>
    > - [Tampermonkey for Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)<br>
    > - [Userscripts for Safari (MacOS/iOS/iPadOS)](https://apps.apple.com/us/app/userscripts/id1463298887)<br>

2. Install **flickr photostream dl** by clicking **[this link](https://gitinthebutt.ofafox.com/Mjokfox/flickr_photostream_dl/raw/branch/main/flickr_dl.user.js)**.

3. Download the python script and install the requirements.txt file to your virtual environment if necessary. This can be done by either cloning this git or by downloading manually. Then installing can be done with:
```
$ python -m pip install -r requirements.txt
```
### Usage
1. First on the photostream page you want to download, click the button in the bottom right called "extract IDs", this will download a json file containing every id of the images on the current page. You might need to scroll all the way down and make sure every image has been loaded on the page.
2. Run the python script using with the .json file. In your venv:
```
python flickr_dl.py <name of .json file>
```
3. All images will be downloaded in downloads/ from your current directory, it might take a while.

## For single images:
Simply download the python script and install the requirements.txt file to your virtual environment if necessary. Then copy the url to the page, this should be in the shape: "https://www.flickr.com/photos/[userid]/[imageid]/" /sizes may be appended to it too, the script will accept that. This url should then be used with the python script as followed:
```
python flickr_dl.py -u "url"
```
The quotes might be necessary.
The highest quality available image will be put in downloads/ from your current directory.