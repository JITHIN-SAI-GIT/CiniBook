import mysql.connector

conn = mysql.connector.connect(
    host='127.0.0.1',
    user='root',
    password='carelesscriminal@123',
    database='cinebook'
)
cursor = conn.cursor()

# Set video_resolution to '720p HD' for the two uploaded movies
cursor.execute(
    "UPDATE movies SET video_resolution = %s WHERE id IN (499, 638)",
    ('720p HD',)
)
print("Updated video resolution fields to '720p HD'.")

conn.commit()
conn.close()
