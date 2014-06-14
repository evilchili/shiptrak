from django.conf import settings
from django.shortcuts import render_to_response
from django.http import HttpResponse
from datetime import datetime, timedelta
import requests
import ujson
import re
import time
from shiptrak.cache import CallsignCache
from shiptrak.models import Position
import logging

logger = logging.getLogger('default')

cache = CallsignCache()

# KB6OYO   08/04/2003 04:3015 55 N 114 35 W2554.2WNW14 NW 1.20  1014  0
yotreps_pattern = re.compile(
    '^\w+\s*(\d\d/\d\d/\d\d\d\d\s.{5})(\d+)\s*(\d+)\s*(\w)\s*(\d+)\s*(\d+)\s*(\w)')


def faq(request, template='faq.html'):
    """
    Display the FAQ page
    """
    return render_to_response(template, {})


def map(request, template='map.html'):
    """
    Display the google maps UI
    """
    context = {
        'GOOGLE_MAPS_API_KEY': settings.GOOGLE_MAPS_API_KEY,
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

    # get updated data from yotreps
    y_data = _yotreps_positions(callsign) or {}
    #logger.debug("YOTREPS: %s" % y_data)

    # merge the datasets by building a dict with keys by timestamp (minute precision).
    # We start with the oldest cached data first, then yotreps, then winlink, as the
    # latter is judged to be most reliable.
    pos = {}
    for dataset in [c_data, y_data, w_data]:
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
    degrees = int(d) + (int(m) / 60) + (int(s) / 60) / 60
    if dir in ['S', 'W']:
        degrees = degrees * -1
    return degrees


def _yotreps_positions(callsign):
    """
    Retrieve position data from yotreps.
    """
    pos = []
    params = {
        'sl': callsign,
        'fm': '0000-00-00 00:00:00',
        'to': datetime.now().strftime('%Y-%m-%d %T'),
        'au': 999999999
    }
    try:
        res = requests.get(
            settings.YOTREPS_API_URL,
            params=params,
            timeout=5,
        )
    except requests.exceptions.Timeout:
        pass

    if res.status_code != 200:
        error = "Unable to retrieve data from YOTREPS. Please try again."
    else:
        error = None
        # KB6OYO   08/04/2003 04:3015 55 N 114 35 W2554.2WNW14 NW 1.20  1014  0
        data = res.content
        if data.index('No reports found') != -1:
            source = [x[0] for x in Position.SOURCES if x[1] == 'YOTREPS'][0]
            for rec in data.split('\n'):
                m = yotreps_pattern.match(rec)
                if m is None:
                    continue

                [date, latdeg, latmin, latdir, londeg, lonmin, londir] = m.groups()
                date = int(time.mktime(time.strptime(date, "%d/%m/%Y %H:%M")))
                pos.append({
                    'lat': _dms2dd(latdeg, latmin, 0, latdir),
                    'lon': _dms2dd(londeg, lonmin, 0, londir),
                    'comment': 'YOTREPS',
                    'date': date,
                    'source': source,
                })
    return {'error': error, 'positions': pos}


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
                "%s/positionReports/get.json" % settings.WINLINK_API_URL,
                data={'callsign': callsign},
                timeout=5,
            )
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
