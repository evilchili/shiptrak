from django.conf import settings
from django.shortcuts import render_to_response
from django.http import HttpResponse
from datetime import datetime, timedelta
import requests
import ujson
import os
import re
import time
from shiptrak.cache import CallsignCache
from shiptrak.models import Position
import logging

logger = logging.getLogger('default')

cache = CallsignCache()


def faq(request, template='faq.html'):
    """
    Display the FAQ page
    """
    return render_to_response(template, {'GOOGLE_ANALYTICS_ID': settings.GOOGLE_ANALYTICS_ID})


def map(request, template='map.html'):
    """
    Display the google maps UI
    """
    context = {
        'GOOGLE_MAPS_API_KEY': settings.GOOGLE_MAPS_API_KEY,
        'GOOGLE_ANALYTICS_ID': settings.GOOGLE_ANALYTICS_ID,
        'STATIC_URL': settings.STATIC_URL
    }
    return render_to_response(template, context)


def positions(request):
    """
    Handle AJAX requests for position data.
    """
    if not request.is_ajax:
        return HttpResponse()

    callsign = request.GET.get('callsign', None)
    days_ago = int(request.GET.get('filter', 0))

    if not callsign:
        return HttpResponse()

    # generic no-data message
    error = "No positions reported for %s in the last %s days." % (callsign, days_ago)

    # load the db cache
    c_data = cache.read_from_db(callsign)
    #logger.debug("CACHED: %s" % c_data)

    # get updated data from winlink
    w_data = _winlink_positions(callsign) or {}
    #logger.debug("WINLINK: %s" % w_data)

    # merge the datasets by building a dict with keys by timestamp (minute precision).
    # We start with the oldest cached data first, then yotreps, then winlink, as the
    # latter is judged to be most reliable.
    pos = {}
    for dataset in [c_data, w_data]:
        for p in dataset['positions']:
            dt = datetime.fromtimestamp(float(p['date']) / 1e3).strftime('%Y-%m-%d %H:%M')
            pos[dt] = p

    # prepare a json-encoded response with the merged data sorted by date.
    # WAT: We wipe out any previously-set error here, but we probably don't care.
    pos = {
        'error': None if pos.values() else error,
        'positions': sorted(pos.values(), key=lambda x: x['date'])
    }

    # update the cache
    cache.write_db(callsign, pos)

    # now filter the results by date, if necessary
    if days_ago:
        cutoff = datetime.now() - timedelta(days=days_ago)
        pos['positions'] = [
            x for x in pos['positions'] if datetime.fromtimestamp(x['date'] / 1e3) >= cutoff
        ]

    # ship it
    return HttpResponse(ujson.dumps(pos), content_type="application/json")


def _dms2dd(d, m, s, dir):
    """
    convert lat/lon degrees/minutes/seconds into decimal degrees
    """
    degrees = float(d) + (float(m) / 60) + (float(s) / 3600)
    if dir in ['S', 'W']:
        degrees = degrees * -1
    return degrees


def _winlink_positions(callsign):
    """
    Retrieve positions from winlink
    """

    error = "Unable to retrieve data from WinLink. Please try again."
    pos = []
    attempts = 10
    while attempts:
        attempts = attempts - 1
        try:
            res = requests.post(
                "%s/position/reports/get" % settings.WINLINK_API_URL,
                data={'Callsign': callsign, 'Key': os.environ['WINLINK_API_KEY'] },
                timeout=5,
                headers={'Accept': 'application/json'}
            )
            logger.debug(res.text)
        except requests.exceptions.Timeout:
            pass
        if res.status_code == 200:
            data = ujson.loads(res.content)
            # {u'ErrorCode': 0, u'PositionReports': [
            #   {u'Comment':    u'Jubilant @ Ko Rok Nok Island, Thailand',
            #    u'Yotreps':    True,
            #    u'ReportedBy':    u'KB7SM',
            #    u'Timestamp':    u'/Date(1379071860000)/',
            #    u'Longitude':    99.0688333333333,
            #    u'Callsign':    u'KB7SM',
            #    u'Aprs':    False,
            #    u'Latitude':    7.21216666666667,
            #    u'Speed':    u'',
            #    u'Heading':    u'',
            #    u'Marine': False},
            # ]}
            #
            source = [x[0] for x in Position.SOURCES if x[1] == 'WinLink'][0]
            for p in data['PositionReports']:
                pos.append({
                    'lat': p['Latitude'],
                    'lon': p['Longitude'],
                    'comment': p['Comment'],
                    'date': int(p['Timestamp'][6:-2]),
                    'source': source
                })
            error = None
            break
    return {'error': error, 'positions': pos}
