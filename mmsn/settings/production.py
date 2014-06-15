import os
import dj_database_url
<<<<<<< HEAD
from django.utils.crypto import get_random_string

chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)'
SECRET_KEY = get_random_string(50, chars)
=======
>>>>>>> 70de3170e941fb258fda1e5d971ca5e5018e0334

ALLOWED_HOSTS = ['*']

# Static asset configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATABASES = {
    'default':  dj_database_url.config()
}

DEBUG = False

GOOGLE_MAPS_API_KEY = 'AIzaSyDHRIu1CdX0O95_bTdyyiom4Z84uzKG0bw'
