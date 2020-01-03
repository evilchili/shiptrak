"""
Django settings for mmsn project.

For more information on this file, see
https://docs.djangoproject.com/en/1.6/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.6/ref/settings/
"""
import socket
import dj_database_url
from django.utils.crypto import get_random_string

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.6/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'd%ehat=&bb5pr+=unsxmpxq(57@1nx+okkyni3n9lk!a#pduq&'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'shiptrak', 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                #"django.core.context_processors.request",
                #"django.contrib.auth.context_processors.auth",
            ],
        },
    },
]


ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = (
    'grappelli',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'shiptrak',
)

MIDDLEWARE = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    #'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'mmsn.urls'

WSGI_APPLICATION = 'mmsn.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.6/ref/settings/#databases

# Internationalization
# https://docs.djangoproject.com/en/1.6/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.6/howto/static-files/
import os

STATIC_ROOT = 'staticfiles'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles/')
STATIC_URL = '/static/'
STATICFILES_DIRS = ()
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'django.contrib.staticfiles.finders.FileSystemFinder',
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


GOOGLE_MAPS_API_KEY = ''

CACHE_DIR = os.path.abspath(os.path.join(BASE_DIR, 'callsign_data'))

WINLINK_API_URL = "http://cms.winlink.org/"

h = socket.gethostname()
try:
    (h, domain) = h.split('.', 2)
    print("from mmsn.settings.{0} import *".format(h))
    exec(("from mmsn.settings.{0} import *".format(h)), locals())
    print("Overriding production configuration with local settings for host {}".format(h))
except Exception as e:
    SECRET_KEY = get_random_string(50, 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)')
    ALLOWED_HOSTS = ['*']
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    DATABASES = {
        'default':  dj_database_url.config()
    }
    DEBUG = False
    GOOGLE_MAPS_API_KEY = 'AIzaSyDHRIu1CdX0O95_bTdyyiom4Z84uzKG0bw'
    GOOGLE_ANALYTICS_ID = 'UA-52163451-1'
