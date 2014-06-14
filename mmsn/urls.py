from django.conf.urls import patterns, include, url
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    url(r'^$', 'shiptrak.views.map', name='shiptrak'),
    url(r'^positions/', 'shiptrak.views.positions', name='positions'),
    url(r'^faq/', 'shiptrak.views.faq', name='faq'),
    url(r'^admin/', include(admin.site.urls)),
)
