-- ============================================================
-- Make the imported meter photos render in the app
-- ============================================================
-- The Google Form stored each photo as a Drive VIEWER link:
--
--   https://drive.google.com/open?id=1Psaw_QZlLh34Vaquq6O_iE28bVXDlu36
--
-- That URL serves an HTML page, so the <img> tag in ReviewQueueList.tsx
-- has nothing to render and shows a broken-image icon. The same file is
-- served as an actual image by Google's CDN:
--
--   https://lh3.googleusercontent.com/d/1Psaw_QZlLh34Vaquq6O_iE28bVXDlu36
--
-- Verified: that URL returns the unit 101 water meter photo, 1200x1600,
-- with no authentication.
--
-- This rewrites every Drive link to the CDN form. Safe to re-run — the
-- WHERE clause only matches links still in the old format.
--
-- CAVEAT: this keeps the photos on Google Drive. They render only while
-- the Drive files stay shared, and Google rate-limits hotlinking, so a
-- page showing many at once may see some fail. The durable fix is to copy
-- the files into the existing "meter-photos" Supabase bucket, which is
-- where the app's own capture flow already puts new photos. Ask me for
-- that migration when you want it.

update meter_readings
set photo_url = 'https://lh3.googleusercontent.com/d/' ||
                substring(photo_url from 'id=([A-Za-z0-9_-]+)')
where photo_url like 'https://drive.google.com/open?id=%'
  and substring(photo_url from 'id=([A-Za-z0-9_-]+)') is not null;

-- Verification: expect drive_viewer_links 0, cdn_links ~771, and a sample
-- URL you can paste into a browser tab to confirm it renders.
select 'photo urls' as report,
       count(*) filter (where photo_url like 'https://drive.google.com/open%')     as drive_viewer_links,
       count(*) filter (where photo_url like 'https://lh3.googleusercontent.com/%') as cdn_links,
       count(*) filter (where photo_url is null)                                    as no_photo,
       count(*)                                                                     as total,
       (select photo_url from meter_readings
         where photo_url like 'https://lh3.googleusercontent.com/%' limit 1)        as sample
from meter_readings;
