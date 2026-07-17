-- =====================================================================
-- CineBook Seed Data - Telugu & Popular Movies 2024-2025
-- Inserted AFTER JPA creates the schema (ddl-auto=create-drop)
-- =====================================================================

-- Admin user (password: admin123)
INSERT IGNORE INTO users (email, password_hash, full_name, role) VALUES
('admin@cinebook.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL9Tz1C6', 'CineBook Admin', 'ADMIN');

-- Theatres
INSERT IGNORE INTO theatres (name, location, screens) VALUES
('PVR Cinemas', 'Hyderabad, Banjara Hills', 8),
('INOX Multiplex', 'Hyderabad, Gachibowli', 6),
('Prasads IMAX', 'Hyderabad, NTR Gardens', 5),
('Cinepolis', 'Vijayawada, Governorpet', 4),
('AMB Cinemas', 'Hyderabad, Narsingi', 10),
('Sudarshan 35MM', 'Hyderabad, RTC X Roads', 3);

-- Movies (Recent Telugu releases 2024-2025 + Popular films)
INSERT IGNORE INTO movies (title, genre, language, duration, rating, poster_url, banner_url, trailer_url, synopsis, is_trending) VALUES

-- Kalki 2898-AD
('Kalki 2898-AD', 'Sci-Fi/Action', 'Telugu', 181, 8.3,
'https://image.tmdb.org/t/p/w500/1E5baAaEse26fej7uHcjOgEE2t2.jpg',
'https://image.tmdb.org/t/p/original/kCD5GCpQQWEeAMEtoSmFUaqmXNl.jpg',
'https://www.youtube.com/embed/of_kRkVEhUU',
'Set in the year 2898 AD, Kalki 2898-AD is a dystopian sci-fi epic that blends Hindu mythology with futuristic world-building. The story follows Bhairava, a bounty hunter, who becomes entangled in a battle for the fate of humanity.', true),

-- Pushpa 2: The Rule
('Pushpa 2: The Rule', 'Action/Drama', 'Telugu', 190, 8.5,
'https://image.tmdb.org/t/p/w500/rxnAN8oVuVuMCBWpz4JZBJocwLD.jpg',
'https://image.tmdb.org/t/p/original/qAZT52YATPYX1CRnkXKSq0r5ygD.jpg',
'https://www.youtube.com/embed/eKnZl9jRl1Y',
'Pushpa Raj continues his rise in the red sandalwood smuggling empire, facing an even more dangerous adversary. The sequel escalates the conflicts as Pushpa cements his dominance while fighting both the law and rival factions.', true),

-- Devara: Part 1
('Devara: Part 1', 'Action/Thriller', 'Telugu', 166, 7.2,
'https://image.tmdb.org/t/p/w500/jfWyiCOyKFmhkGE5KyY2Qf5A4nQ.jpg',
'https://image.tmdb.org/t/p/original/4GxBBBmTFjpJH5Pxv5YxVjSHtpS.jpg',
'https://www.youtube.com/embed/JNaOfNeHzWA',
'A fearless man who once ruled the seas must reclaim his empire in this high-octane action thriller. The story alternates between two timelines, exploring legacy, power, and redemption.', true),

-- Game Changer
('Game Changer', 'Political Action', 'Telugu', 172, 6.8,
'https://image.tmdb.org/t/p/w500/6p5jIBqr1kNNlQKLgP0VR4VQhU4.jpg',
'https://image.tmdb.org/t/p/original/8CzBPz0ZQ3JQ1OJ3WIKEMmEWqaH.jpg',
'https://www.youtube.com/embed/HkxKh2Bm6Gc',
'Ram Nandan, an upright IAS officer, takes on corrupt politicians in a system that is rotten to its core. A high-voltage political drama packed with action, emotion, and stunning visuals.', true),

-- Sankranthiki Vasthunam
('Sankranthiki Vasthunam', 'Action/Comedy', 'Telugu', 155, 8.1,
'https://image.tmdb.org/t/p/w500/6wdFqNKgBh8mwLpuZzOuRuR7FnY.jpg',
'https://image.tmdb.org/t/p/original/mQdQTGCAXBmXOyxaFCDy7bfLlD9.jpg',
'https://www.youtube.com/embed/WGj9h7W3yHM',
'A fun-filled Sankranti entertainer packed with action, comedy, and family drama. Venkatesh returns in a power-packed avatar in this joyful festive blockbuster that became a massive hit.', true),

-- Guntur Kaaram
('Guntur Kaaram', 'Family Drama', 'Telugu', 151, 7.0,
'https://image.tmdb.org/t/p/w500/2Aa5jABQdPYjaSNUE8Qkw4r0Jap.jpg',
'https://image.tmdb.org/t/p/original/gQ1mkKbmtTJxRlcbU4CkC2VdAaP.jpg',
'https://www.youtube.com/embed/PwRfUdHbkbw',
'A heartwarming family drama that explores the complex relationship between a mother and son. Set against the backdrop of Guntur, this emotional journey is filled with nostalgia, love, and reconciliation.', false),

-- HanuMan
('HanuMan', 'Superhero/Action', 'Telugu', 157, 8.6,
'https://image.tmdb.org/t/p/w500/n2yJB7mYpGT8B9L1VrqO5MxKH5J.jpg',
'https://image.tmdb.org/t/p/original/yLdA3Qz5aMMaSGptbxnzFi8vZeq.jpg',
'https://www.youtube.com/embed/q0P3TSoVmAc',
'A common man from a small village receives the powers of Lord Hanuman and uses them to protect his people. A revolutionary Telugu superhero film that redefined the genre with its unique blend of mythology and modern storytelling.', true),

-- Tillu Square
('Tillu Square', 'Comedy/Action', 'Telugu', 133, 7.8,
'https://image.tmdb.org/t/p/w500/fHRAl4YuiYSEJYYA7PfP2GdRWqM.jpg',
'https://image.tmdb.org/t/p/original/4RtmBQBGkCZqM6vLTxpqVQQKN8F.jpg',
'https://www.youtube.com/embed/rD5z2j5x3rI',
'Tillu is back with double the madness! The sequel follows the lovable rogue in an even wilder adventure filled with unexpected twists, hilarious comedy, and non-stop entertainment.', false),

-- Saaho (Classic)
('Baahubali 2: The Conclusion', 'Epic/Action', 'Telugu', 167, 8.2,
'https://image.tmdb.org/t/p/w500/4J5sJUfJqPCCLFPuLWCHfJyEpJc.jpg',
'https://image.tmdb.org/t/p/original/7TGFJbzDtglKVDHOXBWMQ4CnFTZ.jpg',
'https://www.youtube.com/embed/478SNFNZ7Qs',
'The conclusion to the epic saga reveals why Kattappa killed Baahubali. An emotional roller coaster that brings the magnificent Mahishmati empire story to an unforgettable climax.', false),

-- Salaar
('Salaar: Part 1 - Ceasefire', 'Action/Crime', 'Telugu', 172, 7.1,
'https://image.tmdb.org/t/p/w500/p2MzCiLQHRY2pBIk7oFqB4FBXzp.jpg',
'https://image.tmdb.org/t/p/original/dJhWPKqhWaVl2Qjl5AcEsNY3SgD.jpg',
'https://www.youtube.com/embed/jE7HcB8GCJQ',
'Two childhood friends reunite in a violent underworld filled with power struggles and betrayal. Salaar is a gritty, intense action thriller that showcases Prabhas in a menacing new avatar.', false),

-- Dasara
('Dasara', 'Action/Drama', 'Telugu', 176, 7.4,
'https://image.tmdb.org/t/p/w500/2TbxWqMmJuVtnzKGWvjIJ8iLJfH.jpg',
'https://image.tmdb.org/t/p/original/mXLOHHc1Zeuwsl4xYKjKh2280oL.jpg',
'https://www.youtube.com/embed/K4Tlxua4qdc',
'Set in the coal mines of Singareni, this raw and gritty film follows the tumultuous journey of Dharani, a young man whose life is intertwined with crime, betrayal, and love.', false),

-- Bhimaa
('Bhimaa', 'Action', 'Telugu', 148, 6.5,
'https://image.tmdb.org/t/p/w500/nIu8NFwH2FHDfuNFgGXpgbQzHqM.jpg',
'https://image.tmdb.org/t/p/original/tPKqVVFrElDlK7J8FAlMaolbmLM.jpg',
'https://www.youtube.com/embed/3FfUn7yyXyQ',
'Gopichand returns in a mass entertainer as a fierce protector who takes on powerful enemies to save the innocent. A high-energy actioner packed with punch dialogues and thrilling sequences.', false),

-- Aa Okkati Adakku
('Aa Okkati Adakku', 'Comedy/Drama', 'Telugu', 134, 7.5,
'https://m.media-amazon.com/images/M/MV5BYjU5MTJiNjQtZGJiMy00ZjFkLWJmYWUtNGIzYmFhMzQ0Y2RiXkEyXkFqcGdeQXVyMTUzNTgzNzM0._V1_.jpg',
'https://m.media-amazon.com/images/M/MV5BNGJkMWJlNGMtZGE3Mi00NTc3LTk4NWYtMDQwZGJlYTJhODdjXkEyXkFqcGdeQXVyMTUzNTgzNzM0._V1_.jpg',
'https://www.youtube.com/embed/7nMwJQ6TZWU',
'A fun romantic comedy that follows a simple man chasing his dreams while navigating hilarious situations. This light-hearted entertainer became one of the biggest hits of 2024.', false);

-- Showtimes for the next 7 days (sample - for movie_id 1 to 5)
INSERT IGNORE INTO showtimes (movie_id, theatre_id, screen_name, show_date, show_time, price_platinum, price_gold, price_silver, rows_count, cols_count) VALUES
-- Kalki 2898-AD (movie 1)
(1, 1, 'Screen 1 - IMAX', CURDATE(), '10:00:00', 450, 350, 250, 12, 14),
(1, 1, 'Screen 1 - IMAX', CURDATE(), '14:30:00', 450, 350, 250, 12, 14),
(1, 1, 'Screen 1 - IMAX', CURDATE(), '19:00:00', 500, 400, 300, 12, 14),
(1, 2, 'Screen 2 - 4DX', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00:00', 400, 300, 200, 10, 12),
(1, 2, 'Screen 2 - 4DX', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '18:30:00', 400, 300, 200, 10, 12),
(1, 3, 'Screen 3 - Premium', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '15:00:00', 350, 250, 150, 10, 12),

-- Pushpa 2: The Rule (movie 2)
(2, 1, 'Screen 2 - Dolby', CURDATE(), '09:30:00', 400, 300, 200, 12, 14),
(2, 1, 'Screen 2 - Dolby', CURDATE(), '17:00:00', 400, 300, 200, 12, 14),
(2, 2, 'Screen 1 - Premium', CURDATE(), '12:00:00', 380, 280, 180, 10, 12),
(2, 3, 'Screen 1 - IMAX', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 500, 400, 300, 12, 14),
(2, 4, 'Screen 1', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:00:00', 300, 200, 100, 10, 12),

-- Devara (movie 3)
(3, 1, 'Screen 3 - Standard', CURDATE(), '11:30:00', 350, 250, 150, 10, 12),
(3, 2, 'Screen 3', CURDATE(), '20:00:00', 320, 220, 120, 10, 12),
(3, 5, 'Screen 1 - Luxe', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', 450, 350, 250, 12, 14),

-- Sankranthiki Vasthunam (movie 5)
(5, 1, 'Screen 4', CURDATE(), '12:30:00', 300, 200, 100, 10, 12),
(5, 3, 'Screen 2', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', 280, 180, 80, 10, 12),

-- HanuMan (movie 7)
(7, 2, 'Screen 4', CURDATE(), '16:30:00', 320, 220, 120, 10, 12),
(7, 4, 'Screen 2', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00:00', 300, 200, 100, 10, 12),
(7, 5, 'Screen 2', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '18:00:00', 350, 250, 150, 10, 12);
