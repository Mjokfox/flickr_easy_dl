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

3. Download the python script and the requirements.txt file. This can be done by either cloning this git or by downloading manually. 
When you're on linux, you might want to consider running python in a virtual environment (venv). This is to make sure you do not touch system dependent python packages. Creating and using a venv can be done by:
```
$ python -m venv venv
$ source venv/bin/activate
```
This will create a venv/ folder withing your current directory, which will be hosting your packages for this python installation. By setting the source, we make sure you actually use this venv.
Then installing the requirements can be done with:
```
$ python -m pip install -r requirements.txt
```
### Usage
1. First on the photostream page you want to download, click the button in the bottom right syaing "extract IDs", this will download a json file containing every id of the images on the current page. You might need to scroll all the way down and make sure every image has been loaded on the page.
2. Run the python script using with the .json file. In your venv:
```
$ python flickr_dl.py <name of .json file>
```
3. All images will be downloaded in downloads/ from your current directory, it might take a while.

## For single images:
Simply download the python script and install the requirements.txt file to your virtual environment if necessary. Then copy the url to the page, this should be in the shape: "https://www.flickr.com/photos/[userid]/[imageid]/" "sizes/[a-z]/" may be appended to it too, the script will accept that. This url should then be used with the python script as followed:
```
$ python flickr_dl.py -u "url"
```
The quotes might be necessary.
Then the highest quality available image will be put in downloads/ from your current directory.