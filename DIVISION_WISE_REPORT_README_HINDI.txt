RailSNTGyan - Division-wise Detailed Report (Add-on)
====================================================

Kya add hua:
- Home / Dashboard par Division-wise Report ka alag button.
- Table view ke toolbar me Division-wise Report ka alag button.
- FY selector (2026-2027 default/current FY) aur All Divisions / Bilaspur / Raipur / Nagpur selector.
- Image jaisa 7-column report: sn, station/section, approval for, work, agency, approved by/forwarded to, Date.
- Report me selected FY ke records ko Division-wise dikhaya jata hai.
- 8-row minimum blank grid per division; zyada records hone par automatic extra rows.
- Excel (.xlsx) download with borders, headings and cell wrapping.
- Print / PDF using browser print (Save as PDF).

Koi purana feature, database collection, login, record input form, FY summary
report, stored data, ya filter setting change nahi ki gayi hai.

Deployment:
- ZIP extract karke existing GitHub Pages repository ki jagah updated
  files upload/replace kijiye.
- Sirf index.html, division-report.js aur division-report.css updated/added hain.
  Ye teen files repository root me saath rehni chahiye.
- Excel export ke liye internet par ExcelJS CDN access chahiye.
- Login ke baad real-time Firebase (secr_records) data se report banti hai.

Data-related note:
- Sirf Bilaspur, Raipur aur Nagpur/NGP division ke saved records liye jate hain.
- FY ka calculation record ke reporting/forwarding date (where available)
  se hota hai, otherwise record date.
- Jis record me approved by / forwarded to field saved nahi hai, uska
  authority column khali rahega. Koi galat approver automatically assume nahi kiya jata.
- HQ records aur jin records me valid Division/Date absent hai, unhe
  galat division me nahi daala jata.
