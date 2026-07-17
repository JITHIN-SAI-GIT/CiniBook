import mysql.connector

try:
    conn = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="carelesscriminal@123",
        port=3306
    )
    cursor = conn.cursor()
    cursor.execute("DROP DATABASE IF EXISTS cinebook")
    cursor.execute("CREATE DATABASE cinebook")
    conn.commit()
    print("Database recreated successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'cursor' in locals(): cursor.close()
    if 'conn' in locals() and conn.is_connected(): conn.close()
