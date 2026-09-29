import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import MenuItem, Order


class OrderCheckoutTests(TestCase):
	def setUp(self):
		self.menu_item = MenuItem.objects.create(
			public_id="tea-001",
			name="Jasmine Green Tea",
			category=MenuItem.Category.PURE_TEAS,
			description="",
			price=Decimal("4.00"),
		)

	def test_checkout_saves_order_and_displays_it_in_admin(self):
		response = self.client.post(
			reverse("orders_api"),
			data=json.dumps({"items": [{"id": self.menu_item.public_id, "qty": 2}]}),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 201)
		order = Order.objects.get(pk=response.json()["id"])
		self.assertEqual(order.items[0]["name"], self.menu_item.name)
		self.assertEqual(order.items[0]["quantity"], 2)
		self.assertEqual(order.subtotal, Decimal("8.00"))
		self.assertEqual(order.tax, Decimal("0.66"))
		self.assertEqual(order.total, Decimal("8.66"))

		admin_user = get_user_model().objects.create_superuser(
			username="orders-admin", email="admin@example.com", password="safe-test-password"
		)
		self.client.force_login(admin_user)
		admin_response = self.client.get(reverse("admin:catalog_order_changelist"))
		self.assertContains(admin_response, "Jasmine Green Tea")

	def test_checkout_rejects_unknown_menu_item(self):
		response = self.client.post(
			reverse("orders_api"),
			data=json.dumps({"items": [{"id": "missing-item", "qty": 1}]}),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(Order.objects.count(), 0)
