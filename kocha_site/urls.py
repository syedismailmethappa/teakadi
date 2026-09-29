from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("catalog.urls")),
    path("index.html", RedirectView.as_view(pattern_name="home", permanent=False)),
    path("menu.html", RedirectView.as_view(pattern_name="menu", permanent=False)),
    path("about.html", RedirectView.as_view(pattern_name="about", permanent=False)),
    path("contact.html", RedirectView.as_view(pattern_name="contact", permanent=False)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
