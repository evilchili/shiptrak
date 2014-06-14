# Allow all host headers
ALLOWED_HOSTS = ['*']

# Static asset configuration
import os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

STATIC_ROOT = 'staticfiles'
STATIC_URL = '/static/'

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'static'),
)

LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'default': {
            'handlers': ['console'],
            'level': 'DEBUG',
        }
    }
}

GOOGLE_MAPS_API_KEY = 'AIzaSyClHPTICWzf0efgMoav_d3MXiKS3G-5gQg'
