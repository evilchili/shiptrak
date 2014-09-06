from django.test import TestCase
from shiptrak import views


class ShipTrakTestCase(TestCase):

    def test_yotreps(self):
        y_data = views._yotreps_positions('2EOI7')
        assert('positions' in y_data)
        assert(y_data['error'] is None)
