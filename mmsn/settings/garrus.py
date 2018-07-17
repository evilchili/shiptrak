import os

ALLOWED_HOSTS = ['*']

DEBUG=True

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Static asset configuration
GOOGLE_MAPS_API_KEY = 'AIzaSyClHPTICWzf0efgMoav_d3MXiKS3G-5gQg'

GOOGLE_ANALYTICS_ID = ''
