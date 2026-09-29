from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("menu/", views.menu, name="menu"),
    path("about/", views.about, name="about"),
    path("contact/", views.contact, name="contact"),
    path("tables/menu_items", views.menu_items_api, name="menu_items_api"),
    path("tables/contact_messages", views.contact_messages_api, name="contact_messages_api"),
    path("tables/orders", views.orders_api, name="orders_api"),
]
