from django.conf.urls import patterns, include, url
from django.contrib import admin
from mmsn import settings
admin.autodiscover()

urlpatterns = patterns(
    '',
    url(r'^$', 'shiptrak.views.map', name='shiptrak'),
    url(r'^positions/', 'shiptrak.views.positions', name='positions'),
    url(r'^faq/', 'shiptrak.views.faq', name='faq'),
    url(r'^grappelli/', include('grappelli.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT})
)
