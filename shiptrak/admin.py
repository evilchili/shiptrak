from django.contrib import admin
from .models import Position


class PositionAdmin(admin.ModelAdmin):
    list_display = (
        'callsign',
        'timestamp',
        'source',
        'latitude',
        'longitude',
        'comment'
    )
    list_filter = (
        'callsign',
        'source'
    )

admin.site.register(Position, PositionAdmin)
