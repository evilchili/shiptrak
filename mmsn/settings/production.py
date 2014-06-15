import os
import dj_database_url

ALLOWED_HOSTS = ['*']

# Static asset configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATABASES = {
    'default':  dj_database_url.config()
}

GOOGLE_MAPS_API_KEY = 'AIzaSyDHRIu1CdX0O95_bTdyyiom4Z84uzKG0bw'
