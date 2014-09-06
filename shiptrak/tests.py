from django.test import TestCase
from shiptrak import views


class ShipTrakTestCase(TestCase):

    def test_yotreps(self):
        y_data = views._yotreps_positions('2EOI7')
        assert('positions' in y_data)
        assert(y_data['error'] is None)

    def test_dms2dd(self):
        lat = [38, 53, 55, 'N']
        lon = [77, 2, 16, 'W']
        expected_lat = 38.89861111111111
        expected_lon = -77.03777777777778
        res = views._dms2dd(*lat)
        assert(res == expected_lat)
        res = views._dms2dd(*lon)
        assert(res == expected_lon)
