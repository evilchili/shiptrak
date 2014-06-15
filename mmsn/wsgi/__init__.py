import socket
h = socket.gethostname()
try:
    (h, domain) = socket.gethostname().split('.', 2)
    exec("from mmsn.wsgi.{0} import *".format(h)) in locals()
except Exception as e:
    print "WARNING: Could not locate wgsi config for host '%s': %s" % (h, e)
    from production import *
