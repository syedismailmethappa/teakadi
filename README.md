# Kōcha & Co. — Django tea house

Full-stack version of the Kōcha & Co. tea house site: the original glassmorphism
storefront plus a Django admin dashboard where staff can manage the menu, upload
photos, and read contact enquiries.

## Run locally

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_menu
python manage.py runserver
```

- Storefront: http://127.0.0.1:8000/
- Staff dashboard: http://127.0.0.1:8000/admin/
- Demo login: `admin` / `admin123`

## What staff can do

1. Open **Menu items** in the dashboard.
2. Edit any drink or pastry.
3. Upload a photo in the **Images** section (this is what guests see on the menu).
4. Leave the remote URL as a fallback if you have not uploaded a file yet.
5. Toggle **Featured** to control the six homepage cards.
6. Open **Contact messages** to read notes sent from the Visit page.

Uploaded files are stored under `media/menu/`.

## Pages

| Page | URL |
| --- | --- |
| Home | `/` |
| Full menu | `/menu/` |
| Our Craft | `/about/` |
| Visit / Contact | `/contact/` |
| Admin | `/admin/` |

The menu and contact form talk to Django JSON endpoints (`/tables/menu_items` and
`/tables/contact_messages`) so the original search, filters, tray, and form still work.
