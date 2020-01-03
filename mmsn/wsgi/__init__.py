import socket
import os
from django.core.wsgi import get_wsgi_application
from dj_static import Cling

h = socket.gethostname()
try:
    (h, domain) = socket.gethostname().split('.', 2)
    exec(("from mmsn.wsgi.{0} import *".format(h)), locals())
except Exception as e:
    print("WARNING: Could not locate wgsi config for host '%s': %s" % (h, e))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mmsn.settings")
    application = Cling(get_wsgi_application())
