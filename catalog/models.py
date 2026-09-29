from django.db import models


class MenuItem(models.Model):
    class Category(models.TextChoices):
        SIGNATURE_LATTES = "Signature Lattes", "Signature Lattes"
        MILK_TEAS = "Milk Teas", "Milk Teas"
        PURE_TEAS = "Pure Teas", "Pure Teas"
        ICED_SPARKLING = "Iced & Sparkling", "Iced & Sparkling"
        BAKERY_BITES = "Bakery & Bites", "Bakery & Bites"
        EXTRAS = "Extras", "Extras"

    class Caffeine(models.TextChoices):
        NONE = "None", "None"
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"

    public_id = models.CharField(max_length=32, unique=True, help_text="Stable id used by the storefront, e.g. m-001")
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=40, choices=Category.choices)
    description = models.TextField()
    price = models.DecimalField(max_digits=6, decimal_places=2)
    image = models.ImageField(
        upload_to="menu/",
        blank=True,
        help_text="Upload a photo for this menu item. Overrides the CDN URL when set.",
    )
    image_url = models.URLField(
        blank=True,
        help_text="Optional remote image URL used when no file is uploaded.",
    )
    tags = models.JSONField(default=list, blank=True)
    caffeine = models.CharField(max_length=12, choices=Caffeine.choices, default=Caffeine.MEDIUM)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=4.5)
    badge = models.CharField(max_length=40, blank=True)
    featured = models.BooleanField(default=False, help_text="Show on the homepage grid")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def display_image_url(self, request=None):
        if self.image:
            url = self.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return self.image_url or ""

    def to_api_dict(self, request=None):
        return {
            "id": self.public_id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "price": float(self.price),
            "image_url": self.display_image_url(request),
            "tags": self.tags or [],
            "caffeine": self.caffeine,
            "rating": float(self.rating),
            "badge": self.badge,
            "featured": self.featured,
        }


class ContactMessage(models.Model):
    class Topic(models.TextChoices):
        GENERAL = "General", "General"
        WHOLESALE = "Wholesale", "Wholesale"
        EVENTS = "Events & Workshops", "Events & Workshops"
        FEEDBACK = "Feedback", "Feedback"

    name = models.CharField(max_length=120)
    email = models.EmailField()
    topic = models.CharField(max_length=40, choices=Topic.choices, default=Topic.GENERAL)
    message = models.TextField(max_length=800)
    submitted_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.name} — {self.topic}"


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "New", "New"
        CONFIRMED = "Confirmed", "Confirmed"
        COMPLETED = "Completed", "Completed"
        CANCELLED = "Cancelled", "Cancelled"

    items = models.JSONField()
    subtotal = models.DecimalField(max_digits=8, decimal_places=2)
    tax = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk}"
