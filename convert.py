import os
import re
import time
from shiptrak.cache import CallsignCache
from shiptrak.models import Position
from mmsn import settings


cache = CallsignCache()


def import_cache():
    """
    Import the json cache into the database.
    """
    for root, dirs, files in os.walk(settings.CACHE_DIR):
        for f in files:
            callsign = f[:-5]
            positions = cache._to_position(callsign)
            print "importing %d positions for %s" % (len(positions), callsign)
            Position.objects.bulk_create(positions)


def convert():
    """
    convert the old XML cache to JSON.
    """
    old_path = 'old/data'

    # <marker lat="-15.25" lng="41.1" src="WINLINK" date="2005-06-30 10:00:00" coords="015d 15.00 S / 041d 06.00 E" comment="M/V CORVIGLIA (bc), ETA Jeddah 09/July."/>
    attr_pat = re.compile('lat="(.+?)" lng="(.+?)".+?date="(.+?)".+comment="(.*)"')

    for root, dirs, files in os.walk(old_path):
        for f in files:
            if f[-4:] != '.xml':
                continue
            data = []
            with open(os.path.join(old_path, f), 'rb') as xml:
                for l in xml:
                    m = attr_pat.search(l)
                    if not m:
                        continue
                    [lat, lon, date, comment] = m.groups()
                    ts = int(time.mktime(time.strptime(date, "%Y-%m-%d %H:%M:%S"))) * 1000
                    data.append({
                        'lat': float(lat),
                        'lon': float(lon),
                        'comment': comment.decode('ascii', 'ignore'),
                        'date': ts,
                    })
            print "Writing cache for %s" % f[:-4]
            cache.write(f[:-4], {'positions': data})
            positions = cache._to_position(f[:-4])
            Position.objects.bulk_create(positions)


if __name__ == '__main__':
    import_cache()
