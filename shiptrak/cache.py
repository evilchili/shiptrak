from django.conf import settings
from shiptrak.models import Position
from datetime import datetime
import os
import logging

logger = logging.getLogger('default')


class CallsignCache():

    data_dir = settings.CACHE_DIR

    def _file_for_callsign(self, callsign):
        """
        Return the path to the cache file for a given callsign.
        """
        return os.path.join(self.data_dir, callsign.lower() + '.json')

    def read(self, callsign, days_ago=0):
        """
        Read a cache file and return its contents
        """
        data = {'positions': []}
        positions = Position.objects.filter(callsign__iexact=callsign)
        if not positions:
            return data

        for p in positions:
            ts = p.timestamp.strftime('%s')
            data['positions'].append({
                'lat': p.latitude,
                'lon': p.longitude,
                'date': int(ts) * 1e3,
                'comment': p.comment
            })
        return data

    def write(self, callsign, data):
        """
        (Re)Write the callsign's cached data.
        """
        positions = {}
        for p in data['positions']:
            ts = datetime.fromtimestamp(int(p['date']) / 1e3)
            positions[ts] = Position(
                callsign=callsign.lower(),
                timestamp=ts,
                latitude=p['lat'],
                longitude=p['lon'],
                comment=p['comment'],
                source=p['source'] if 'source' in p else 0,
            )
        if not positions:
            return {'positions': []}

        Position.objects.filter(callsign__iexact=callsign).delete()
        Position.objects.bulk_create(positions.values())

    def _to_position(self, callsign):
        data = self.read(callsign)
        positions = []
        for p in data['positions']:
            positions.append(Position(
                callsign=callsign.lower(),
                latitude=p['lat'],
                longitude=p['lon'],
                timestamp=datetime.fromtimestamp(p['date'] / 1e3),
                comment=p['comment']
            ))
        return positions
