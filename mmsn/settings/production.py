import os
import dj_database_url
from django.utils.crypto import get_random_string

chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)'
SECRET_KEY = get_random_string(50, chars)

ALLOWED_HOSTS = ['*']

# Static asset configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATABASES = {
    'default':  dj_database_url.config()
}

DEBUG = False

GOOGLE_MAPS_API_KEY = 'AIzaSyDHRIu1CdX0O95_bTdyyiom4Z84uzKG0bw'

GOOGLE_ANALYTICS_ID = 'UA-52163451-1'
