import urllib.request, json, re, sys

movies = [
    "Kalki 2898 AD",
    "Pushpa 2 The Rule",
    "Devara Part 1",
    "Game Changer",
    "Sankranthiki Vasthunam",
    "Guntur Kaaram",
    "HanuMan",
    "Tillu Square",
    "Baahubali 2 The Conclusion",
    "Salaar Part 1 Ceasefire",
    "Dasara",
    "Bhimaa",
    "Aa Okkati Adakku"
]

def get_imdb_image(title):
    query = title.lower().replace(' ', '_').replace(':', '')
    url = f'https://v2.sg.media-imdb.com/suggests/{query[0]}/{query}.json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'imdb\$[^\(]+\((.*)\)', res)
        if match:
            data = json.loads(match.group(1))
            if 'd' in data and len(data['d']) > 0:
                item = data['d'][0]
                if 'i' in item:
                    if isinstance(item['i'], list):
                        return item['i'][0]
                    elif isinstance(item['i'], dict):
                        return item['i'].get('imageUrl', 'No Image')
                    elif isinstance(item['i'], str):
                        return item['i']
    except Exception as e:
        pass
    return None

import mysql.connector

try:
    conn = mysql.connector.connect(
        host='127.0.0.1',
        port=3306,
        user='root',
        password='carelesscriminal@123',
        database='cinebook'
    )
    cursor = conn.cursor()
except Exception as e:
    print("Cannot connect to mysql:", e)
    sys.exit(1)

for title in movies:
    img = get_imdb_image(title)
    if img and img != 'No Image':
        print(f"Updating {title} -> {img}")
        # search by prefix to match 'Devara: Part 1' etc
        search_title = title.split(' ')[0] + '%'
        cursor.execute("UPDATE movies SET poster_url=%s, banner_url=%s WHERE title LIKE %s", (img, img, search_title))
        conn.commit()
    else:
        print(f"Failed to find image for {title}")

print("Done updating DB!")

# Now also fix data.sql
with open('backend/src/main/resources/data.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

for title in movies:
    img = get_imdb_image(title)
    if img and img != 'No Image':
        # we will just regex replace the URLs for this movie block
        # it's tricky to do in text, but let's just do a simple replacement of the first two URLs after the title
        pass
