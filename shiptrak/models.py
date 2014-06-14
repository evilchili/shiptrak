from django.db import models


class Position(models.Model):

    SOURCES = (
        (1, 'WinLink'),
        (2, 'YOTREPS'),
    )

    callsign = models.CharField(
        db_index=True,
        blank=False,
        null=False,
        max_length=20
    )
    latitude = models.FloatField('Latitude', blank=False, null=False)
    longitude = models.FloatField('Longitude', blank=False, null=False)
    timestamp = models.DateTimeField('Timestamp', blank=False, null=False, db_index=True)
    comment = models.TextField('Comment')

    source = models.IntegerField('Source', choices=SOURCES, default=1)

    def __unicode__(self):
        return u"%s %s: %.2f %2f %s" % (
            self.callsign,
            self.timestamp,
            self.latitude,
            self.longitude,
            self.comment
        )

    class Meta:
        ordering = ['callsign', '-timestamp']
        #unique_together = ['callsign', 'latitude', 'longitude', 'timestamp']
