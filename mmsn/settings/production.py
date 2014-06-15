import os

ALLOWED_HOSTS = ['*']

# Static asset configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

# For a heroku-hosted database
#
#import dj_database_url
#DATABASES = {
#    'default':  dj_database_url.config()
#}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

GOOGLE_MAPS_API_KEY = 'AIzaSyDHRIu1CdX0O95_bTdyyiom4Z84uzKG0bw'
