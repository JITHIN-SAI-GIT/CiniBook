import mysql.connector
try:
    conn = mysql.connector.connect(host='127.0.0.1', port=3306, user='root', password='carelesscriminal@123', database='cinebook')
    cursor = conn.cursor()
    cursor.execute("UPDATE movies SET poster_url='https://m.media-amazon.com/images/M/MV5BMjA4NWEzZmItM2I0NS00YTk5LWJiNDItZmIyNTdhMjg4NmJiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg', banner_url='https://m.media-amazon.com/images/M/MV5BMjA4NWEzZmItM2I0NS00YTk5LWJiNDItZmIyNTdhMjg4NmJiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg' WHERE title LIKE 'Sankranthiki%'")
    conn.commit()
    print('Fixed missing image')
except Exception as e:
    print(e)
