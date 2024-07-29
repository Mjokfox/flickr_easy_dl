import os
import json
import requests
from bs4 import BeautifulSoup
import re
import argparse

download_dir = "downloads/"

def load_json(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

def download_html_user(user_id, image_id):
    return download_html(f'https://www.flickr.com/photos/{user_id}/{image_id}/sizes/')


def download_html(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error downloading the HTML page for {url}: {e}")
        return None

def download_image(url):
    filename = url.split('/')[-1]
    if not os.path.exists(os.path.join(download_dir,filename)):
        try:
            print("downloading " + filename)
            response = requests.get(url)
            response.raise_for_status()
            img_data = response.content
            with open(os.path.join(download_dir,filename), 'wb') as handler:
                handler.write(img_data)

        except requests.RequestException as e:
            print(f"Error downloading the HTML page for {url}: {e}")
            return None
    else:
        print("skipped \"" + filename + "\" because it already exists")


def find_image_url(html):
    soup = BeautifulSoup(html, 'html.parser')
    element = soup.find('div', id="allsizes-photo")
    return element.find('img').get('src')

def find_largest_resolution(html):
    soup = BeautifulSoup(html, 'html.parser')
    small_elements = soup.find_all('small')
    max_resolution = 0
    max_href = None

    for small in small_elements:
        text = small.get_text()
        match = re.match(r'\((\d+) × (\d+)\)', text)
        if match:
            width, height = map(int, match.groups())
            resolution = width * height
            if resolution > max_resolution:
                max_resolution = resolution
                parent = small.parent
                if parent and parent.name == 'a':
                    max_href = parent.get('href')
                elif parent:
                    max_href = parent.find('a').get('href') if parent.find('a') else None
                if(max_href): # it will be none if the current page is the max size one
                    html = download_html("https://www.flickr.com" + max_href)
                url = find_image_url(html)
    return url

def process_json(file_path):
    data = load_json(file_path)

    for item in data:
        user_id = item['userId']
        image_id = item['imageId']
        html = download_html_user(user_id, image_id)
        if html:
            largest_resolution_url = find_largest_resolution(html)
            download_image(largest_resolution_url)

def process_url(url):
    # Check if "sizes/" is already in the URL
    if "sizes/" not in url:
        # Append "sizes/" to the URL
        if url.endswith('/'):
            url += 'sizes/'
        else:
            url += '/sizes/'
    return url

def main():
    parser = argparse.ArgumentParser(description='Process a JSON file or a URL with an optional JSON file.')

    parser.add_argument('-u', '--url', type=str, help='The URL to process', default=None)

    parser.add_argument('json_filename', type=str, nargs='?', help='The JSON file to process')

    args = parser.parse_args()

    os.makedirs(download_dir, exist_ok=True)

    if args.json_filename:
        process_json(args.json_filename)
    else:
        if args.url:
            html = download_html(process_url(args.url))
            if html:
                largest_resolution_url = find_largest_resolution(html)
                download_image(largest_resolution_url)
        else:
            parser.error('The following arguments are required: json_filename (or use -u for URL)')

if __name__ == '__main__':
    main()
