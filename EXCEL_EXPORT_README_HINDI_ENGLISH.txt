RailSNTGyan - Download Current Master Database (Excel)
=====================================================

1. Upload index.html (replace the old root index.html), images/ and the blank Excel template to GitHub Pages.
2. Open the PUBLISHED HTTPS website (not content://downloads or file://).
3. Login as Admin -> Profile -> ADD IN DATABASE.
4. Scroll to Saved Master Entries and tap Download Current Database (Excel).
5. The site reads CURRENT data from Firebase Firestore collection rail_master_data on the SERVER.
6. An Excel workbook downloads to your device containing Instructions and 13 master sheets:
   Stations, Divisions, Agencies, EI OEMs, MSDAC OEMs, Departments, Sanction Given By,
   Inspection By, Equipment, Issued By, File Types, Received From, Movement Status.
7. Master ID is included for updating the SAME Firestore document. The 13 sheets are compatible with Smart Excel Bulk Upload.
8. Empty master types have a header-only sheet. Inactive records are included and marked No.
9. Export does NOT modify Firebase. It exports rail_master_data only, not sanction/approval records in secr_records.
10. If an unknown/legacy type exists, a separate Archive (Do Not Import) sheet is added to preserve it.
    Delete that Archive sheet before using this file with the strict-standard Excel Importer.
11. To Update: edit the downloaded Excel, keep Master IDs intact, then Upload and Preview & Check before confirming.
12. The filled export may contain internal data; do NOT upload this filled Excel file to a PUBLIC GitHub repository.
13. A working admin Firebase session with read access and internet connectivity is required.
14. The download uses the existing SheetJS Excel library CDN (same as Bulk Import), so open the online site.

No Firestore data was accessed or changed to prepare this website update.
