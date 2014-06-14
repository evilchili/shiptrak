import socket
(h, domain) = socket.gethostname().split('.', 2)
try:
    exec("from mmsn.wsgi.{0} import *".format(h)) in locals()
except Exception as e:
    print "WARNING: Could not locate wgsi config for host '%s': %s" % (h, e)
    from deploy import *
