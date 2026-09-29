from django.contrib import admin
from django.utils.html import format_html

from .models import ContactMessage, MenuItem, Order


admin.site.site_header = "Kōcha & Co. dashboard"
admin.site.site_title = "Kōcha admin"
admin.site.index_title = "Tea house operations"


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = (
        "thumb",
        "name",
        "category",
        "price",
        "caffeine",
        "rating",
        "featured",
        "badge",
    )
    list_display_links = ("name",)
    list_filter = ("category", "caffeine", "featured")
    search_fields = ("name", "description", "public_id", "badge")
    list_editable = ("featured", "price")
    readonly_fields = ("image_preview",)
    ordering = ("sort_order", "name")
    fieldsets = (
        (None, {"fields": ("public_id", "name", "category", "description", "price")}),
        (
            "Images",
            {
                "description": "Upload a photo for the menu card, or keep a remote URL as a fallback.",
                "fields": ("image", "image_preview", "image_url"),
            },
        ),
        ("Details", {"fields": ("tags", "caffeine", "rating", "badge", "featured", "sort_order")}),
    )

    @admin.display(description="Photo")
    def thumb(self, obj):
        url = obj.display_image_url()
        if not url:
            return "—"
        return format_html(
            '<img src="{}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />',
            url,
        )

    @admin.display(description="Current image")
    def image_preview(self, obj):
        url = obj.display_image_url()
        if not url:
            return "No image yet — upload a file or paste a URL."
        return format_html(
            '<img src="{}" alt="{}" style="max-width:280px;border-radius:12px;" />',
            url,
            obj.name,
        )


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "topic", "submitted_at")
    list_filter = ("topic",)
    search_fields = ("name", "email", "message")
    readonly_fields = ("name", "email", "topic", "message", "submitted_at", "created_at")

    def has_add_permission(self, request):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "item_summary", "created_at", "status", "total")
    list_filter = ("status", "created_at")
    search_fields = ("status",)
    readonly_fields = ("created_at", "item_details", "subtotal", "tax", "total")
    fieldsets = (
        (None, {"fields": ("created_at", "status")}),
        ("Items", {"fields": ("item_details",)}),
        ("Totals", {"fields": ("subtotal", "tax", "total")}),
    )

    @admin.display(description="Items")
    def item_summary(self, obj):
        return ", ".join(f"{line['quantity']} x {line['name']}" for line in obj.items)

    @admin.display(description="Ordered items")
    def item_details(self, obj):
        return format_html_join(
            "",
            "<div>{} x {} at ${}</div>",
            ((line["quantity"], line["name"], line["unit_price"]) for line in obj.items),
        ) or "No items"
