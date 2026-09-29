import json
from decimal import Decimal, ROUND_HALF_UP

from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import ContactMessage, MenuItem, Order


def home(request):
    return render(request, "home.html")


def menu(request):
    return render(request, "menu.html")


def about(request):
    return render(request, "about.html")


def contact(request):
    return render(request, "contact.html")


@require_GET
def menu_items_api(request):
    try:
        limit = int(request.GET.get("limit", 100))
    except (TypeError, ValueError):
        limit = 100
    limit = max(1, min(limit, 200))
    items = MenuItem.objects.all()[:limit]
    return JsonResponse({"data": [item.to_api_dict(request) for item in items]})


@csrf_exempt
@require_http_methods(["POST"])
def orders_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    lines = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(lines, list) or not lines or len(lines) > 50:
        return JsonResponse({"error": "items must contain between 1 and 50 menu items"}, status=400)

    quantities = {}
    for line in lines:
        if not isinstance(line, dict):
            return JsonResponse({"error": "Each item must include an id and quantity"}, status=400)
        item_id = str(line.get("id") or "").strip()
        quantity = line.get("qty")
        if not item_id or isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1:
            return JsonResponse({"error": "Each item must include a valid id and positive quantity"}, status=400)
        quantities[item_id] = quantities.get(item_id, 0) + quantity
        if quantities[item_id] > 99:
            return JsonResponse({"error": "Quantity cannot exceed 99 per item"}, status=400)

    menu_items = MenuItem.objects.in_bulk(quantities, field_name="public_id")
    if len(menu_items) != len(quantities):
        return JsonResponse({"error": "One or more menu items are unavailable"}, status=400)

    order_items = []
    subtotal = Decimal("0.00")
    for item_id, quantity in quantities.items():
        menu_item = menu_items[item_id]
        line_total = menu_item.price * quantity
        subtotal += line_total
        order_items.append({
            "id": menu_item.public_id,
            "name": menu_item.name,
            "quantity": quantity,
            "unit_price": str(menu_item.price),
            "line_total": str(line_total),
        })

    tax = (subtotal * Decimal("0.0825")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    order = Order.objects.create(
        items=order_items,
        subtotal=subtotal,
        tax=tax,
        total=subtotal + tax,
    )
    return JsonResponse({"id": order.pk, "status": order.status}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def contact_messages_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip()
    topic = str(payload.get("topic") or ContactMessage.Topic.GENERAL)
    message = str(payload.get("message") or "").strip()[:800]

    if not name or not email or not message:
        return JsonResponse({"error": "name, email and message are required"}, status=400)

    valid_topics = {choice[0] for choice in ContactMessage.Topic.choices}
    if topic not in valid_topics:
        topic = ContactMessage.Topic.GENERAL

    submitted = parse_datetime(str(payload.get("submitted_at") or ""))
    if submitted is None:
        submitted = timezone.now()
    elif timezone.is_naive(submitted):
        submitted = timezone.make_aware(submitted, timezone.get_current_timezone())

    record = ContactMessage.objects.create(
        name=name,
        email=email,
        topic=topic,
        message=message,
        submitted_at=submitted,
    )
    return JsonResponse({"id": str(record.id)})
